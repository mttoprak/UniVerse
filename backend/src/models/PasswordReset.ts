import mongoose, { Schema, Document } from "mongoose";

export interface IPasswordReset extends Document {
    email: string;
    code: string;
    expires: Date;
}

const passwordResetSchema = new Schema({
    email: { type: String, required: true },
    code: { type: String, required: true },       // Hashed
    expires: { type: Date, required: true },
}, { timestamps: true })

// TTL index - MongoDB otomatik siler expire olunca (örneğin 15 dakika)
passwordResetSchema.index({ expires: 1 }, { expireAfterSeconds: 0 })

// Aynı email için birden fazla reset kaydı olmasın diye unique index
passwordResetSchema.index({ email: 1 }, { unique: true })

const PasswordReset = mongoose.model<IPasswordReset>("PasswordReset", passwordResetSchema)
export default PasswordReset;

