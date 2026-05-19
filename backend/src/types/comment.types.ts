import { Document, Types } from 'mongoose'

export interface IComment extends Document {
    _id: Types.ObjectId

    listing:    Types.ObjectId   // hangi ilan üzerinde
    author:     Types.ObjectId   // yorumu yazan
    target:     Types.ObjectId   // ilan sahibi (yorumun hedefi)

    content:    string
    rating:     number | null    // 1-5, sadece top-level commentlerde
    parent:     Types.ObjectId | null  // null ise top-level, dolu ise reply

    // Offer modeli kurulunca controller'a eklenir, burada field gerekmez.
    // hasAgreement() → Offer.exists() ile schema'ya dokunmadan çalışır.

    is_edited:  boolean
    is_deleted: boolean   // reply'ları olan silinmiş commentler için soft delete

    createdAt: Date
    updatedAt: Date
}