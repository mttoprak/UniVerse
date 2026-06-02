import mongoose, { Schema } from 'mongoose'
import { IMessage } from '../types/message.types'

const messageSchema = new Schema<IMessage>(
    {
        conversation: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: [true, 'Conversation zorunludur'],
        },
        sender: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Sender zorunludur'],
        },

        // 'user'   → kullanıcı mesajı (text/photo/location/offer karışık olabilir)
        // 'system' → sistem mesajı   ("Teklif kabul edildi", "Sohbet başlatıldı")
        type: {
            type: String,
            enum: ['user', 'system'],
            default: 'user',
        },

        // ─── İÇERİK ALANLARI ───────────────────────────────────────────────
        // 'user' tipi mesajda en az biri dolu olmalı (controller kontrolü).
        // Aynı mesajda text + photos + location + offer birlikte gönderilebilir.

        text: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: null,
        },
        photos: {
            type: [String],  // Cloudinary URL'leri
            default: [],
            validate: {
                validator: (v: string[]) => v.length <= 5,
                message: 'a maximum of 5 photos can be sent in one message.',
            },
        },
        location: {
            type: String,   // Google Maps URL
            trim: true,
            default: null,
        },
        offer: {
            type: Schema.Types.ObjectId,
            ref: 'Offer',
            default: null,
        },

        // ─── DURUM ──────────────────────────────────────────────────────────
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
            default: null,
        },

        // Soft delete — mesajın kaydı kalır, içeriği temizlenir
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
)

// ─── INDEX ────────────────────────────────────────────────────────────────────

// Conversation mesaj listesi — sayfalama
messageSchema.index({ conversation: 1, createdAt: -1 })

// Okunmamış mesajlar (unreadCount güncellemek için)
messageSchema.index({ conversation: 1, isRead: 1, sender: 1 })

const Message = mongoose.model<IMessage>('Message', messageSchema)
export default Message