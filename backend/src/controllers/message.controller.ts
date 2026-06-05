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

        const { conversationId, listingId, text, location, offerPrice, offerPricePer, offerNote } = parsed.data;
        const currentUserId = req.userId;

        if (!currentUserId) {
            return res.status(401).json({ error: 'Yetkilendirme hatası, lütfen giriş yapın.' });
        }

        let conversation;
        let listing;
        let sellerId: string;
        let buyerId: string;
        let isNewConversation = false;

        // 2. SOHBET BULMA VEYA OLUŞTURMA MANTIĞI
        if (conversationId) {
            // DURUM 1: MEVCUT SOHBETE MESAJ YAZILIYOR (Satıcı veya Alıcı cevap veriyor)
            conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ error: 'Belirtilen konuşma bulunamadı.' });
            }

            sellerId = conversation.seller.toString();
            buyerId = conversation.buyer.toString();

            if (currentUserId !== sellerId && currentUserId !== buyerId) {
                return res.status(403).json({ error: 'Bu konuşmaya mesaj gönderme yetkiniz yok.' });
            }

            listing = await Listing.findById(conversation.listing).select('owner title type is_deleted status');

            if (!listing || listing.is_deleted) {
                return res.status(404).json({ error: 'İlan silindiği için mesaj gönderilemiyor.' });
            }

        } else if (listingId) {
            // DURUM 2: CONVERSATION ID YOK, SADECE LISTING ID VAR
            listing = await Listing.findById(listingId).select('owner title type is_deleted status');

            if (!listing || listing.is_deleted) {
                return res.status(404).json({ error: 'İlan bulunamadı veya silinmiş.' });
            }

            sellerId = listing.owner.toString();

            // KRİTİK DÜZELTME: Satıcı sadece listingId ile mesaj gönderemez!
            if (sellerId === currentUserId) {
                return res.status(400).json({
                    error: 'İlan sahibi olarak mesaj gönderebilmek için mevcut bir sohbeti yanıtlamalısınız (conversationId eksik gönderildi).'
                });
            }

            // İsteği atan Satıcı değilse, kesinlikle Alıcı'dır.
            buyerId = currentUserId;

            // Önce bu alıcı ile satıcı arasında bu ilana ait AKTİF bir sohbet var mı kontrol et
            conversation = await Conversation.findOne({
                listing: listingId,
                seller:  sellerId,
                buyer:   buyerId,
                status:  'active',
            });

            if (!conversation) {
                // YENİ SOHBET BAŞLATMA
                // İlan aktif değilse YENİ sohbet başlatılamaz (Ama mevcut sohbet varsa yukarıdaki logic'ten devam edilebilir)
                if (listing.status !== 'active') {
                    return res.status(400).json({ error: 'Bu ilan artık aktif değil, yeni mesaj başlatılamaz.' });
                }

                const buyerUser = await User.findById(buyerId).lean();
                const isSenderVerified = buyerUser ? (buyerUser as any).is_verified : false;

                if (!isSenderVerified) {
                    return res.status(403).json({ error: 'Sadece onaylı kullanıcılar yeni ilan için mesaj atabilirler.' });
                }

                conversation = await Conversation.create({
                    listing:        listingId,
                    seller:         sellerId,
                    buyer:          buyerId,
                    unreadCount:    { seller: 0, buyer: 0 },
                    status:         'active',
                    activeOffer:    null,
                    lastMessage:    null,
                    offerStatus:    'No Offer',
                });
                isNewConversation = true;
            }
        } else {
            return res.status(400).json({ error: 'Mesaj göndermek için conversationId veya listingId zorunludur.' });
        }

        // 3. Fotoğraf Yükleme
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

        // 4. Entegre Teklif Sistemi
        if (typeof offerPrice === 'number' && offerPrice > 0) {
            if (currentUserId !== buyerId) {
                return res.status(403).json({ error: 'Sadece alıcılar teklif verebilir.' });
            }

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

            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
            const newOffer = await Offer.create({
                listing:      listing._id,
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

        // 5. Mesaj Oluştur
        const message = await Message.create({
            conversation: conversation._id,
            sender:       currentUserId,
            type:         'user',
            text:         text ?? null,
            photos:       photoUrls,
            location:     location ?? null,
            offer:        finalOfferId,
        });

        // Önizleme Metni
        let preview = 'Yeni bir mesaj';
        if (text)                  preview = text.slice(0, 80);
        else if (photoUrls.length) preview = `${photoUrls.length} fotoğraf`;
        else if (location)         preview = 'Konum paylaşıldı';
        else if (finalOfferId)     preview = 'Teklif gönderildi';

        const currentUserObj = await User.findById(currentUserId).lean();
        const senderName = currentUserObj ? `${(currentUserObj as any).name} ${(currentUserObj as any).surname}` : 'Kullanıcı';

        // 6. Conversation Güncelleme
        conversation.lastMessage = {
            senderId:   new mongoose.Types.ObjectId(currentUserId),
            senderName,
            preview,
            type:           'user',
            sentAt:         new Date(),
            isRead:         false,
            emailNotified:  false,
        };

        if (currentUserId === buyerId) {
            conversation.unreadCount.seller += 1;
        } else {
            conversation.unreadCount.buyer += 1;
        }

        console.log(conversation);
        await conversation.save();

        // 7. Popülasyonlar
        let populated = await message.populate('sender', 'name surname profile_photo');
        if (finalOfferId) {
            populated = await populated.populate('offer');
        }

        // 8. Socket Yayınları
        emitNewMessage(conversation._id.toString(), populated);
        emitConversationUpdated(sellerId, buyerId, conversation);

        // 9. Arka Plan Bildirimleri
        if (isNewConversation) {
            conversation.populate([
                { path: 'listing', select: 'title' },
                { path: 'buyer',   select: 'name surname profile_photo' },
            ]).then(convPopulated => {
                emitNewConversation(sellerId, convPopulated);
            });

            User.findById(sellerId).select('email name').then(seller => {
                // sendNewConversationEmail(seller.email, seller.name, listing.title)
            }).catch(err => console.error("Email notification error:", err));
        }

        return res.status(201).json({
            message:        populated,
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

        // 1. Conversation var mı ve kullanıcı bu sohbetin üyesi mi?
        const conversation = await Conversation.findById(conversationId)
        if (!conversation) return res.status(404).json({ error: 'Sohbet bulunamadı' })

        const isMember = [
            conversation.seller.toString(),
            conversation.buyer.toString(),
        ].includes(req.userId!)

        if (!isMember) return res.status(403).json({ error: 'Bu sohbete erişim yetkiniz yok' })

        // 2. Cursor: verilen tarihten daha eski mesajları getir (yukarı kaydırma)
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

        // ── 3. OKUNMAMIŞ MESAJLARI OKUNDU YAP ──────────────────────────────────
        const now = new Date()

        // Karşı taraftan gelen ve henüz okunmamış olan tüm mesajları toplu güncelle
        await Message.updateMany(
            {
                conversation: conversationId,
                sender:       { $ne: req.userId },
                isRead:       false,
            },
            { $set: { isRead: true, readAt: now } }
        )

        // ── 4. CONVERSATION OBJESİNİ GÜNCELLE (Hatalar Düzenlendi) ────────────────
        let conversationChanged = false
        const role = conversation.seller.toString() === req.userId ? 'seller' : 'buyer'

        // Okunmamış sayaç varsa sıfırla
        if (conversation.unreadCount[role] > 0) {
            conversation.unreadCount[role] = 0
            conversationChanged = true
        }

        // KRİTİK KONTROL: Eğer son mesaj varsa VE son mesajı atan kişi BEN DEĞİLSEM VE hala okunmadıysa true yap
        if (
            conversation.lastMessage &&
            conversation.lastMessage.senderId.toString() !== req.userId &&
            !conversation.lastMessage.isRead
        ) {
            conversation.lastMessage.isRead = true
            conversationChanged = true
        }

        // Eğer yukarıdaki if'lerden herhangi birine girdiyse tek seferde DB'ye kaydet ⚡
        if (conversationChanged) {
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
        const { page = '1', limit = '20', status } = req.query;

        const pageNum  = Math.max(1, Number(page)  || 1);
        const limitNum = Math.min(50, Math.max(1, Number(limit) || 20));
        const userId   = req.userId;

        if (!userId) {
            return res.status(401).json({ error: 'Yetkilendirme hatası' });
        }

        // 1. Temel Sorgu Filtresi (Kullanıcının dahil olduğu ve engellenmeyen sohbetler)
        const query: any = {
            $or: [{ seller: userId }, { buyer: userId }],
            status: { $ne: 'blocked' },
        };

        // Eğer frontend'den filtre geldiyse (Örn: sadece active veya sadece archived listelemek için)
        if (status && ['active', 'archived'].includes(status as string)) {
            query.status = status;
        }

        // 2. Performans İçin Veritabanı Sorgularını Paralel Çalıştırıyoruz ⚡
        const [conversations, totalCount] = await Promise.all([
            Conversation.find(query)
                .sort({ updatedAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate('listing', 'title photos type')
                .populate('seller',  'name surname profile_photo')
                .populate('buyer',   'name surname profile_photo')
                // .populate('activeOffer') // ⚠️ AŞAĞIDAKİ UYARIYI OKU!
                .lean(), // ⚡ Performansı uçurur: Mongoose dökümanı yerine hafif, düz JS nesnesi döner.
            Conversation.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limitNum);

        // 3. Frontend dostu response yapısı
        return res.json({
            conversations,
            pagination: {
                page: pageNum,
                limit: limitNum,
                totalCount,
                totalPages,
                hasNextPage: pageNum < totalPages
            }
        });

    } catch (error) {
        console.error('getConversations error:', error);
        return res.status(500).json({ error: 'Server error' });
    }
};

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