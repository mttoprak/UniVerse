import { Router } from "express"
import { authMiddleware } from "../middleware/middleware"
import {
    updateUser,
    getFavoriteListings,
    toggleFavorite,
    getSavedListings,
    addToSaved,
    removeFromSaved,
    getPublicProfile,
    getPublicProfileByUsername,
} from "../controllers/user.controller"

const router = Router()

// ─── KENDİ PROFİLİ ────────────────────────────────────────────────────────

// PATCH /api/user/me          → Profil güncelle (isim, şifre, foto vb.)
router.patch("/me", authMiddleware, updateUser)

// ─── FAVORİLER ────────────────────────────────────────────────────────────

// GET  /api/user/me/favorites              → Favori ilanları getir (populate)
router.get("/me/favorites", authMiddleware, getFavoriteListings)

// POST /api/user/me/favorites/:listingId   → Favori ekle/çıkar (toggle)
router.post("/me/favorites/:listingId", authMiddleware, toggleFavorite)

// ─── KAYITLI LİSTELER ─────────────────────────────────────────────────────

// GET    /api/user/me/saved   → Tüm kayıtlı listeleri getir (populate)
router.get("/me/saved", authMiddleware, getSavedListings)

// POST   /api/user/me/saved   → İlanı listeye ekle/çıkar (toggle), liste yoksa oluştur
// Body: { listingId, listName }
router.post("/me/saved", authMiddleware, addToSaved)

// DELETE /api/user/me/saved   → İlanı belirli bir listeden kaldır
// Body: { listingId, listName }
router.delete("/me/saved", authMiddleware, removeFromSaved)

// ─── BAŞKASININ PROFİLİ ───────────────────────────────────────────────────

// GET /api/user/username/:username   → Başka bir kullanıcının username ile public profili
router.get("/username/:username", authMiddleware, getPublicProfileByUsername)

// GET /api/user/:id   → Başka bir kullanıcının id ile public profili
// (Kritik alanlar gizli: password, email, phone vb.)
router.get("/:id", authMiddleware, getPublicProfile)

export default router
