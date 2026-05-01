import mongoose, {Schema} from "mongoose";
import {IPendingVerification} from "../types/pendingVerification.types";

const pendingVerificationSchema = new Schema({
    email: { type: String, required: true },
    code: { type: String, required: true },       // Hashed
    expires: { type: Date, required: true },
}, { timestamps: true })

// TTL index — MongoDB otomatik siler expire olunca
pendingVerificationSchema.index({ expires: 1 }, { expireAfterSeconds: 0 })

// Aynı email için birden fazla pending olmasın
pendingVerificationSchema.index({ email: 1 }, { unique: true })

const PendingVerification =
    mongoose.model<IPendingVerification>("PendingVerification", pendingVerificationSchema)
export default PendingVerification