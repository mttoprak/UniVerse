import mongoose, { Schema } from 'mongoose'
import { IOffer } from '../types/offer.types'

const offerSchema = new Schema<IOffer>(
    {
        listing: {
            type: Schema.Types.ObjectId,
            ref: 'Listing',
            required: [true, 'Listing is required'],
        },

        applicant: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Applicant is required'],
        },

        // null → job/scholarship direkt başvurusu
        // dolu → marketplace conversation içi teklif
        conversation: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            default: null,
        },

        price: {
            type: Number,
            min: 0,
            default: null,
        },

        pricePer: {
          type: String,
          enum: ['One Time', 'Per Month', 'Per Session' ],
          default: 'One Time'
        },

        note: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: null,
        },

        status: {
            type: String,
            enum: ['Pending', 'Accepted', 'Rejected', 'Cancelled'],
            default: 'Pending',
        },

        expiresAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
)

// ─── INDEX ────────────────────────────────────────────────────────────────────

// İlana gelen tüm başvurular (job/scholarship panel)
offerSchema.index({ listing: 1, status: 1, createdAt: -1 })

// Conversation içindeki offer geçmişi
offerSchema.index({ conversation: 1, createdAt: -1 })

// Bir kullanıcının yaptığı başvurular
offerSchema.index({ applicant: 1, createdAt: -1 })

// Bir conversation'da sadece 1 adet 'pending' offer olabilir.
// Bu kontrolü model seviyesinde değil, controller seviyesinde yapıyoruz
// (activeOffer alanı üzerinden). Yine de hız için index'i ekledik.
offerSchema.index({ conversation: 1, status: 1 })

const Offer = mongoose.model<IOffer>('Offer', offerSchema)
export default Offer