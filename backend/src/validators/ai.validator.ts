import { z } from "zod"

// ─── CHAT INPUT ──────────────────────────────────────────────────────────────
export const askAIChatSchema = z.object({
    message:          z.string().min(1),
    aiConversationId: z.string().uuid().nullish(),
    title:            z.boolean().optional(),
})

// ─── SEARCH LISTINGS ─────────────────────────────────────────────────────────
export const searchListingsSchema = z.object({
    query: z.string().optional().describe(
        "Free-text keywords to match against listing titles and descriptions. These fields are written in TURKISH by users, so always translate the search intent into Turkish keywords before calling, regardless of what language the user wrote in. Optional — a pure category browse (no keyword) is valid."
    ),
    categories: z.array(z.enum([
        "textbooks_and_notes", "electronics", "dorm_and_housing",
        "kitchenware", "department_materials", "transportation",
        "clothing", "hobbies_and_gaming", "other",
    ])).optional().describe(
        "One or more secondhand listing categories. Pass these EXACT English values — never translate them. Only applies when type is 'secondhand'; omit for other listing types. Pass multiple values if the user's need could span more than one category (e.g. dorm setup → dorm_and_housing + kitchenware)."
    ),
    type: z.enum([
        "secondhand", "roommate", "carpooling", "course",
        "job", "scholarship", "urgent", "note",
    ]).optional().describe(
        "The kind of listing to search. English values only, never translated. 'categories' only applies when type is 'secondhand'."
    ),
    condition: z.enum(["new", "like_new", "good", "fair"]).optional().describe(
        "Item condition filter. Only relevant for secondhand listings."
    ),
    minPrice: z.number().min(0).optional().describe(
        "Minimum price in Turkish lira (TRY)."
    ),
    maxPrice: z.number().min(0).optional().describe(
        "Maximum price in Turkish lira (TRY)."
    ),
    limit: z.number().int().min(1).max(10).default(8).describe(
        "Maximum number of listings to return (1-10, default 8)."
    ),
})

// ─── GET SINGLE LISTING ──────────────────────────────────────────────────────
export const getListingSchema = z.object({
    id: z.string().uuid().describe(
        "The exact unique identifier of the listing to retrieve. Only use IDs that actually appeared in a prior search result or tool call in this conversation — never guess or invent one."
    ),
})

export const presentListingsSchema = z.object({
    listings: z.array(
        z.object({
            id: z.uuid().describe(
                "The exact unique identifier of a listing to show the user. Only use IDs that actually appeared in a prior search_listings or get_listing result in this conversation — never guess or invent one."
            ),
            note: z.string().max(200).optional().describe(
                "A short, optional note about why this specific listing fits the user's need (e.g. 'oyunlar için ideal'). Shown alongside this listing's card."
            ),
        })
    ).min(1).describe(
        "The listings to present to the user, in the order they should be displayed. The most relevant should come first."
    ),
    messageBefore: z.string().describe(
        "The message text shown ABOVE the listing cards. Introduce what you found here."
    ),
    messageAfter: z.string().optional().describe(
        "Optional message text shown BELOW the listing cards, e.g. a recommendation or follow-up question."
    ),
})

export const presentComparisonSchema = z.object({
    listings: z.array(
        z.object({
            id: z.uuid().describe(
                "The exact unique identifier of a listing. Only use IDs that appeared in a prior search_listings or get_listing result — never invent one."
            ),
            note: z.string().max(200).optional().describe(
                "Optional short note about this listing, shown on its card."
            ),
        })
    ).min(2).max(4).describe(
        "The 2–4 listings being compared, in display order."
    ),

    attributes: z.array(
        z.object({
            label: z.string().describe(
                "The attribute being compared on this row (e.g. 'Fiyat', 'Durum', 'Ekran', 'Satıcı Puanı')."
            ),
            values: z.array(
                z.object({
                    listingId: z.uuid().describe("Which listing this value belongs to."),
                    value: z.string().describe("The value for this listing (e.g. '6500 TL', 'iyi', '6.1 inç')."),
                    isBest: z.boolean().describe(
                        "True if this listing is best on THIS attribute. If listings are equal on this attribute, set false for all of them (neutral)."
                    ),
                })
            ).describe("One entry per compared listing for this attribute."),
        })
    ).optional().describe(
        "Optional per-attribute comparison rows. Include ONLY when the listings are directly comparable (same product type). Leave empty/omit when items aren't comparable (e.g. a laptop vs a phone) — in that case rely on 'comment' for advisory guidance."
    ),

    comment: z.string().describe(
        "Your overall guidance. In table mode: a brief tradeoff summary. In advisory mode (no attributes): the main pros/cons and a needs-based recommendation."
    ),

    assumptionNote: z.string().optional().describe(
        "State any assumption you made, e.g. 'Orijinal PS4 varsaydım' when web specs required guessing the exact model."
    ),
});

export function extractListingIds(message: string): string[] {
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
    const matches = message.match(uuidRegex);
    if (!matches) return [];
    return [...new Set(matches)];   // dedupe
}
