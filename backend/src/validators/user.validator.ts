import { z } from "zod"

export const updateUserSchema = z.object({
    username: z.string().min(3).max(20).optional(),
    password:     z.string().min(8),
    name: z.string().min(2).optional(),
    surname: z.string().min(2).optional(),
    birthdate: z.coerce.date().optional(), // coerce converts string "2024-01-01" to Date object
    telephone: z.string().optional(),
    profile_photo: z.string().url().optional(),
    university: z.string().optional(),
});

export const beAStudent = z.object({

})
