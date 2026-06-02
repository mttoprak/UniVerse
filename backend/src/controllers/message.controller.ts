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

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────────
// POST /api/message
//
// İlk mesaj gönderildiğinde conversation otomatik oluşturulur.
// Conversation would be created after first message.
// Sonraki mesajlarda mevcut conversation güncellenir.
// The conversation would be updated in the following messages.

export const sendMessage = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = sendMessageSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const { listingId, text, location,
            // offerId,
            offerPrice, offerPricePer, offerNote } = parsed.data
        const buyerId = req.userId!

        // 1. İlanı bul
        const listing = await Listing.findById(listingId).select('owner title type is_deleted status')
        if (!listing || listing.is_deleted) return res.status(404).json({ error: 'İlan bulunamadı' })

        if (listing.status !== 'active') {
            return res.status(400).json({ error: 'Bu ilan artık aktif değil' })
        }

        const sellerId = listing.owner.toString()

        // Kendi ilanına mesaj atılamaz
        if (sellerId === buyerId) {
            return res.status(403).json({ error: 'Kendi ilanınıza mesaj gönderemezsiniz' })
        }

        // 2. Fotoğraf yükle (varsa)
        const files = req.files as Express.Multer.File[] | undefined
        let photoUrls: string[] = []
        if (files && files.length > 0) {
            if (files.length > 5) {
                return res.status(400).json({ error: 'Bir mesajda en fazla 5 fotoğraf gönderilebilir' })
            }
            const uploaded = await uploadMultiple(files, 'listingPhoto', 5)
            photoUrls = uploaded.map(f => f.url)
        }

        // 3. Conversation bul veya oluştur
        let conversation = await Conversation.findOne({
            listing: listingId,
            seller:  sellerId,
            buyer:   buyerId,
        })

        const isNewConversation = !conversation

        if (!conversation) {
            conversation = await Conversation.create({
                listing:     listingId,
                seller:      sellerId,
                buyer:       buyerId,
                unreadCount: { seller: 0, buyer: 0 },
                status:      'active',
                activeOffer: null,
                lastMessage: null,
                offerStatus: 'No Offer',
            })
        }

        // let finalOfferId = offerId ?? null;
        let finalOfferId = null

        // --- ENTEGRE OFFER SİSTEMİ ---
        // Eğer kullanıcı yeni bir teklifle birlikte mesaj atıyorsa
        if (offerPrice !== undefined) {
             // Eski teklifleri temizle (iptal/red)
             const pendingOffers = await Offer.find({ conversation: conversation._id, status: 'Pending' })
             for (const pendingOffer of pendingOffers) {
                 if (pendingOffer.applicant.toString() === buyerId) {
                     pendingOffer.status = 'Cancelled'
                 } else {
                     pendingOffer.status = 'Rejected'
                 }
                 await pendingOffer.save()
             }

             const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)         // +48 saat geçerlilik
             const newOffer = await Offer.create({
                 listing:      listingId,
                 applicant:    buyerId,
                 conversation: conversation._id,
                 price:        offerPrice,
                 pricePer:     offerPricePer,
                 note:         offerNote ?? null,
                 status:       'Pending',
                 expiresAt,
             })
             // keep ObjectId reference (Mongoose will cast if needed)
             finalOfferId = newOffer._id;
            conversation.offerStatus = "Offer Sent";
        }

        // 4. Mesaj oluştur
        const message = await Message.create({
            conversation: conversation._id,
            sender:       buyerId,
            type:         'user',
            text:         text    ?? null,
            photos:       photoUrls,
            location:     location ?? null,
            offer:        finalOfferId,
        })

        // 5. Mesaj önizlemesini oluştur
        let preview = ''
        if (text)                preview = text.slice(0, 80)
        else if (photoUrls.length) preview = `${photoUrls.length} fotoğraf`
        else if (location)       preview = 'Konum paylaşıldı'
        else if (finalOfferId)        preview = 'Teklif gönderildi'

        // 6. Buyer adını al (lastMessage için)
        const buyerUser = await User.findById(buyerId).select('name surname')
        const senderName = buyerUser
            ? `${buyerUser.name} ${buyerUser.surname}`
            : 'Kullanıcı'

        // 7. Conversation'ı güncelle (lastMessage + unreadCount)
        conversation.lastMessage = {
            senderId:   new mongoose.Types.ObjectId(buyerId),
            senderName,
            preview,
            type:       'user',
            sentAt:     new Date(),
            isRead:     false
        }
        conversation.unreadCount.seller += 1   // satıcıya 1 okunmamış eklendi

        await conversation.save()

        // 8. Mesajı populate et (include offer details when present)
        let populated = await message.populate('sender', 'name surname profile_photo')
        try { populated = await populated.populate('offer') } catch (e) { /* ignore if no offer */ }

        // 9. Socket yayınları
        emitNewMessage(conversation._id.toString(), populated)
        emitConversationUpdated(sellerId, buyerId, conversation)

        // If a new offer was created, notify the conversation room about it
        if (finalOfferId) {
            try {
                emitOfferUpdated(conversation._id.toString(), finalOfferId.toString(), 'Pending')
            } catch (e) { /* best-effort emit */ }
        }

        //TODO: Burada seller ve buyer'ın aktifliği sorgulanacak.
        // Eğer uygulamada değillerse e-mail atılacak

        if (isNewConversation) {
            // Satıcıya yeni sohbet bildirimi (socket)
            const convPopulated = await conversation.populate([
                { path: 'listing', select: 'title' },
                { path: 'buyer',   select: 'name surname profile_photo' },
            ])
            emitNewConversation(sellerId, convPopulated)

            // E-posta bildirimi (satıcıya)
            try {
                const seller = await User.findById(sellerId).select('email name')
                if (seller?.email) {
                    // sendNewConversationEmail(seller.email, seller.name, listing.title)
                    // TODO: mail.utils'e eklenecek
                }
            } catch { /* e-posta başarısız olursa mesaj gönderimi engellenmez */ }
        }//TODO: Burada seller ve buyer'ın aktifliği sorgulanacak.
         // Eğer uygulamada değillerse e-mail atılacak

        return res.status(201).json({
            message:     populated,
            conversationId: conversation._id,
            isNewConversation,
        })

    } catch (error) {
        console.error('sendMessage error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

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