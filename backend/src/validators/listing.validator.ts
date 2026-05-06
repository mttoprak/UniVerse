import { z } from 'zod'

// ─── BASE ──────────────────────────────────────────────────────────────────

const baseListingSchema = z.object({
    title:       z.string().trim().min(3).max(100),
    description: z.string().min(10).max(2000),
    location:    z.string().min(2),
    price:       z.coerce.number().min(0).default(0),
    is_urgent:   z.coerce.boolean().default(false),
    // photos: controller'da multer ile gelir, buraya dahil değil
})

// ─── DISCRIMINATORS ────────────────────────────────────────────────────────

const secondhandSchema = baseListingSchema.extend({
    type:        z.literal('secondhand'),
    condition:   z.enum(['new', 'like_new', 'good', 'fair']),
    category:    z.enum([
        'textbooks_and_notes', 'electronics', 'dorm_and_housing',
        'kitchenware', 'department_materials', 'transportation',
        'clothing', 'hobbies_and_gaming', 'other',
    ]),
    subcategory: z.string().trim().optional(),
})

const roommateSchema = baseListingSchema.extend({
    type:              z.literal('roommate'),
    smoking_allowed:   z.enum(['allowed', 'not_allowed', 'balcony_only']).default('not_allowed'),
    pet_friendly:      z.enum(['yes', 'no', 'cats_only', 'small_pets_only']).default('no'),
    gender_preference: z.enum(['female', 'male', 'no_preference']).default('no_preference'),
})

const carpoolingSchema = baseListingSchema.extend({
    type:            z.literal('carpooling'),
    origin:          z.string().min(2),
    destination:     z.string().min(2),
    departure_date:  z.coerce.date().refine(d => d > new Date(), {
        message: 'Departure date must be in the future',
    }),
    available_seats: z.coerce.number().int().min(1).max(8),
})

const courseSchema = baseListingSchema.extend({
    type:    z.literal('course'),
    subject: z.string().min(2),
    format:  z.enum(['online', 'in_person']),
})

const jobSchema = baseListingSchema.extend({
    type:            z.literal('job'),
    application_url: z.string().url().nullable().optional(),
    deadline:        z.coerce.date().nullable().optional(),
})

const scholarshipSchema = baseListingSchema.extend({
    type:            z.literal('scholarship'),
    amount:          z.coerce.number().min(0).nullable().optional(),
    deadline:        z.coerce.date().nullable().optional(),
    application_url: z.string().url().nullable().optional(),
})

// ─── UNION ─────────────────────────────────────────────────────────────────

export const createListingSchema = z.discriminatedUnion('type', [
    secondhandSchema,
    roommateSchema,
    carpoolingSchema,
    courseSchema,
    jobSchema,
    scholarshipSchema,
])

// ─── UPDATE (tüm alanlar optional) ─────────────────────────────────────────

export const updateListingSchema = z.object({
    title:       z.string().trim().min(3).max(100).optional(),
    description: z.string().min(10).max(2000).optional(),
    location:    z.string().min(2).optional(),
    price:       z.coerce.number().min(0).optional(),
    is_urgent:   z.coerce.boolean().optional(),
    status:      z.enum(['active', 'sold', 'closed', 'expired']).optional(),
    retainedPhotos: z.any().optional(), // Frontend'den array, JSON veya string olarak gelebilir
    // type değiştirilemiz — discriminator sabit kalır
})

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type CreateListingInput = z.infer<typeof createListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>