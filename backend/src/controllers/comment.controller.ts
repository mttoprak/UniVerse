import { Request, Response } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
import Comment from '../models/Comment'
import User from '../models/User'
import Offer from '../models/Offer'
import { Listing } from '../models/Listing'
import { createCommentSchema, updateCommentSchema } from '../validators/comment.validator'


// ─── AGREEMENT KONTROLÜ ───────────────────────────────────────────────────────
//
// Offer modeli kurulunca aşağıdaki TODO aktif edilir, başka hiçbir şey değişmez.
// Şu an agreement kontrolü yok — comment sistemi açık çalışır.
//

const hasAgreement = async (
    _authorId:  string,
    _targetId:  string,
    _listingId: string,
): Promise<boolean> => {
    // Offer tablosunda applicant (teklif yapan) alanı var.
    // Karşı taraf ise (kabul eden) ilanın sahibidir veya Marketplace ise konuşmadaki diğer kişidir.
    // Şimdilik en optimum çözüm: _listingId'ye ait durumu "Accepted" olan ve
    // teklifi yapanın _authorId veya _targetId olduğu bir teklif var mı diye bakmak.
    // Sadece ilanla kısıtlı aradığınız için doğrudan o ilandaki Accepted teklifi arayabiliriz:
    const agreement = await Offer.exists({
        listing: _listingId,
        status:  'Accepted',
        applicant: { $in: [_authorId, _targetId] }
    })
    return !!agreement
}

// ─── CREATE ──────────────────────────────────────────────────────────────────

export const newComment = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = createCommentSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const { listing: listingId, content, rating, parent } = parsed.data
        const authorId = req.userId!

        // 1. İlan var mı?
        const listing = await Listing.findById(listingId)
        if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' })

        const targetId = listing.owner.toString()

        // --- YETKİ KONTROLÜ (Öğrenci veya İlan Sahibi değilse engelle) ---
        const user = await User.findById(authorId)
        const isUserStudent = (user?.account_type === 'student')
        const isOwner = (targetId === authorId)

        if (!isUserStudent && !isOwner) {
            return res.status(403).json({ error: 'Sadece öğrenciler veya ilanın sahibi işlem yapabilir.' })
        }
        // -----------------------------------------------------------------

        // 2. Kendi ilanına top-level yorum yapılamaz
        //    (reply atabilir — satıcı gelen yorumlara public cevap verebilmeli)
        if (targetId === authorId && !parent) {
            return res.status(403).json({ error: 'Kendi ilanınıza yorum yapamazsınız' })
        }

        // 3. Reply kontrolü
        if (parent) {
            const parentComment = await Comment.findById(parent)
            if (!parentComment) {
                return res.status(404).json({ error: 'Yanıtlanacak yorum bulunamadı' })
            }
            if (parentComment.listing.toString() !== listingId) {
                return res.status(400).json({ error: 'Yorum bu ilana ait değil' })
            }
            // Maksimum 1 seviye — reply'a reply yoktur
            // Yazmak istersen parent comment'in parent'ına yönlendirilir
            if (parentComment.parent) {
                return res.status(400).json({
                    error: 'Yanıtlara yanıt yapılamaz',
                    redirect_to_parent: parentComment.parent, // frontend bunu kullanabilir
                })
            }
        }

        // 4. Rating kontrolü — sadece top-level, agreement şartlı, ilan başına 1 kez
        if (rating && !parent) {
            const agreed = await hasAgreement(authorId, targetId, listingId)
            if (!agreed) {
                return res.status(403).json({
                    error: 'Puan vermek için satıcıyla kabul edilmiş bir anlaşmanız olmalıdır',
                })
            }

            // Bu kullanıcı bu ilana daha önce puan verdi mi?
            const existingRating = await Comment.findOne({
                listing:    listingId,
                author:     authorId,
                parent:     null,
                rating:     { $ne: null },
                is_deleted: false,
            })
            if (existingRating) {
                return res.status(409).json({ error: 'Bu ilana zaten puan verdiniz' })
            }
        }

        // 5. Comment oluştur
        const comment = await Comment.create({
            listing:  listingId,
            author:   authorId,
            target:   targetId,
            content,
            rating:   rating ?? null,
            parent:   parent ?? null,
        })

        // 6. Rating varsa satıcının toplam puanını güncelle
        if (rating && !parent) {
            await User.findByIdAndUpdate(targetId, {
                $inc: { rating_sum: rating, rating_count: 1 },
            })
        }

        const populated = await comment.populate('author', 'username profile_photo')
        return res.status(201).json({ comment: populated })
    } catch (error) {
        console.error('newComment error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── GET COMMENTS (ilan üzerindeki top-level yorumlar + reply sayısı) ─────────
//
// Neden aggregation?
// populate() ile reply_count eklenemez. Her comment için ayrı countDocuments()
// çağrısı N+1 problemi yaratır. Aggregation tek sorguda hem yorumları hem
// reply sayısını hem de author bilgisini çeker.

export const getComments = async (req: Request, res: Response): Promise<any> => {
    try {
        const { listingId } = req.params
        const { page = '1', limit = '20' } = req.query

        // --- YETKİ KONTROLÜ ---
        const listing = await Listing.findById(listingId).select('owner')
        if (!listing) return res.status(404).json({ error: 'İlan bulunamadı' })

        const user = await User.findById(req.userId)
        const isUserStudent = (user?.account_type === 'student')
        const isOwner = (listing.owner.toString() === req.userId)

        if (!isUserStudent && !isOwner) {
            return res.status(403).json({ error: 'Sadece öğrenciler veya ilanın sahibi bu yorumları görebilir.' })
        }
        // -----------------------

        const pageNum  = Math.max(1, Number(page)  || 1)
        const limitNum = Math.min(50, Math.max(1, Number(limit) || 20))

        const listingOId = new mongoose.Types.ObjectId(String(listingId))

        const [comments, total] = await Promise.all([
            Comment.aggregate([
                // Sadece bu ilanın top-level commentleri
                { $match: { listing: listingOId, parent: null } },
                { $sort:  { createdAt: -1 } },
                { $skip:  (pageNum - 1) * limitNum },
                { $limit: limitNum },

                // Her comment'in kaç reply'ı var?
                {
                    $lookup: {
                        from:         'comments',
                        localField:   '_id',
                        foreignField: 'parent',
                        as:           '_replies',
                    },
                },
                {
                    $addFields: {
                        reply_count: { $size: '$_replies' },
                    },
                },
                { $unset: '_replies' }, // ham array'i temizle, sadece sayı kalsın

                // Author bilgisi
                {
                    $lookup: {
                        from:      'users',
                        localField: 'author',
                        foreignField: '_id',
                        as:        'author',
                        pipeline:  [{ $project: { username: 1, profile_photo: 1 } }],
                    },
                },
                { $unwind: '$author' },
            ]),

            Comment.countDocuments({ listing: listingOId, parent: null }),
        ])

        return res.json({ comments, total, page: pageNum })
    } catch (error) {
        console.error('getComments error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── GET REPLIES (bir comment'in yanıtları) ────────────────────────────────────
//
// Frontend reply_count > 0 ise "X yanıtı gör" butonu gösterir,
// tıklayınca bu endpoint'i çağırır.

export const getCommentReplies = async (req: Request, res: Response): Promise<any> => {
    try {
        const { commentId } = req.params

        const parent = await Comment.findById(commentId).populate('listing', 'owner')
        if (!parent) return res.status(404).json({ error: 'Yorum bulunamadı' })

        // --- YETKİ KONTROLÜ ---
        const user = await User.findById(req.userId)
        const isUserStudent = (user?.account_type === 'student')
        const isOwner = ((parent.listing as any).owner.toString() === req.userId)

        if (!isUserStudent && !isOwner) {
            return res.status(403).json({ error: 'Sadece öğrenciler veya ilanın sahibi bu yanıtları görebilir.' })
        }
        // -----------------------

        // Oldest first — konuşma akışı gibi okunur
        const replies = await Comment.find({ parent: commentId })
            .sort({ createdAt: 1 })
            .populate('author', 'username profile_photo')

        return res.json({ replies })
    } catch (error) {
        console.error('getCommentReplies error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── GET USER COMMENTS (bir kullanıcıya yapılan yorumlar — profil sayfası) ────

export const getUserComments = async (req: Request, res: Response): Promise<any> => {
    try {
        const { userId } = req.params
        const { page = '1', limit = '20' } = req.query

        // --- YETKİ KONTROLÜ ---
        const userReq = await User.findById(req.userId)
        const isUserStudent = (userReq?.account_type === 'student')
        
        // Eğer öğrenci değilse ve başkasının profiline (başkasının yorumlarına) bakmaya çalışıyorsa engelle.
        // Kendi profilindeki (kendi ilanlarına gelen) yorumları görebilir.
        if (!isUserStudent && userId !== req.userId) {
            return res.status(403).json({ error: 'Sadece öğrenciler veya kullanıcının kendisi bu yorumları görebilir.' })
        }
        // -----------------------

        const pageNum  = Math.max(1, Number(page)  || 1)
        const limitNum = Math.min(50, Math.max(1, Number(limit) || 20))

        const [comments, total] = await Promise.all([
            Comment.find({ target: userId, parent: null })
                .sort({ createdAt: -1 })
                .skip((pageNum - 1) * limitNum)
                .limit(limitNum)
                .populate('author',  'username profile_photo')
                .populate('listing', 'title type'),
            Comment.countDocuments({ target: userId, parent: null }),
        ])

        return res.json({ comments, total, page: pageNum })
    } catch (error) {
        console.error('getUserComments error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export const updateComment = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = updateCommentSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const comment = await Comment.findOne({
            _id:        req.params.id,
            author:     req.userId,
            is_deleted: false,
        })
        if (!comment) return res.status(404).json({ error: 'Yorum bulunamadı' })

        // Reply'a rating verilemez
        if (parsed.data.rating !== undefined && comment.parent) {
            return res.status(400).json({ error: 'Yanıtlara puan verilemez' })
        }

        // Rating değişiyorsa farkı User puanına yansıt
        // rating_count değişmez — yeni puan değil, var olanın güncellenmesi
        if (parsed.data.rating !== undefined && !comment.parent && comment.rating !== null) {
            const diff = parsed.data.rating - comment.rating
            if (diff !== 0) {
                await User.findByIdAndUpdate(comment.target, {
                    $inc: { rating_sum: diff },
                })
            }
            comment.rating = parsed.data.rating
        }

        if (parsed.data.content !== undefined) {
            comment.content = parsed.data.content
        }

        comment.is_edited = true
        await comment.save()

        return res.json({ comment })
    } catch (error) {
        console.error('updateComment error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}

// ─── DELETE ──────────────────────────────────────────────────────────────────

export const deleteComment = async (req: Request, res: Response): Promise<any> => {
    try {
        const comment = await Comment.findOne({
            _id:    req.params.id,
            author: req.userId,
        })
        if (!comment) return res.status(404).json({ error: 'Yorum bulunamadı' })

        const { rating, parent, target } = comment

        const replyCount = await Comment.countDocuments({ parent: comment._id })

        if (replyCount > 0) {
            // Soft delete — reply'lar görünsün ama içerik gitsin
            comment.content    = '[bu yorum silindi]'
            comment.rating     = null
            comment.is_deleted = true
            comment.is_edited  = false
            await comment.save()
        } else {
            await comment.deleteOne()
        }

        // Puanlı top-level yorum silindiyse kullanıcı puanını geri al
        if (rating && !parent) {
            const userTarget = await User.findById(target);
            if (userTarget) {
                const newSum = Math.max(0, userTarget.rating_sum - rating);
                const newCount = Math.max(0, userTarget.rating_count - 1);

                userTarget.rating_sum = newSum;
                userTarget.rating_count = newCount;
                await userTarget.save();
            }
        }

        return res.json({ message: 'Yorum silindi' })
    } catch (error) {
        console.error('deleteComment error:', error)
        return res.status(500).json({ error: 'Server error' })
    }
}