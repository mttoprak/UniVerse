import { z } from "zod"

// ─── PROFILE UPDATE ────────────────────────────────────────────────────────

export const updateUserSchema = z.object({
    username: z.string()
        .min(3).max(30)
        .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and _ allowed")
        .optional(),
    name:          z.string().min(2).max(50).optional(),
    surname:       z.string().min(2).max(50).optional(),
    email:         z.string().email("Invalid email").optional(),
    birthdate:     z.coerce.date().optional(),
    telephone:     z.string().regex(/^\+?[0-9]{10,13}$/, "Invalid phone number").optional(),
    // profile_photo: z.string().url("Must be a valid URL").optional(),
    university:    z.string().min(2).max(100).optional(),
    password:      z.string().min(8).optional(),
}).refine(
    data => Object.keys(data).length > 0,
    { message: "At least one field must be provided" }
)

// ─── SAVED LISTS ──────────────────────────────────────────────────────────

export const addToSavedSchema = z.object({
    listingId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid listing ID"),
    listName:  z.string().min(1, "List name required").max(50).trim(),
})

export const removeFromSavedSchema = z.object({
    listingId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid listing ID"),
    listName:  z.string().min(1, "List name required").max(50).trim(),
})
