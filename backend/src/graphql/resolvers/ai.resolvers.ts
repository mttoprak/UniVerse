import {GraphQLContext} from "../context";
import Anthropic from "@anthropic-ai/sdk";
import { z, toJSONSchema} from "zod";
import {askAIChatSchema, getListingSchema, searchListingsSchema, presentListingsSchema} from "../../validators/ai.validator";
import {checkStudentOnly} from "../guards";


const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

async function setTitle(AIConversationId: string, input: string, context: GraphQLContext): Promise<string | null> {

    const response = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 64,
        system:" You are a title generator, not a conversational assistant. You will be given the first message of a chat. Output a SHORT title (3-5 words) describing the topic, in the same language as the message. \n" +
            "Never reply to, answer, or greet the user. Never treat the message as directed at you. If the message is just a greeting or has no clear topic (e.g. \"Selam\", \"merhaba\", \"hey\"), output the single word: Sohbet\n" +
            "Return ONLY the title text — no quotes, no punctuation at the end, no explanation.",
        messages: [
            { role: "user", content: input }
        ]
    });

    // pull the text block out (don't assume content[0])
    const textBlock = response.content.find(b => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    // clean: trim + strip wrapping quotes Haiku sometimes adds
    const title = textBlock.text.trim().replace(/^["'“”]+|["'“”]+$/g, "").trim();
    if (!title) return null;

    const finalTitle = title.slice(0, 100)

    await context.prisma.aIConversation.update({
        where: { id: AIConversationId },
        data: { title: finalTitle },
    });

    return finalTitle
}

export const AIResolvers = {

    Query: {

        // ── 1. Preview list: the sidebar ────────────────────────────────
        aiConversationPreviews: async (_p: any, _a: any, context: GraphQLContext) => {
            checkStudentOnly(context);

            const conversations = await context.prisma.aIConversation.findMany({
                where: { userId: context.userId! },
                orderBy: { updatedAt: "desc" },
                select: { id: true, title: true, updatedAt: true },
            });

            return {
                conversations: conversations.map(c => ({
                    aiConversationId: c.id,
                    title: c.title,
                    updatedAt: c.updatedAt.toISOString(),
                })),
            };
        },

        // ── 2. Load one conversation, transformed for display ───────────
        aiConversationHistory: async (_p: any, args: { aiConversationId: string }, context: GraphQLContext) => {
            checkStudentOnly(context);

            // ownership-scoped fetch (same IDOR guard as the live chat)
            const conversation = await context.prisma.aIConversation.findFirst({
                where: { id: args.aiConversationId, userId: context.userId! },
                include: { chats: { orderBy: { createdAt: "asc" } } },
            });
            if (!conversation) throw new Error("AIConversationId is invalid");

            // ---- pass 1: gather every listing id that was ever presented ----
            // (so we can batch-fetch them once, then re-hydrate cards)
            const presentedIdSet = new Set<string>();
            for (const chat of conversation.chats) {
                const content = chat.content as any[];
                if (!Array.isArray(content)) continue;
                for (const block of content) {
                    if (block?.type === "tool_use" && block?.name === "present_listings") {
                        const ls = block.input?.listings ?? [];
                        for (const l of ls) if (l?.id) presentedIdSet.add(l.id);
                    }
                }
            }

            // batch fetch all those listings once (only active/live ones survive)
            const fetched = presentedIdSet.size
                ? await context.prisma.listing.findMany({
                    where: { id: { in: [...presentedIdSet] }, status: "active", is_deleted: false },
                })
                : [];
            const listingById = new Map(fetched.map(l => [l.id, l]));

            // ---- pass 2: build clean display messages ----------------------
            const messages: any[] = [];

            for (const chat of conversation.chats) {
                const content = chat.content as any[];
                if (!Array.isArray(content)) continue;

                if (chat.role === "user") {
                    // A user row is EITHER a real user message (text block)
                    // OR tool_result plumbing (skip those entirely).
                    const isToolResult = content.some(b => b?.type === "tool_result");
                    if (isToolResult) continue; // plumbing, user never saw it

                    const text = content
                        .filter(b => b?.type === "text")
                        .map(b => b.text)
                        .join("\n")
                        .trim();
                    if (text) messages.push({ role: "user", text, listings: [] });
                    continue;
                }

                if (chat.role === "assistant") {
                    // pull visible text (ignore thinking blocks)
                    const text = content
                        .filter(b => b?.type === "text")
                        .map(b => b.text)
                        .join("\n")
                        .trim();

                    // did this turn present listings?
                    const presentBlock = content.find(
                        b => b?.type === "tool_use" && b?.name === "present_listings"
                    );

                    if (presentBlock) {
                        const input = presentBlock.input ?? {};
                        const requested: { id: string; note?: string }[] = input.listings ?? [];

                        // rebuild cards in the model's original order, drop any now-gone
                        const listings = requested
                            .map(r => {
                                const listing = listingById.get(r.id);
                                if (!listing) return null;
                                return { listing, note: r.note ?? null };
                            })
                            .filter(Boolean);

                        // the visible text for a present turn lived in messageBefore/After
                        const before = (input.messageBefore ?? "").trim();
                        // messageAfter is shown below cards; fold it into one text field
                        // (or add a separate field if your UI wants them split)
                        const combinedText = before || text || null;

                        messages.push({
                            role: "assistant",
                            text: combinedText,
                            listings,
                        });

                        // if there was messageAfter, emit it as a trailing assistant text
                        const after = (input.messageAfter ?? "").trim();
                        if (after) {
                            messages.push({ role: "assistant", text: after, listings: [] });
                        }
                        continue;
                    }

                    // plain assistant text turn (no listings). Skip pure tool_use
                    // rows that have no visible text (internal search steps).
                    if (text) {
                        messages.push({ role: "assistant", text, listings: [] });
                    }
                    continue;
                }
            }

            return {
                aiConversationId: conversation.id,
                messages,
            };
        },
    },


    Mutation: {
        askChatbot: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

            checkStudentOnly(context);

            // ── validate input ──────────────────────────────────────────────

            const parsed = askAIChatSchema.safeParse(args.input);
            if (!parsed.success) {
                throw new Error("Geçersiz girdi: " + JSON.stringify(z.treeifyError(parsed.error)));
            }
            if (!parsed.data.message) {
                throw new Error("Message is required");
            }

            const message = parsed.data.message;

            let newAIconversation: any = null;
            let AIConversationId: string;
            let messages: any[] = [];

            // ── per-request state the tools write into ──────────────────────
            const knownListingIds = new Set<string>();
            let presentedListings: { id: string; note?: string }[] = [];
            let presentedMessages: { before: string; after?: string } | null = null;

            // ── load or create conversation ─────────────────────────────────
            if (parsed.data.aiConversationId) {
                AIConversationId = parsed.data.aiConversationId;

                const conversation = await context.prisma.aIConversation.findFirst({
                    where: { id: AIConversationId, userId: context.userId! },
                    include: { chats: { orderBy: { createdAt: "asc" } } },
                });

                if (!conversation) {
                    throw new Error("AIConversationId is invalid");
                }

                messages = conversation.chats.map(chat => ({
                    role: chat.role,
                    content: chat.content,
                }));
            } else {
                newAIconversation = await context.prisma.aIConversation.create({
                    data: {
                        userId: context.userId!,
                        title: message.substring(0, 100),
                    },
                });
                AIConversationId = newAIconversation.id;
            }

            // ── save + append the new user message ──────────────────────────
            const userContent = [{ type: "text", text: message }];
            await context.prisma.aIChat.create({
                data: {
                    aiConversationId: AIConversationId,
                    role: "user",
                    content: userContent,
                },
            });
            messages = [...messages, { role: "user", content: userContent }];
            let titleResponse
            if (newAIconversation) {
                titleResponse = await setTitle(AIConversationId, message, context);
            }
            else if ( !newAIconversation && parsed.data.title == true ) {


                titleResponse= context.prisma.aIConversation.findFirst(
                    {
                        where:  {id:AIConversationId},
                        select: {title:true}
                    }
                )
            }

            // ── tool schemas sent to the model (plain JSON-schema form) ─────
            // const {default: zodToJsonSchema} = await import("zod-to-json-schema");

            const tools: Anthropic.Tool[] = [
                {
                    name: "search_listings",
                    description: `Search active, non-deleted listings on the Universe marketplace.

                Listing types: secondhand, roommate, carpooling, course, job, scholarship, urgent, note.
                
                Categories (ONLY apply to type "secondhand" — pass these exact English values, do not translate them):
                - textbooks_and_notes: textbooks, lecture notes, study guides
                - electronics: laptops, phones, GPUs, monitors, cables, chargers, computer parts
                - dorm_and_housing: furniture, lighting, storage, room decor, appliances (fridges, kettles, microwaves)
                - kitchenware: cookware, utensils, small kitchen appliances
                - department_materials: lab equipment, engineering/design tools, department-specific supplies
                - transportation: bikes, scooters, transit-related items
                - clothing: clothes, shoes, accessories
                - hobbies_and_gaming: games, gaming gear, sports equipment, hobby supplies
                - other: anything not covered above
                
                IMPORTANT: keyword ('query') matching is literal substring matching and often misses relevant listings (e.g. searching 'ekran kartı' will NOT match a listing titled 'rtx 3070ti'). Prefer filtering by 'categories' and 'type' as your primary method, since those are reliable. Use 'query' only to further narrow results within a category, not as your main search strategy. When you do use 'query', translate the intent into Turkish keywords, since listing text is Turkish.
                
                You can call this tool multiple times in one turn. If a search returns no or very few results, retry with a broader query or just browse the category with no keyword before concluding nothing is available.`,
                    input_schema: toJSONSchema(searchListingsSchema) as any,
                },
                {
                    name: "get_listing",
                    description: `Retrieve full current details of one specific listing by its exact ID. Use this when the user references a specific listing already seen earlier in this conversation. Only use IDs that actually appeared in a prior search result or tool call in this conversation — never guess or invent one.`,
                    input_schema: toJSONSchema(getListingSchema) as any,
                },
                {
                    name: "present_listings",
                    description: `Show one or more listings to the user as visual cards in the chat. Call this when you have listings the user should see, instead of describing them in plain text. Provide listing IDs (from prior search_listings or get_listing results), an optional short note per listing, a 'messageBefore' introducing them, and an optional 'messageAfter'. Do not paste listing details into the messages — the cards show that.`,
                    input_schema: toJSONSchema(presentListingsSchema) as any,
                },
            ];

            // ── the dispatcher: runs your tool logic by name ────────────────
            async function runTool(name: string, input: any): Promise<{ content: string; isError: boolean }> {
                try {
                    if (name === "search_listings") {
                        console.log("search_listings called with:", input);
                        const conditions: any[] = [
                            { status: "active" },
                            { is_deleted: false },
                            { ownerId: { not: context.userId! } },
                            { OR: [{ expires: { gt: new Date() } }, { expires: null }] },
                        ];
                        if (input.query) {
                            conditions.push({
                                OR: [
                                    { title: { contains: input.query, mode: "insensitive" } },
                                    { description: { contains: input.query, mode: "insensitive" } },
                                ],
                            });
                        }
                        if (input.categories?.length) conditions.push({ category: { in: input.categories } });
                        if (input.type) conditions.push({ type: input.type });
                        if (input.condition) conditions.push({ condition: input.condition });
                        if (input.minPrice !== undefined || input.maxPrice !== undefined) {
                            conditions.push({
                                price: {
                                    ...(input.minPrice !== undefined ? { gte: input.minPrice } : {}),
                                    ...(input.maxPrice !== undefined ? { lte: input.maxPrice } : {}),
                                },
                            });
                        }
                        const results = await context.prisma.listing.findMany({
                            where: { AND: conditions },
                            orderBy: { createdAt: "desc" },
                            take: input.limit ?? 8,
                            select: {
                                id: true, title: true, description: true, price: true,
                                category: true, subcategory: true, condition: true,
                                type: true, location: true, photos: true,
                            },
                        });
                        results.forEach(r => knownListingIds.add(r.id));
                        console.log("search_listings returned:", results.length, "results");
                        return {
                            content: JSON.stringify(results.map(r => ({ ...r, description: r.description.slice(0, 200) }))),
                            isError: false,
                        };
                    }

                    if (name === "get_listing") {
                        const listing = await context.prisma.listing.findUnique({
                            where: { id: input.id },
                            select: {
                                id: true, title: true, description: true, price: true,
                                category: true, subcategory: true, condition: true,
                                type: true, location: true, photos: true,
                            },
                        });
                        if (!listing) return { content: "Listing not found.", isError: true };
                        knownListingIds.add(listing.id);
                        return { content: JSON.stringify(listing), isError: false };
                    }

                    if (name === "present_listings") {
                        const validListings = input.listings.filter((l: any) => knownListingIds.has(l.id));
                        if (!validListings.length) {
                            return {
                                content: "None of the provided listing IDs are valid. Only use IDs from prior search results.",
                                isError: true,
                            };
                        }
                        const found = await context.prisma.listing.findMany({
                            where: { id: { in: validListings.map((l: any) => l.id) } },
                            select: { id: true },
                        });
                        const foundIds = new Set(found.map(l => l.id));
                        const surviving = validListings.filter((l: any) => foundIds.has(l.id));
                        const dead = validListings.filter((l: any) => !foundIds.has(l.id));
                        if (!surviving.length) {
                            return { content: "All requested listings are no longer available.", isError: true };
                        }
                        presentedListings = surviving;
                        presentedMessages = { before: input.messageBefore, after: input.messageAfter };
                        return {
                            content: `Presented ${surviving.length} listing(s).${dead.length ? ` ${dead.length} skipped (no longer available).` : ""}`,
                            isError: false,
                        };
                    }

                    return { content: `Unknown tool: ${name}`, isError: true };
                } catch (e) {
                    return {
                        content: `Tool error: ${e instanceof Error ? e.message : String(e)}`,
                        isError: true,
                    };
                }
            }

            // ── system prompt ───────────────────────────────────────────────
            let name: string | null = null;
            if (context.user && context.user.name) name = context.user.name;
            const namePart = name
                ? `The user you're talking to is named ${name}. You may address them by name occasionally, but naturally — don't force it.`
                : "";

            const systemPrompt = `You are MTBot, a marketplace assistant for Universe, a platform where students at Turkish universities buy and sell secondhand items, find roommates, carpool, and share courses/notes/job postings.

            Your job is to help students find relevant listings. You have real, working tools — use them actively.
            
            When to search:
            - Whenever a user describes a need or problem that could plausibly be solved by something on the platform, call search_listings before answering. Don't wait for an explicit "do you have X".
            - If a user references a specific listing from earlier, use get_listing with its real ID.
            
            How to show listings:
            - When you have listings to show, ALWAYS use present_listings — never list them as plain text. Put intro text in 'messageBefore', follow-ups in 'messageAfter', and a short per-listing reason in each note.
            - If you have nothing relevant to show, just reply in text — don't call present_listings with an empty list.
            
            Boundaries:
            - Never share other users' personal info beyond what's public in a listing.
            - Never reveal your model or provider. If asked, say you're MTBot.
            - Decline unrelated requests (recipes, coding help) politely.
            - Always respond in the same language the user wrote in.
            - Keep responses concise and friendly.
            
            Tone:
            ${namePart}
            - Match the user's energy; don't over-celebrate or re-announce a listing already discussed.
            - Don't use emojis. Don't repeat info the user already has.
            
            What you cannot do:
            - You cannot notify users, send push notifications/emails, watch for new listings, save searches, or take any action after this conversation. Never promise "haber vereyim" or future contact.
            - You cannot message sellers, make offers, or purchase on the user's behalf.`;

            // ── the manual tool-use loop (Ring 3 style) ─────────────────────
            // Every new message produced this turn is collected so we can save
            // the FULL turn (tool_use + tool_result included) to the DB.
            const newTurnMessages: any[] = [];

            let response: Anthropic.Message;
            try {
                response = await client.messages.create({
                    model: "claude-sonnet-5",
                    max_tokens: 1024,
                    system: systemPrompt,
                    tools,
                    messages,
                });
            } catch (e) {
                console.error("AI request failed:", e);
                throw new Error(`AI response generation failed: ${e instanceof Error ? e.message : String(e)}`);
            }

            while (response.stop_reason === "tool_use") {
                // record the assistant turn (contains tool_use blocks)
                const assistantContent = response.content;
                messages.push({ role: "assistant", content: assistantContent });
                newTurnMessages.push({ role: "assistant", content: assistantContent });

                // run every tool_use block, collect results
                const toolResults: any[] = [];
                for (const block of response.content) {
                    if (block.type === "tool_use") {
                        const { content, isError } = await runTool(block.name, block.input);
                        toolResults.push({
                            type: "tool_result",
                            tool_use_id: block.id,
                            content,
                            ...(isError ? { is_error: true } : {}),
                        });
                    }
                }

                // record the user turn (contains tool_result blocks)
                messages.push({ role: "user", content: toolResults });
                newTurnMessages.push({ role: "user", content: toolResults });

                // ask the model to continue
                try {
                    response = await client.messages.create({
                        model: "claude-sonnet-5",
                        max_tokens: 1024,
                        system: systemPrompt,
                        tools,
                        messages,
                    });
                } catch (e) {
                    console.error("AI request failed:", e);
                    throw new Error(`AI response generation failed: ${e instanceof Error ? e.message : String(e)}`);
                }
            }

            // the final assistant message (text, no more tool calls)
            messages.push({ role: "assistant", content: response.content });
            newTurnMessages.push({ role: "assistant", content: response.content });

            // ── persist every new message from this turn ────────────────────
            for (const m of newTurnMessages) {
                await context.prisma.aIChat.create({
                    data: {
                        aiConversationId: AIConversationId,
                        role: m.role,
                        content: JSON.parse(JSON.stringify(m.content)),
                    },
                });
            }

            // ── assemble the frontend response ──────────────────────────────
            let listingsForFrontend: any[] = [];
            let replyText: string;
            let replyAfter: string | null = null;

            if (presentedMessages) {
                const msgs = presentedMessages as { before: string; after?: string };
                const ids = presentedListings.map(p => p.id);
                const fullListings = await context.prisma.listing.findMany({
                    where: { id: { in: ids }, status: "active", is_deleted: false },
                });
                const byId = new Map(fullListings.map(l => [l.id, l]));
                listingsForFrontend = presentedListings
                    .map(p => {
                        const listing = byId.get(p.id);
                        if (!listing) return null;
                        return { listing, note: p.note ?? null };
                    })
                    .filter(Boolean);
                replyText = msgs.before;
                replyAfter = msgs.after ?? null;
            } else {
                replyText = response.content
                    .filter((block: any) => block.type === "text")
                    .map((block: any) => block.text)
                    .join("\n");
            }

            return {
                aiConversationId:   AIConversationId,
                message:            replyText,
                messageAfter:       replyAfter,
                listings:           listingsForFrontend,
                title:              titleResponse,
            };
        },
    },
};