import { Router } from "express"
import { register, login, completeProfile, getMe } from "../controllers/auth.controller"
import { authMiddleware } from "../middleware/middleware"
import {sendEduVerification, sendVerification, verifyEduMail} from "../controllers/verification.controller";

const router = Router()

// POST /api/auth/sendVerification   → Sending Email verification
router.post("/sendVerification", sendVerification)

// POST /api/auth/sendEduVerification   → Sending Edu-Email verification
router.post("/sendEduVerification", authMiddleware, sendEduVerification)

// POST /api/auth/verifyEduMail   → Verify Edu-Email
router.post("/verifyEduMail", authMiddleware, verifyEduMail)

// POST /api/auth/register          → Register
router.post("/register", register)

// POST /api/auth/login             → Login
router.post("/login", login)

// POST /api/auth/complete-profile  → Register completion (temp-access needed)
router.post("/complete-profile", authMiddleware, completeProfile)

// GET  /api/auth/me                → Get current user profile
router.get("/me", authMiddleware, getMe)

export default router