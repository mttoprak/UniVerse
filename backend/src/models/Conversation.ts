import mongoose, { Schema } from 'mongoose'
import { IConversation } from '../types/conversation.types'

const lastMessageSchema = new Schema(
    {
        senderId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
        senderName: { type: String, required: true },
        preview:    { type: String,  default: '' },
        type:       { type: String, enum: ['user', 'system'], default: 'user' },
        sentAt:     { type: Date, required: true },
        isRead:     { type: Boolean, default: false },
    },
    { _id: false }
)

const conversationSchema = new Schema<IConversation>(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            required: [true, 'Listing zorunludur'],
        },
        seller: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Seller zorunludur'],
        },
        buyer: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Buyer zorunludur'],
        },

        lastMessage: {
            type: lastMessageSchema,
            default: null,
        },

        unreadCount: {
            seller: { type: Number, default: 0, min: 0 },
            buyer:  { type: Number, default: 0, min: 0 },
        },

        status: {
            type: String,
            enum: ['active', 'archived', 'blocked'],
            default: 'active',
        },

        // Conversation içindeki aktif (pending) offer referansı.
        // Yeni offer atılmak istenirse önce bu 'No Offer' olmalı.
        offerStatus: {
            type: String,
            enum: ['No Offer', 'Offer Sent', 'Offer Accepted', 'Offer Rejected'],
            default: "No Offer",
        },
    },
    { timestamps: true }
)

// ─── INDEX ────────────────────────────────────────────────────────────────────

// Kullanıcının sohbet listesi (hem seller hem buyer olarak)
conversationSchema.index({ seller: 1, updatedAt: -1 })
conversationSchema.index({ buyer:  1, updatedAt: -1 })

// Aynı ilan için aynı iki kişi arasında sadece 1 conversation olsun
conversationSchema.index({ listing: 1, seller: 1, buyer: 1 }, { unique: true })

// Bir ilana ait tüm sohbetler (satıcı paneli)
conversationSchema.index({ listing: 1, updatedAt: -1 })

const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema)
export default Conversation