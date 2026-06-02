import { z } from "zod"

// Job / Scholarship direkt başvuru
export const applySchema = z.object({
    listingId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    note:      z.string().trim().max(1000).optional(),
})

// Marketplace conversation içi fiyat teklifi
export const makeOfferSchema = z.object({
    conversationId: z.string().regex(/^[0-9a-fA-F]{24}$/),
    price:          z.coerce.number().min(0),
    pricePer:       z.enum(['One Time', 'Per Month', 'Per Session']).optional().default('One Time'),
    note:           z.string().trim().max(1000).optional(),
})

export const respondToOfferSchema = z.object({
    action: z.enum(["accepted", "rejected"],"Geçersiz işlem. accept veya reject gönderin.")

})