import { Request, Response } from "express"
import { z } from "zod";
import bcrypt from "bcryptjs"
import User from "../models/User"
import { signAccessToken, signTempToken } from "../utils/token.utils"
import { localRegisterSchema, loginSchema, completeProfileSchema } from "../validators/auth.validator"
import { OAuth2Client } from "google-auth-library"
import PendingVerification from "../models/PendingVerification";


// ─── LOCAL REGISTER ────────────────────────────────────────────
export const register = async (req: Request, res: Response) => {
    try {
        // 1. Validation with Zod
        const parsed = localRegisterSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed.error)
            });
        }

        const { email, password, name, surname, account_type, code } = parsed.data

        const verification= await PendingVerification.findOne({email})
        if (!verification) {
            return res.status(400).json({error: "There is no verification"})
        }

        const comparization = bcrypt.compare(code, verification.code);
        if (!comparization) {
            return res.status(400).json({error: "Wrong verification code"})
        }


        // 2. Is this email taken?
        const existing = await User.findOne({ email })
        if (existing) {
            return res.status(409).json({ error: "This email already in use" })
        }

        //

        // 3. Hashing the password and Creating the user
        const hashed = await bcrypt.hash(password, 12)
        const user = await User.create({
            email,
            password: hashed,
            name,
            surname,
            account_type,
            auth_provider: "local",
            is_complete: false,
            // is_verified: false,
        })

        // 4. Giving user a temp-access for complete profile
        const tempToken = signTempToken(user._id.toString())
        return res.status(201).json({ tempToken })

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── LOCAL LOGIN ───────────────────────────────────────────────
export const login = async (req: Request, res: Response) => {
    try {
        // 1. Validation with Zod
        const parsed = loginSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed.error)
            });
        }

        const { email, password } = parsed.data

        // 2. Is there any user ? (with using email)
        const user = await User.findOne({ email })
        if (!user || !user.password) {
            return res.status(401).json({ error: "Username or password is incorrect" })
            //this two errors have to have exact same message
        }

        // 3. Is the password correct?
        const isMatch = await bcrypt.compare(password, user.password)
        if (!isMatch) {
            return res.status(401).json({ error: "Username or password is incorrect" })
            //this two errors have to have exact same message
        }

        // 4. Is user banned?
        if (user.is_banned) {
            return res.status(403).json({ error: "Your account has been banned" })
        }

        // 5. If this profile isn't completed give temp-access
        if (!user.is_complete) {
            const tempToken = signTempToken(user._id.toString())
            return res.status(200).json({ tempToken, is_complete: false })
        }

        // 6. Everything is right. So we give full-access
        const accessToken = signAccessToken(user._id.toString())
        return res.status(200).json({ accessToken, is_complete: true })

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── COMPLETE PROFILE ──────────────────────────────────────────
export const completeProfile = async (req: Request, res: Response) => {
    try {
        // 1. Validation with Zod
        const parsed = completeProfileSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed.error)
            });
        }

        const { username, edu_email, telephone, birthdate, password, university } = parsed.data

        // 2. Is username taken?
        if (username) {
            const existingUsername = await User.findOne({ username })
            if (existingUsername) {
                return res.status(409).json({ error: "This username already in use" })
            }
        }

        // 3. Is edu email taken?
        if (edu_email) {
            const existingEduEmail = await User.findOne({ edu_email })
            if (existingEduEmail) {
                return res.status(409).json({ error: "This edu email already in use" })
            }
        }

        // 4. Getting ready for the update in profile
        const updateData: Record<string, any> = {
            username,
            edu_email,
            telephone,
            university,
            birthdate: birthdate ? new Date(birthdate) : undefined,
            is_complete: true,
        }

        // 5. Users who register with google to add password
        if (password) {
            updateData.password = await bcrypt.hash(password, 12)
        }

        // 6. Update
        await User.findByIdAndUpdate(req.userId, updateData)

        // 7. Grant full access
        const accessToken = signAccessToken(req.userId!)
        return res.status(200).json({ accessToken })

    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── GET ME ──────────────────────
export const getMe = async (req: Request, res: Response) => {
    try {
        const user = await User.findById(req.userId).select("-password -googleId")
        if (!user) return res.status(404).json({ error: "User not found" })
        return res.status(200).json(user)
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" })    }
}