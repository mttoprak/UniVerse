import { Router } from "express"
import {authMiddleware, studentOnly} from "../middleware/middleware"
// import {
//     updateUser,
//     getFavoriteListings,
//     toggleFavorite,
//     getSavedListings,
//     addToSaved,
//     removeFromSaved,
//     getPublicProfile,
//     getPublicProfileByUsername,
// } from "../controllers/user.controller"
import * as UC from '../controllers/user.controller'

import {sendEduVerification, verifyEduMail} from "../controllers/verification.controller";

const router = Router()

// ─── KENDİ PROFİLİ ────────────────────────────────────────────────────────

// PATCH /api/user/me          → Profil güncelle (isim, şifre, foto vb.)
router.patch("/me",                     authMiddleware,              UC.updateUser)

// ─── FAVORİLER ────────────────────────────────────────────────────────────

// GET  /api/user/me/favorites              → Favori ilanları getir (populate)
router.get("/me/favorites",             authMiddleware, studentOnly, UC.getFavoriteListings)

// POST /api/user/me/favorites/:listingId   → Favori ekle/çıkar (toggle)
router.post("/me/favorites/:listingId", authMiddleware, studentOnly, UC.toggleFavorite)

// ─── KAYITLI LİSTELER ─────────────────────────────────────────────────────

// GET    /api/user/me/saved   → Tüm kayıtlı listeleri getir (populate)
router.get("/me/saved",                 authMiddleware, studentOnly, UC.getSavedListings)

// POST   /api/user/me/saved   → İlanı listeye ekle/çıkar (toggle), liste yoksa oluştur
// Body: { listingId, listName }
router.post("/me/saved",                authMiddleware, studentOnly, UC.addToSaved)

// DELETE /api/user/me/saved   → İlanı belirli bir listeden kaldır
// Body: { listingId, listName }
router.delete("/me/saved",              authMiddleware, studentOnly, UC.removeFromSaved)

// ─── BAŞKASININ PROFİLİ ───────────────────────────────────────────────────

// GET /api/user/username/:username   → Başka bir kullanıcının username ile public profili
router.get("/username/:username",       authMiddleware,              UC.getPublicProfileByUsername)

// GET /api/user/:id   → Başka bir kullanıcının id ile public profili
router.get("/:id",                      authMiddleware,              UC.getPublicProfile)

// ─── EDU MAIL VERIFICATION ────────────────────────────────────────────────

// POST /api/user/sendEduVerification   → Sending Edu-Email verification
router.post("/sendEduVerification",     authMiddleware, studentOnly, sendEduVerification)

// POST /api/user/verifyEduMail   → Verify Edu-Email
router.post("/verifyEduMail",           authMiddleware, studentOnly, verifyEduMail)

export default router
