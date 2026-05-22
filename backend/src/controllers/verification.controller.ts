import User from "../models/User"
import {Request, Response} from "express";
import { z } from "zod";
import bcrypt from "bcryptjs"
import {
    localRegisterSchema,
    localRegisterValidationSchema,
    sendEduVerificationSchema,
    sendVerificationSchema
} from "../validators/auth.validator";
import PendingVerification from "../models/PendingVerification";
import {sendVerificationEduEmail, sendVerificationEmail} from "../utils/mail.utils";


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



export const sendEduVerification  = async (req: Request, res: Response) => {

    try {

        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const edu_email = user.edu_email;
        if (!edu_email) {
            return res.status(400).json({ error: "Edu E-mail not found for this user" });
        }

        const code = generateCode()
        const hashedCode = await bcrypt.hash(code, 10)
        const expires = new Date(Date.now() + 10 * 60 * 1000) // +10 minutes

        await PendingVerification.findOneAndUpdate(
            { email: edu_email },
            { code: hashedCode, expires },
            { upsert: true, new: true }
        )

        const data=sendVerificationEduEmail(edu_email, code)

        console.log(`[DEV] Verification code for ${edu_email}: ${code}. ${data} `)

        return res.status(200).json({ message: "Verification code sent" })

    }catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" })
    }

}


export const verifyEduMail  = async (req: Request, res: Response) => {

    try {

        const parsed = sendEduVerificationSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed.error)
            });
        }

        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const edu_email = user.edu_email;
        if (!edu_email) {
            return res.status(400).json({ error: "Edu E-mail not found for this user" });
        }

        const { code } = parsed.data

        const verification= await PendingVerification.findOne({ email: edu_email })
        if (!verification) {
            return res.status(400).json({error: "There is no verification"})
        }

        const comparization = await bcrypt.compare(code, verification.code);

        if (!comparization) {
            if(process.env.DEVPROCESS == "true" && code==="000000") {
                // Geliştirici ortamı için geçerli
            } else {
                return res.status(400).json({error: "Wrong verification code"});
            }
        }

        user.is_verified = true;
        await user.save();

        await PendingVerification.deleteOne({ email: edu_email });

        return res.status(200).json({ message: "Edu email verified successfully ${edu_email}" });
    }catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Server error" })
}
}