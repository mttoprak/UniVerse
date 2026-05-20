import { z } from 'zod'

const mongoId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Geçersiz ID formatı')

// ─── CREATE ──────────────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
    listing:  mongoId,
    content:  z.string().trim().min(2, 'At least 2 characters').max(500, 'Maximum 500 characters'),
    rating:   z.number().int().min(1).max(5).optional(),
    parent:   mongoId.optional(),
})
    .superRefine((data, ctx) => {
        // Reply'a rating verilemez — backend de kontrol eder ama erken yakala
        if (data.rating && data.parent) {
            ctx.addIssue({
                code: 'custom',
                path: ['rating'],
                message: 'Points cannot be given to a reply',
            })
        }
    })

// ─── UPDATE ──────────────────────────────────────────────────────────────────

export const updateCommentSchema = z.object({
    content: z.string().trim().min(2).max(500).optional(),
    rating:  z.number().int().min(1).max(5).optional(),
}).refine(data => data.content !== undefined || data.rating !== undefined, {
    message: 'At least 1 data should be updated',
})

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type CreateCommentInput = z.infer<typeof createCommentSchema>
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>