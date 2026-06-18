import { z } from 'zod'

// ─── BASE ──────────────────────────────────────────────────────────────────

const baseListingSchema = z.object({
    title:       z.string().trim().min(3).max(100),
    description: z.string().min(10).max(2000),
    location:    z.string().min(2),
    expires:     z.coerce.number().pipe(z.union([z.literal(1), z.literal(6), z.literal(12), z.literal(24)])).optional(),
    price:       z.coerce.number().min(0).default(0),
    features: z.record(// ürünün hizmetin özellikleri burda
        z.string().trim().min(1).max(500), // Key'ler boşluktan arındırılsın ve en az 1 karakter olsun
        z.string().trim().min(1).max(500) // Value'lar boşluktan arındırılsın, en az 1, en fazla 500 karakter olsun
    ).optional(),
    criteria: z.record( // listing sahibinin kriterleri olabilir
        z.string().trim().min(1).max(500), // Key'ler boşluktan arındırılsın ve en az 1 karakter olsun
        z.string().trim().min(1).max(500) // Value'lar boşluktan arındırılsın, en az 1, en fazla 500 karakter olsun
    ).optional(),

    photos: z.array(z.string().url()).optional()

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
    smoking_allowed:   z.string().optional(),
    pet_friendly:      z.string().optional(),
    gender_preference: z.string().optional(),
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

const urgentSchema = baseListingSchema.extend({
    type:            z.literal('urgent'),
})

const noteSchema = baseListingSchema.extend({
    type:            z.literal('note'),
    lecture:         z.string()
})

// ─── UNION ─────────────────────────────────────────────────────────────────

export const createListingSchema = z.discriminatedUnion('type', [
    secondhandSchema,
    roommateSchema,
    carpoolingSchema,
    courseSchema,
    jobSchema,
    scholarshipSchema,
    urgentSchema,
    noteSchema,])

// ─── UPDATE (tüm alanlar optional) ─────────────────────────────────────────

export const updateListingSchema = z.object({
    title:       z.string().trim().min(3).max(100).optional(),
    description: z.string().min(10).max(2000).optional(),
    location:    z.string().min(2).optional(),
    price:       z.coerce.number().min(0).optional(),
    expires:     z.coerce.number().pipe(z.union([z.literal(1), z.literal(6), z.literal(12), z.literal(24)])).optional(),
    status:      z.enum(['active', 'sold', 'closed', 'expired']).optional(),
    retainedPhotos: z.any().optional(),
    orderedPhotos: z.any().optional(),
    features: z.record(
        z.string().trim().min(1),
        z.string().trim().min(1).max(500)
    ).optional(),

    photos:      z.array(z.string().url()).optional(),
    // type değiştirilemez — discriminator sabit kalır
}); // Dikkat: .superRefine() bloğunu tamamen sildik!

export const listingSchemasMap = {
    secondhand: secondhandSchema,
    roommate: roommateSchema,
    carpooling: carpoolingSchema,
    course: courseSchema,
    job: jobSchema,
    scholarship: scholarshipSchema,
    urgent: urgentSchema,
    note: noteSchema,
};

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type CreateListingInput = z.infer<typeof createListingSchema>