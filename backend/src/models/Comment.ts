import mongoose, { Schema } from 'mongoose'
import { IComment } from '../types/comment.types'

const commentSchema = new Schema(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            required: [true, 'Listing zorunludur'],
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Author zorunludur'],
        },
        target: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Target zorunludur'],
        },
        content: {
            type: String,
            required: [true, 'İçerik zorunludur'],
            trim: true,
            minlength: 2,
            maxlength: 500,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            default: null,
        },
        parent: {
            type: Schema.Types.ObjectId,
            ref: 'Comment',
            default: null,
        },

        // ─── OFFER DOĞRULAMASI ────────────────────────────────────────────────
        // Offer modeli kurulunca buraya offer referansı eklenecek.
        // Şu an agreement kontrolü controller'daki hasAgreement() fonksiyonunda
        // yapılıyor — Offer.exists() ile. Schema değişikliği gerekmeyecek.
        // ─────────────────────────────────────────────────────────────────────

        is_edited: {
            type: Boolean,
            default: false,
        },
        is_deleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
)

// ─── INDEXLER ─────────────────────────────────────────────────────────────────

// İlan üzerindeki top-level commentler — sayfa başı çekim
commentSchema.index({ listing: 1, parent: 1, createdAt: -1 })

// Bir kullanıcıya yapılan tüm yorumlar (profil sayfası)
commentSchema.index({ target: 1, parent: 1, createdAt: -1 })

// Kullanıcının yazdığı yorumlar
commentSchema.index({ author: 1 })

// Duplicate rating önleme — aynı kişi aynı ilana 2 kez puan veremesin
commentSchema.index({ listing: 1, author: 1, parent: 1 })

const Comment = mongoose.model<IComment>('Comment', commentSchema)
export default Comment