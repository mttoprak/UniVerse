import { Request, Response } from "express"
import { z } from "zod"
import bcrypt from "bcryptjs"
import mongoose from "mongoose"
import User from "../models/User"
import { Listing } from "../models/Listing"
import {
    updateUserSchema,
    addToSavedSchema,
    removeFromSavedSchema
} from "../validators/user.validator"

// ─── 1. PROFILE UPDATE ────────────────────────────────────────────────────
// PATCH /api/user/me
// Kullanıcının hesap ayarlarındaki alanları günceller.

export const updateUser = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = updateUserSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const { username, name, surname, email, birthdate, telephone,
            // profile_photo,
            university, password } = parsed.data

        const currentUser = await User.findById(req.userId)
        if (!currentUser) return res.status(404).json({ error: "User not found" })

        // Unique alan çakışma kontrolleri (kendi dışındaki kullanıcılarda ara)
        if (username) {
            const conflict = await User.findOne({ username, _id: { $ne: req.userId } })
            if (conflict) return res.status(409).json({ error: "This username is already taken" })
        }

        if (email) {
            if (currentUser.auth_provider !== "local") {
                return res.status(403).json({ error: "You cannot change your email via this method" })
            }
            const conflict = await User.findOne({ email, _id: { $ne: req.userId } })
            if (conflict) return res.status(409).json({ error: "This email is already taken" })
        }

        if (telephone) {
            const conflict = await User.findOne({ telephone, _id: { $ne: req.userId } })
            if (conflict) return res.status(409).json({ error: "This phone number is already in use" })
        }

        const updateData: Record<string, any> = {}
        if (username      !== undefined) updateData.username      = username
        if (name          !== undefined) updateData.name          = name
        if (surname       !== undefined) updateData.surname       = surname
        if (email         !== undefined) updateData.email         = email
        if (birthdate     !== undefined) updateData.birthdate     = birthdate
        if (telephone     !== undefined) updateData.telephone     = telephone
        // if (profile_photo !== undefined) updateData.profile_photo = profile_photo
        if (university    !== undefined) updateData.university    = university

        if (password) {
            updateData.password = await bcrypt.hash(password, 12)
        }

        const user = await User.findByIdAndUpdate(req.userId, updateData, { new: true })
            .select("-password -googleId")

        if (!user) return res.status(404).json({ error: "User not found" })

        return res.status(200).json({ user })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── 2. GET FAVORITE LISTINGS ─────────────────────────────────────────────
// GET /api/user/me/favorites
// Kullanıcının favorite_listings array'indeki ilanları populate ederek döner.

export const getFavoriteListings = async (req: Request, res: Response): Promise<any> => {
    try {
        const user = await User.findById(req.userId).select("favorite_listings")
        if (!user) return res.status(404).json({ error: "User not found" })

        const listings = await Listing.find({
            _id: { $in: user.favorite_listings },
            status: "active",
        }).populate("owner", "username profile_photo")

        return res.status(200).json({ listings })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── 3. TOGGLE FAVORITE ───────────────────────────────────────────────────
// POST /api/user/me/favorites/:listingId
// İlan zaten favorilerdeyse çıkarır, yoksa ekler. save_count da güncellenir.

export const toggleFavorite = async (req: Request, res: Response): Promise<any> => {
    try {
        const { listingId } = req.params

        if (!/^[0-9a-fA-F]{24}$/.test(listingId as string)) {
            return res.status(400).json({ error: "Invalid listing ID" })
        }

        const listing = await Listing.findById(listingId)
        if (!listing) return res.status(404).json({ error: "Listing not found" })

        const user = await User.findById(req.userId).select("favorite_listings")
        if (!user) return res.status(404).json({ error: "User not found" })

        const alreadyFavorited = user.favorite_listings.some(
            (id: any) => id.toString() === listingId
        )

        let updatedUser
        if (alreadyFavorited) {
            updatedUser = await User.findByIdAndUpdate(
                req.userId,
                { $pull: { favorite_listings: listingId } },
                { new: true }
            ).select("favorite_listings")
            await Listing.findByIdAndUpdate(listingId, { $inc: { save_count: -1 } })
        } else {
            updatedUser = await User.findByIdAndUpdate(
                req.userId,
                { $addToSet: { favorite_listings: listingId } },
                { new: true }
            ).select("favorite_listings")
            await Listing.findByIdAndUpdate(listingId, { $inc: { save_count: 1 } })
        }

        return res.status(200).json({
            favorited: !alreadyFavorited,
            favorite_listings: updatedUser?.favorite_listings,
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── 4. GET ALL SAVED LISTINGS ────────────────────────────────────────────
// GET /api/user/me/saved
// Kullanıcının tüm saved_listings map'ini populate ederek döner.
// Dönen format: { saved_listings: { "Liste Adı": [listing, ...], ... } }

export const getSavedListings = async (req: Request, res: Response): Promise<any> => {
    try {
        const user = await User.findById(req.userId).select("saved_listings")
        if (!user) return res.status(404).json({ error: "User not found" })

        if (!user.saved_listings || user.saved_listings.size === 0) {
            return res.status(200).json({ saved_listings: {} })
        }

        const result: Record<string, any[]> = {}

        for (const [listName, listingIds] of user.saved_listings.entries()) {
            result[listName] = await Listing.find({
                _id: { $in: listingIds },
                status: "active",
            }).populate("owner", "username profile_photo")
        }

        return res.status(200).json({ saved_listings: result })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── 5. ADD TO SAVED LIST ─────────────────────────────────────────────────
// POST /api/user/me/saved
// Body: { listingId, listName }
// listName yoksa yeni liste açar. İlan o listede zaten varsa çıkarır (toggle).
// Frontend'den liste adı gelir — bu sayede kullanıcı kendi listelerini isimlendirir.

export const addToSaved = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = addToSavedSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const { listingId, listName } = parsed.data

        const listing = await Listing.findById(listingId)
        if (!listing) return res.status(404).json({ error: "Listing not found" })

        const user = await User.findById(req.userId)
        if (!user) return res.status(404).json({ error: "User not found" })

        if (!user.saved_listings) user.saved_listings = new Map()

        const existingList: mongoose.Types.ObjectId[] = (user.saved_listings.get(listName) as any) || []

        const alreadyInList = existingList.some(
            (id: any) => id.toString() === listingId
        )

        if (alreadyInList) {
            // Toggle: listeden çıkar
            const updatedList = existingList.filter(
                (id: any) => id.toString() !== listingId
            )
            if (updatedList.length === 0) {
                user.saved_listings.delete(listName)   // Liste boşaldıysa tamamen sil
            } else {
                user.saved_listings.set(listName, updatedList as any)
            }
        } else {
            // Listeye ekle (yeni liste adı verilmişse otomatik oluşur)
            user.saved_listings.set(listName, [...existingList, listingId] as any)
        }

        // Map değişikliği Mongoose tarafından otomatik algılanmaz
        user.markModified("saved_listings")
        await user.save()

        // Map'i plain object'e çevirerek dön
        const savedAsObject = Object.fromEntries(user.saved_listings)

        return res.status(200).json({
            saved: !alreadyInList,
            listName,
            saved_listings: savedAsObject,
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── 5b. REMOVE FROM SAVED LIST ───────────────────────────────────────────
// DELETE /api/user/me/saved
// Body: { listingId, listName }
// Belirli bir listeden bir ilanı kaldırır. Liste boşalırsa silinir.

export const removeFromSaved = async (req: Request, res: Response): Promise<any> => {
    try {
        const parsed = removeFromSavedSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({ errors: z.treeifyError(parsed.error) })
        }

        const { listingId, listName } = parsed.data

        const user = await User.findById(req.userId)
        if (!user) return res.status(404).json({ error: "User not found" })

        if (!user.saved_listings?.has(listName)) {
            return res.status(404).json({ error: "List not found" })
        }

        const existingList: any[] = (user.saved_listings.get(listName) as any) || []
        const updatedList = existingList.filter((id: any) => id.toString() !== listingId)

        if (updatedList.length === 0) {
            user.saved_listings.delete(listName)
        } else {
            user.saved_listings.set(listName, updatedList)
        }

        user.markModified("saved_listings")
        await user.save()

        return res.status(200).json({
            removed: true,
            listName,
            saved_listings: Object.fromEntries(user.saved_listings),
        })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── 6. GET PUBLIC PROFILE ────────────────────────────────────────────────
// GET /api/user/:id
// Başka bir kullanıcının herkese açık profil bilgilerini döner.
// Kritik alanlar (password, email, phone vb.) gizlenir.

export const getPublicProfile = async (req: Request, res: Response): Promise<any> => {
    try {
        const { id } = req.params

        if (!/^[0-9a-fA-F]{24}$/.test(id as string)) {
            return res.status(400).json({ error: "Invalid user ID" })
        }

        const user = await User.findById(id).select(
            "username name surname profile_photo university rating_sum rating_count createdAt"
        )

        if (!user) return res.status(404).json({ error: "User not found" })

        // O kullanıcının aktif ilan sayısını da döndür (profil kartı için faydalı)
        const listingCount = await Listing.countDocuments({ owner: id, status: "active" })

        return res.status(200).json({ user, listing_count: listingCount })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: "Server error" })
    }
}

// ─── 7. GET PUBLIC PROFILE BY USERNAME ────────────────────────────────────
// GET /api/user/username/:username
// Kullanıcının username'ine göre herkese açık profil bilgilerini döner.

export const getPublicProfileByUsername = async (req: Request, res: Response): Promise<any> => {
    try {
        const { username } = req.params

        if (!username) {
            return res.status(400).json({ error: "Username is required" })
        }

        const user = await User.findOne({ username }).select(
            "username name surname profile_photo university rating_sum rating_count createdAt"
        )

        if (!user) return res.status(404).json({ error: "User not found" })

        const listingCount = await Listing.countDocuments({ owner: user._id, status: "active" })

        return res.status(200).json({ user, listing_count: listingCount })
    } catch (e) {
        console.error(e)
        return res.status(500).json({ error: "Server error" })
    }
}
