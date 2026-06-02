import { Document, Types } from 'mongoose'

// 'user'   → normal kullanıcı mesajı  (text / photo / location / offer karışık olabilir)
// 'system' → otomatik sistem mesajı   ("Offer kabul edildi 🎉", "Sohbet başlatıldı" vb.)
export type MessageContentType = 'user' | 'system'

export interface IMessage extends Document {
    _id: Types.ObjectId

    conversation: Types.ObjectId
    sender:       Types.ObjectId

    type: MessageContentType

    // İçerik alanları — 'user' mesajında en az biri dolu olmalı
    // Aynı mesajda text + photos + location + offer birlikte gönderilebilir
    text:     string | null
    photos:   string[]         // Cloudinary URL'leri, max 5
    location: string | null    // Google Maps URL
    offer:    Types.ObjectId | null

    // Durum
    isRead:    boolean
    readAt:    Date | null
    isDeleted: boolean          // soft delete — içerik silinir, kaydı kalır

    createdAt: Date
    updatedAt: Date
}