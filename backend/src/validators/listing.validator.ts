import { z } from 'zod'

// ─── BASE ──────────────────────────────────────────────────────────────────

const baseListingSchema = z.object({
    title:       z.string().trim().min(3).max(100),
    description: z.string().min(10).max(2000),
    location:    z.string().min(2),
    expires:     z.coerce.number().pipe(z.union([z.literal(1), z.literal(6), z.literal(12), z.literal(24)])).optional(),
    price:       z.coerce.number().min(0).default(0),
    is_urgent:   z.coerce.boolean().default(false),
    features: z.record(
        z.string().trim().min(1), // Key'ler boşluktan arındırılsın ve en az 1 karakter olsun
        z.string().trim().min(1).max(500) // Value'lar boşluktan arındırılsın, en az 1, en fazla 500 karakter olsun
    ).optional()

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
    smoking_allowed:   z.string().default('Not allowed'),
    pet_friendly:      z.string().default('No'),
    gender_preference: z.string().default('No preference'),
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
    scholarshipSchema,]).superRefine((data, ctx) => {
    // 1. Acil (is_urgent: true) ise expires zorunlu olmalı
    if (data.is_urgent && !data.expires) {
        ctx.addIssue({
            code: "custom",
            message: "İlan acil olduğunda bir geçerlilik süresi (expires) seçilmelidir.",
            path: ["expires"],
        });
    }

    // 2. Acil değilse (is_urgent: false) ve expires gönderilmişse hata fırlat
    if (!data.is_urgent && data.expires) {
        ctx.addIssue({
            code: "custom",
            message: "Normal ilanlar için geçerlilik süresi (expires) belirlenemez.",
            path: ["expires"],
        });
    }
});

// ─── UPDATE (tüm alanlar optional) ─────────────────────────────────────────

export const updateListingSchema = z.object({
    title:       z.string().trim().min(3).max(100).optional(),
    description: z.string().min(10).max(2000).optional(),
    location:    z.string().min(2).optional(),
    price:       z.coerce.number().min(0).optional(),
    is_urgent:   z.coerce.boolean().optional(),
    expires:     z.coerce.number().pipe(z.union([z.literal(1), z.literal(6), z.literal(12), z.literal(24)])).optional(),
    status:      z.enum(['active', 'sold', 'closed', 'expired']).optional(),
    retainedPhotos: z.any().optional(), // Frontend'den array, JSON veya string olarak gelebilir
    orderedPhotos: z.any().optional(), // Frontend'den sıralama listesi JSON string veya array olarak gelebilir
    features: z.record(
        z.string().trim().min(1),
        z.string().trim().min(1).max(500)
    ).optional(),
    // type değiştirilemiz — discriminator sabit kalır
}) .superRefine((data, ctx) => {
        // Update esnasında sadece data verildiyse kontrol et
        if (data.is_urgent === true && data.expires === undefined) {
             // Not: Normalde is_urgent true yapılıyorsa ve veritabanında expires yoksa sorun çıkabilir,
             // bu yüzden güncellemede de ikisi beraber yollanmalı.
             ctx.addIssue({
                 code: "custom",
                 message: "İlan acil (urgent) durumuna getiriliyorsa geçerlilik süresi (expires) sağlanmalıdır.",
                 path: ["expires"],
             });
        }
        if (data.is_urgent === false && data.expires !== undefined) {
            ctx.addIssue({
                code: "custom",
                message: "Normal ilanlar için geçerlilik süresi (expires) güncellenemez.",
                path: ["expires"],
            });
        }
    });

// ─── TYPES ──────────────────────────────────────────────────────────────────

export type CreateListingInput = z.infer<typeof createListingSchema>
export type UpdateListingInput = z.infer<typeof updateListingSchema>