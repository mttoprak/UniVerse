// backend/src/validators/comment.validator.ts
import { z } from 'zod';

export const createCommentSchema = z.object({
    listingId: z.string().uuid('Geçersiz ilan ID'),
    content:   z.string().trim().min(1, 'Yorum boş olamaz').max(1000, 'Yorum çok uzun'),
    rating:    z.number().int().min(1).max(5).optional(),
    parentId:  z.string().uuid('Geçersiz ebeveyn yorum ID').optional(),
});

export const updateCommentSchema = z.object({
    content: z.string().trim().min(1, 'Yorum boş olamaz').max(1000, 'Yorum çok uzun').optional(),
    rating:  z.number().int().min(1).max(5).optional(),
}).refine(data => data.content !== undefined || data.rating !== undefined, {
    message: 'Güncellenecek en az bir alan olmalıdır (content veya rating).',
});