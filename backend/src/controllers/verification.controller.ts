import User from "../models/User"
import {Request, Response} from "express";
import { z } from "zod";
import bcrypt from "bcryptjs"
import {localRegisterSchema, localRegisterValidationSchema, sendVerificationSchema} from "../validators/auth.validator";
import PendingVerification from "../models/PendingVerification";
import {sendVerificationEmail} from "../utils/mail.utils";


const generateCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString()

export const sendVerification  = async (req: Request, res: Response) => {

    try {

        const parsed1 = localRegisterValidationSchema.safeParse(req.body)
        if (!parsed1.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed1.error)
            });
        }

        const parsed = sendVerificationSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed.error)
            })
        }

        const { email } = parsed.data

        const code = generateCode()
        const hashedCode = await bcrypt.hash(code, 10)
        const expires = new Date(Date.now() + 10 * 60 * 1000) // +10 minutes

        await PendingVerification.findOneAndUpdate(
            { email },
            { code: hashedCode, expires },
            { upsert: true, new: true }
        )

        const data=sendVerificationEmail(email, code)

        console.log(`[DEV] Verification code for ${email}: ${code}. ${data} `)

        return res.status(200).json({ message: "Verification code sent" })

    }catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" })
    }

}