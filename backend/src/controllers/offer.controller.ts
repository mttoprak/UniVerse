import { Request, Response } from 'express'
import { z }                 from 'zod'

import Offer        from '../models/Offer'
import Conversation from '../models/Conversation'
import { Listing }  from '../models/Listing'
import Message      from '../models/Message'
import { emitOfferUpdated, emitNewMessage } from '../Socket/Socket'
import {applySchema, makeOfferSchema, respondToOfferSchema} from "../validators/offer.validation";
import {verifyResetCodeSchema} from "../validators/auth.validator";

// ─── APPLY (Job / Scholarship) ────────────────────────────────────────────────
// POST /api/offer/apply
// Conversation gerektirmez. İlan sahibi başvuruları listing altında görür.

export const applyToListing = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = applySchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const { listingId, note } = parsed.data
        const applicantId = req.userId!

        const listing = await Listing.findById(listingId).select('owner type')
        if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' })

        // Sadece job ve scholarship ilanlarına direkt başvuru yapılabilir
        const applicableTypes = ['job', 'scholarship']
        if (!applicableTypes.includes((listing as any).type)) {
            return res.status(400).json({
                error: 'Bu ilan türüne direkt başvuru yapılamaz. Mesaj üzerinden teklif gönderiniz.',
            })
        }

        // Kendi ilanına başvurulamaz
        if (listing.owner.toString() === applicantId) {
            return res.status(403).json({ error: 'Kendi ilanınıza başvuramazsınız' })
        }

        // Daha önce başvurmuş mu?
        const existing = await Offer.findOne({
            listing:      listingId,
            applicant:    applicantId,
            conversation: null,
            status:       { $in: ['Pending', 'Accepted'] },
        })
        if (existing) {
            return res.status(409).json({ error: 'Bu ilana zaten başvurdunuz' })
        }

        const offer = await Offer.create({
            listing:      listingId,
            applicant:    applicantId,
            conversation: null,           // conversation yok
            price:        null,
            note:         note ?? null,
            status:       'Pending',
            expiresAt:    null,
        })

        const populated = await offer.populate('applicant', 'name surname profile_photo university')

        return res.status(201).json({ offer: populated })

    } catch (error) {
        console.error('applyToListing error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── MAKE OFFER (Marketplace) ─────────────────────────────────────────────────
// POST /api/offer/make
// Conversation içinde fiyat teklifi gönderir.
// Conversation'da activeOffer null olmalı (bekleyen teklif yokken).

export const makeOffer = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = makeOfferSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const { conversationId, price, pricePer, note } = parsed.data
        const userId = req.userId!

        const conversation = await Conversation.findById(conversationId)
        if (!conversation) return res.status(404).json({ error: 'Sohbet bulunamadı' })

        // Conversation üyesi mi?
        const isMember = [
            conversation.seller.toString(),
            conversation.buyer.toString(),
        ].includes(userId)
        if (!isMember) return res.status(403).json({ error: 'Bu sohbete erişim yetkiniz yok' })

        // EĞER ÖNCEDEN BEKLEYEN BİR OFFER VARSA VE YENİ ATILIYORSA ÖNCEKİNİ REJECTED YA DA CANCELLED YAPALIM
        const pendingOffers = await Offer.find({
            conversation: conversationId,
            status: 'Pending',
        })

        for (const pendingOffer of pendingOffers) {
            // Eğer teklifi yapan kişi tekrar yeni bir teklif yapıyorsa eskisini iptal et (Cancelled)
            // Eğer karşı taraf bekleyen teklife yanıt vermek yerine yeni bir teklif yapıyorsa eskisini reddet (Rejected)
            if (pendingOffer.applicant.toString() === userId) {
                pendingOffer.status = 'Cancelled'
            } else {
                pendingOffer.status = 'Rejected'
            }
            await pendingOffer.save()
        }

        // +48 saat geçerlilik
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

        const offer = await Offer.create({
            listing:      conversation.listing,
            applicant:    userId,
            conversation: conversationId,
            price,
            pricePer,
            note:         note ?? null,
            status:       'Pending',
            expiresAt,
        })

        // Conversation'ın activeOffer'ını güncelle
        conversation.offerStatus = "Offer Sent"
        await conversation.save()

        // Teklifi mesaj olarak da yayınla (UI'da özel kart gösterimi için)
        const systemMsg = await Message.create({
            conversation: conversationId,
            sender:       userId,
            type:         'user',
            text:         null,
            photos:       [],
            location:     null,
            offer:        offer._id,
        })

        const populated = await systemMsg.populate([
            { path: 'sender', select: 'name surname profile_photo' },
            { path: 'offer' },
        ])

        emitNewMessage(conversationId, populated)

        return res.status(201).json({ offer, message: populated })

    } catch (error) {
        console.error('makeOffer error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── RESPOND OFFER ────────────────────────────────────────────────────────────
// PATCH /api/offer/:offerId/respond
// Teklifi kabul et veya reddet.
// Sadece ilan sahibi (seller) yanıt verebilir.

export const respondToOffer = async (req: Request, res: Response): Promise<any> => {
    try {
        const { offerId } = req.params

        const parsed = respondToOfferSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const { action }  = parsed.data

        const offer = await Offer.findById(offerId).populate('listing', 'owner type')
        if (!offer) return res.status(404).json({ error: 'Teklif bulunamadı' })

        if (offer.status !== 'Pending') {
            return res.status(400).json({ error: 'Bu teklif artık yanıtlanamaz' })
        }

        if (offer.conversation) {
            // Marketplace teklifi. Yanıtı verecek kişi applicant (teklif eden) olmamalıdır ve sohbetin bir parçası olmalıdır.
            const conversation = await Conversation.findById(offer.conversation);
            if (!conversation) return res.status(404).json({ error: 'Sohbet bulunamadı' })

            const isMember = [conversation.buyer.toString(), conversation.seller.toString()].includes(req.userId!)
            if (!isMember) {
                 return res.status(403).json({ error: 'Bu sohbete erişim yetkiniz yok' })
            }
            if (offer.applicant.toString() === req.userId) {
                 return res.status(403).json({ error: 'Kendi teklifinize yanıt veremezsiniz' })
            }
        } else {
            // Sadece ilan sahibi yanıt verebilir (İş / Burs başvuruları)
            const listingOwner = (offer.listing as any).owner.toString()
            if (listingOwner !== req.userId) {
                return res.status(403).json({ error: 'Sadece ilan sahibi teklife yanıt verebilir' })
            }
        }

        offer.status = action === 'accepted' ? 'Accepted' : 'Rejected'
        await offer.save()

        // Eğer teklif kabul edildiyse

        const listingRef = offer.listing as any
        const listingId = listingRef?._id ?? listingRef
        let listingType = listingRef?.type

        if (!listingType) {
            const listingDoc = await Listing.findById(listingId).select('type')
            if (!listingDoc) return res.status(404).json({ error: 'Böyle bir ilan yok' })
            listingType = (listingDoc as any).type
        }

        if (action === 'accepted' && listingType === 'secondhand') {
            // 1. İlanı satıldı olarak işaretle
            await Listing.findByIdAndUpdate(listingId, { $set: { status: 'sold' } })

            // 2. Bu ilana ait bekleyen diğer teklifleri reddet
            const otherOffers = await Offer.find({ listing: listingId, status: 'Pending', _id: { $ne: offer._id } })
            for (const other of otherOffers) {
                other.status = 'Rejected'
                await other.save()

                // Eğer marketplace teklifi ise onun sohbetindeki durumu da güncelle
                if (other.conversation) {
                    await Conversation.findByIdAndUpdate(other.conversation, {
                        $set: { offerStatus: 'Offer Rejected' }
                    })
                    // Başka bir teklif kabul edildiği için bu teklif iptal oldu mesajı atılabilir
                    await Message.create({
                        conversation: other.conversation,
                        sender:       req.userId,
                        type:         'system',
                        text:         `İlan başka bir kullanıcıya satıldığı için teklif reddedildi.`,
                        photos:       [],
                        location:     null,
                        offer:        null,
                    })
                    emitOfferUpdated(other.conversation.toString(), other._id.toString(), 'Rejected')
                }
            }
        }

        // Conversation'ın offerStatus'unu güncelle
        if (offer.conversation) {
            await Conversation.findByIdAndUpdate(offer.conversation, {
                $set: { offerStatus: action === 'accepted' ? 'Offer Accepted' : 'Offer Rejected' },
            })

            // Sistem mesajı oluştur
            const statusText = action === 'accepted' ? 'Kabul edildi' : 'Reddedildi'
            await Message.create({
                conversation: offer.conversation,
                sender:       req.userId,
                type:         'system',
                text:         `Teklif ${statusText}`,
                photos:       [],
                location:     null,
                offer:        null,
            })

            // Socket bildirimi
            emitOfferUpdated(offer.conversation.toString(), offer._id.toString(), offer.status)
        }

        return res.json({ offer })

    } catch (error) {
        console.error('respondToOffer error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── CANCEL OFFER ─────────────────────────────────────────────────────────────
// PATCH /api/offer/:offerId/cancel
// Teklifi iptal et. Sadece teklifi gönderen kişi yapabilir.

export const cancelOffer = async (req: Request, res: Response): Promise<any> => {
    try {
        const offer = await Offer.findOne({
            _id:       req.params.offerId,
            applicant: req.userId,
            status:    'Pending',
        })
        if (!offer) return res.status(404).json({ error: 'İptal edilebilir teklif bulunamadı' })

        offer.status = 'Cancelled'
        await offer.save()

        if (offer.conversation) {
            await Conversation.findByIdAndUpdate(offer.conversation, {
                $set: { offerStatus: 'No Offer' },
            })
            emitOfferUpdated(offer.conversation.toString(), offer._id.toString(), 'cancelled')
        }

        return res.json({ offer })

    } catch (error) {
        console.error('cancelOffer error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── GET LISTING APPLICATIONS (Job / Scholarship panel) ───────────────────────
// GET /api/offer/listing/:listingId/applications
// İlan sahibi gelen başvuruları bu endpoint'ten çeker.

export const getListingApplications = async (req: Request, res: Response): Promise<any> => {
    try {
        const { listingId } = req.params
        const { page = '1', limit = '20', status } = req.query

        const pageNum  = Math.max(1, Number(page)  || 1)
        const limitNum = Math.min(50, Math.max(1, Number(limit) || 20))

        // Sadece ilan sahibi görebilir
        const listing = await Listing.findById(listingId).select('owner')
        if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' })
        if (listing.owner.toString() !== req.userId) {
            return res.status(403).json({ error: 'Sadece ilan sahibi başvuruları görebilir' })
        }

        const filter: Record<string, any> = {
            listing:      listingId,
            conversation: null,     // job/scholarship direkt başvuruları
        }
        if (status) filter.status = status

        const [applications, total] = await Promise.all([
            Offer.find(filter)
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate('applicant', 'name surname profile_photo university'),
            Offer.countDocuments(filter),
        ])

        return res.json({ applications, total, page: pageNum })

    } catch (error) {
        console.error('getListingApplications error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── GET MY APPLICATIONS ──────────────────────────────────────────────────────
// GET /api/offer/my-applications
// Kullanıcının yaptığı başvurular

export const getMyApplications = async (req: Request, res: Response): Promise<any> => {
    try {
        const { page = '1', limit = '20' } = req.query
        const pageNum  = Math.max(1, Number(page)  || 1)
        const limitNum = Math.min(50, Math.max(1, Number(limit) || 20))

        const [applications, total] = await Promise.all([
            Offer.find({ applicant: req.userId, conversation: null })
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate('listing', 'title type'),
            Offer.countDocuments({ applicant: req.userId, conversation: null }),
        ])

        return res.json({ applications, total, page: pageNum })

    } catch (error) {
        console.error('getMyApplications error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}