import { Router } from "express"
import { register, login, completeProfile, getMe } from "../controllers/auth.controller"
import { authMiddleware } from "../middleware/middleware"

const router = Router()

// POST /api/auth/register          → Register
router.post("/register", register)

// POST /api/auth/login             → Login
router.post("/login", login)

// POST /api/auth/complete-profile  → Register completion (temp-access needed)
router.post("/complete-profile", authMiddleware, completeProfile)

// GET  /api/auth/me                → Get current user profile
router.get("/me", authMiddleware, getMe)

export default router