import { Document, Types } from 'mongoose'

export type OfferStatus = 'Pending' | 'Accepted' | 'Rejected' | 'Cancelled'

export type pricePerEnum = 'One Time'| 'Per Month'| 'Per Session'

export interface IOffer extends Document {
    _id: Types.ObjectId

    listing:      Types.ObjectId   // hangi ilan için
    applicant:    Types.ObjectId   // teklif veren / başvuran kişi

    // null  → job / scholarship direkt başvurusu (conversation yok)
    // dolu  → marketplace conversation içi fiyat teklifi
    conversation: Types.ObjectId | null

    price:    number | null   // sadece marketplace offer'larında
    pricePer: pricePerEnum
    note:     string | null   // kapak mektubu / teklif notu

    status:    OfferStatus
    expiresAt: Date | null

    createdAt: Date
    updatedAt: Date
}