import { Router } from "express"
import { register, login, completeProfile, getMe, forgotPassword, verifyResetCode, resetPassword } from "../controllers/auth.controller"
import { authMiddleware } from "../middleware/middleware"
import { sendVerification} from "../controllers/verification.controller";

const router = Router()

// POST /api/auth/sendVerification   → Sending Email verification
router.post("/sendVerification", sendVerification)

// POST /api/auth/register          → Register
router.post("/register", register)

// POST /api/auth/login             → Login
router.post("/login", login)

// POST /api/auth/forgot-password   -> Request password reset
router.post("/forgot-password", forgotPassword)

// POST /api/auth/verify-reset-code -> Verify the code
router.post("/verify-reset-code", verifyResetCode)

// POST /api/auth/reset-password    -> Reset password & login
router.post("/reset-password", resetPassword)

// POST /api/auth/complete-profile  → Register completion (temp-access needed)
router.post("/complete-profile", authMiddleware, completeProfile)

// GET  /api/auth/me                → Get current user profile
router.get("/me", authMiddleware, getMe)

export default router