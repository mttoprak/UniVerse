import { Router } from "express"
// import { register, login, completeProfile, getMe, forgotPassword, verifyResetCode, resetPassword } from "../controllers/auth.controller"
import * as AC from '../controllers/auth.controller'
import { authMiddleware } from "../middleware/middleware"
import { sendVerification} from "../controllers/verification.controller";

const router = Router()

// POST /api/auth/sendVerification                          → Sending Email verification
router.post("/sendVerification",                    sendVerification)

// POST /api/auth/register                                  → Register
router.post("/register",                            AC.register)

// POST /api/auth/login                                     → Login
router.post("/login",                               AC.login)

// POST /api/auth/forgot-password                           -> Request password reset
router.post("/forgot-password",                     AC.forgotPassword)

// POST /api/auth/verify-reset-code                         -> Verify the code
router.post("/verify-reset-code",                   AC.verifyResetCode)

// POST /api/auth/reset-password                            -> Reset password & login
router.post("/reset-password",                      AC.resetPassword)

// POST /api/auth/complete-profile                          → Register completion (temp-access needed)
router.post("/complete-profile", authMiddleware,    AC.completeProfile)

// GET  /api/auth/me                                        → Get current user profile
router.get("/me",                authMiddleware,    AC.getMe)

export default router