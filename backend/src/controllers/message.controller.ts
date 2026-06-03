import { Request, Response } from 'express'
import { z }                 from 'zod'
import mongoose              from 'mongoose'

import Conversation from '../models/Conversation'
import Message      from '../models/Message'
import Offer        from '../models/Offer'
import { Listing }  from '../models/Listing'
import User         from '../models/User'
import { uploadMultiple } from '../utils/cloudinary/uploader.util'
import {
    emitNewMessage,
    emitConversationUpdated,
    emitNewConversation,
    emitMessageUpdated,
    emitOfferUpdated,
} from '../Socket/Socket'
//import { sendNewConversationEmail } from '../utils/mail.utils' // TODO: Sonra eklenecek
import {sendMessageSchema} from "../validators/message.validator";
import {IUser} from "../types/user.types";

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
// POST /api/message
//
// İlk mesaj gönderildiğinde conversation otomatik oluşturulur.
// Conversation would be created after first message.
// Sonraki mesajlarda mevcut conversation güncellenir.
// The conversation would be updated in the following messages.
export const sendMessage = async (req: Request, res: Response): Promise<any> => {
    try {
        // 1. Validasyon
        const parsed = sendMessageSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) });
        }

        const { listingId, text, location, offerPrice, offerPricePer, offerNote } = parsed.data;
        const buyerId = req.userId;

        if (!buyerId) {
            return res.status(401).json({ error: 'Yetkilendirme hatası, lütfen giriş yapın.' });
        }

        // 2. İlan ve Kullanıcı Kontrollerini Paralel Yapalım (Performans Kazancı 🚀)
        const [listing, buyerUser] = await Promise.all([
            Listing.findById(listingId).select('owner title type is_deleted status'),
            User.findById(buyerId).lean<IUser>()
        ]);

        if (!listing || listing.is_deleted) {
            return res.status(404).json({ error: 'İlan bulunamadı' });
        }

        if (listing.status !== 'active') {
            return res.status(400).json({ error: 'Bu ilan artık aktif değil' });
        }

        const sellerId = listing.owner.toString();

        if (sellerId === buyerId) {
            return res.status(403).json({ error: 'Kendi ilanınıza mesaj gönderemezsiniz' });
        }

        // 3. Conversation bul veya oluştur
        let conversation = await Conversation.findOne({
            listing: listingId,
            seller:  sellerId,
            buyer:   buyerId,
        });

        const isNewConversation = !conversation;

        if (!conversation) {
            const isSenderVerified = buyerUser ? buyerUser.is_verified : false;
            if (!isSenderVerified) {
                return res.status(403).json({ error: 'Sadece onaylı öğrenciler yeni ilan için mesaj atabilirler.' });
            }

            conversation = await Conversation.create({
                listing:     listingId,
                seller:      sellerId,
                buyer:       buyerId,
                unreadCount: { seller: 0, buyer: 0 },
                status:      'active',
                activeOffer: null,
                lastMessage: null,
                offerStatus: 'No Offer',
            });
        }

        // 4. Fotoğraf yükleme sınırı kontrolü
        const files = req.files as Express.Multer.File[] | undefined;
        let photoUrls: string[] = [];
        if (files && files.length > 0) {
            if (files.length > 5) {
                return res.status(400).json({ error: 'Bir mesajda en fazla 5 fotoğraf gönderilebilir' });
            }
            const uploaded = await uploadMultiple(files, 'listingPhoto', 5);
            photoUrls = uploaded.map(f => f.url);
        }

        let finalOfferId: mongoose.Types.ObjectId | null = null;

        // 5. ENTEGRE OFFER SİSTEMİ (Performans Optimize Edildi)
        if (offerPrice !== undefined) {
            // Döngü yerine tek sorguyla toplu güncelleme (Bulk Update) ⚡
            await Promise.all([
                Offer.updateMany(
                    { conversation: conversation._id, applicant: buyerId, status: 'Pending' },
                    { $set: { status: 'Cancelled' } }
                ),
                Offer.updateMany(
                    { conversation: conversation._id, applicant: { $ne: buyerId }, status: 'Pending' },
                    { $set: { status: 'Rejected' } }
                )
            ]);

            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // +48 saat
            const newOffer = await Offer.create({
                listing:      listingId,
                applicant:    buyerId,
                conversation: conversation._id,
                price:        offerPrice,
                pricePer:     offerPricePer,
                note:         offerNote ?? null,
                status:       'Pending',
                expiresAt,
            });

            finalOfferId = newOffer._id as mongoose.Types.ObjectId;
            conversation.offerStatus = "Offer Sent";
        }

        // 6. Mesaj oluştur
        const message = await Message.create({
            conversation: conversation._id,
            sender:       buyerId,
            type:         'user',
            text:         text    ?? null,
            photos:       photoUrls,
            location:     location ?? null,
            offer:        finalOfferId,
        });

        // Preview oluşturma mantığı (Burası gayet temiz)
        let preview = 'Yeni bir mesaj';
        if (text)                  preview = text.slice(0, 80);
        else if (photoUrls.length) preview = `${photoUrls.length} fotoğraf`;
        else if (location)         preview = 'Konum paylaşıldı';
        else if (finalOfferId)     preview = 'Teklif gönderildi';

        const senderName = buyerUser ? `${buyerUser.name} ${buyerUser.surname}` : 'Kullanıcı';

        // 7. Conversation güncelleme ve kaydetme
        conversation.lastMessage = {
            senderId:   new mongoose.Types.ObjectId(buyerId),
            senderName,
            preview,
            type:       'user',
            sentAt:     new Date(),
            isRead:     false
        };
        conversation.unreadCount.seller += 1;

        await conversation.save();

        // 8. Koşullu Populate (Gereksiz try-catch'ten kurtulduk)
        let populated = await message.populate('sender', 'name surname profile_photo');
        if (finalOfferId) {
            populated = await populated.populate('offer');
        }

        // 9. Socket Yayınları
        emitNewMessage(conversation._id.toString(), populated);
        emitConversationUpdated(sellerId, buyerId, conversation);

        // 10. Arka Plan Bildirim İşlemleri (Non-blocking)
        if (isNewConversation) {
            // async akışı bozmamak için populate işlemini arka plana alabiliriz veya bekleyebiliriz
            conversation.populate([
                { path: 'listing', select: 'title' },
                { path: 'buyer',   select: 'name surname profile_photo' },
            ]).then(convPopulated => {
                emitNewConversation(sellerId, convPopulated);
            });

            // E-posta bildirim mantığı (TODO aşaması için hazır)
            User.findById(sellerId).select('email name').then(seller => {
                if (seller?.email) {
                    // sendNewConversationEmail(seller.email, seller.name, listing.title)
                }
            }).catch(err => console.error("Email notification query error:", err));
        }

        return res.status(201).json({
            message:     populated,
            conversationId: conversation._id,
            isNewConversation,
        });

    } catch (error) {
        console.error('sendMessage error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

// ─── GET MESSAGES ─────────────────────────────────────────────────────────────
// GET /api/message/:conversationId?cursor=<createdAt>&limit=30
//
// Cursor-based sayfalama (offset yerine) — büyük sohbetlerde performanslı.
// Mesajlar çekildiğinde okunmamışlar otomatik olarak okundu işaretlenir.

export const getMessages = async (req: Request, res: Response): Promise<any> => {
    try {
        const { conversationId } = req.params
        const { cursor, limit = '30' } = req.query

        const limitNum = Math.min(50, Math.max(1, Number(limit) || 30))

        // Conversation var mı ve kullanıcı bu sohbetin üyesi mi?
        const conversation = await Conversation.findById(conversationId)
        if (!conversation) return res.status(404).json({ error: 'Sohbet bulunamadı' })

        const isMember = [
            conversation.seller.toString(),
            conversation.buyer.toString(),
        ].includes(req.userId!)

        if (!isMember) return res.status(403).json({ error: 'Bu sohbete erişim yetkiniz yok' })

        // Cursor: verilen tarihten daha eski mesajları getir (yukarı kaydırma)
        const filter: Record<string, any> = { conversation: conversationId }
        if (cursor) {
            filter.createdAt = { $lt: new Date(cursor as string) }
        }

        const messages = await Message.find(filter)
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .populate('sender', 'name surname profile_photo')
            .populate('offer')

        // Eski → yeni sıraya çevir (UI için)
        messages.reverse()

        // ── Okunmamış mesajları okundu yap ──────────────────────────────────
        // Benim dışımdaki gönderilen, okunmamış mesajları işaretle
        const now = new Date()
        await Message.updateMany(
            {
                conversation: conversationId,
                sender:       { $ne: req.userId },
                isRead:       false,
            },
            { $set: { isRead: true, readAt: now } }
        )

        // unreadCount sıfırla
        const role = conversation.seller.toString() === req.userId ? 'seller' : 'buyer'
        if (conversation.unreadCount[role] > 0) {
            conversation.unreadCount[role] = 0
            await conversation.save()
        }

        // Sonraki sayfa için cursor = en eski mesajın tarihi
        const nextCursor = messages.length > 0
            ? messages[0].createdAt.toISOString()
            : null

        return res.json({
            messages,
            nextCursor,
            hasMore: messages.length === limitNum,
        })

    } catch (error) {
        console.error('getMessages error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── GET CONVERSATIONS ────────────────────────────────────────────────────────
// GET /api/message/conversations?page=1&limit=20
//
// Kullanıcının tüm sohbetleri — seller veya buyer olarak

export const getConversations = async (req: Request, res: Response): Promise<any> => {
    try {
        const { page = '1', limit = '20' } = req.query
        const pageNum  = Math.max(1, Number(page)  || 1)
        const limitNum = Math.min(50, Math.max(1, Number(limit) || 20))

        const conversations = await Conversation.find({
            $or: [{ seller: req.userId }, { buyer: req.userId }],
            status: { $ne: 'blocked' },
        })
            .sort({ updatedAt: -1 })
            .skip((pageNum - 1) * limitNum)
            .limit(limitNum)
            .populate('listing', 'title photos type')
            .populate('seller',  'name surname profile_photo')
            .populate('buyer',   'name surname profile_photo')
            .populate('activeOffer')

        return res.json({ conversations, page: pageNum })

    } catch (error) {
        console.error('getConversations error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── DELETE MESSAGE ───────────────────────────────────────────────────────────
// DELETE /api/message/:messageId
// Soft delete — içerik temizlenir, kayıt kalır (sistem mesajı mantığına benzer)

export const deleteMessage = async (req: Request, res: Response): Promise<any> => {
    try {
        const message = await Message.findOne({
            _id:    req.params.messageId,
            sender: req.userId,
        })
        if (!message) return res.status(404).json({ error: 'Mesaj bulunamadı' })

        const conversation = await Conversation.findById(message.conversation)
        if (!conversation) return res.status(404).json({ error: 'Conversation bulunamadı' })

        if (message.offer) {
            await Offer.findByIdAndUpdate(message.offer, { status: 'Cancelled' })
            conversation.offerStatus = 'No Offer'
        }

        const lastMessage = conversation.lastMessage
        const isLastMessage = lastMessage
            && lastMessage.senderId.toString() === message.sender.toString()
            && lastMessage.sentAt?.getTime() === message.createdAt?.getTime()

        if (isLastMessage && lastMessage) {
            lastMessage.preview = 'Mesaj silindi'
            lastMessage.type = 'system'
        }

        message.text      = null
        message.photos    = []
        message.location  = null
        message.offer     = null
        message.isDeleted = true
        await message.save()

        await conversation.save()

        emitMessageUpdated(message.conversation.toString(), message)
        emitConversationUpdated(conversation.seller.toString(), conversation.buyer.toString(), conversation)

        return res.json({ message: 'Mesaj silindi' })

    } catch (error) {
        console.error('deleteMessage error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}