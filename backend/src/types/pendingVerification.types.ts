import { Document, Types } from "mongoose"
export interface IPendingVerification extends Document {
    _id: Types.ObjectId

    email:          string
    code:           string
    expires:        Date

    createdAt: Date
    updatedAt: Date
}