import {GraphQLContext} from "../context";
import Anthropic from "@anthropic-ai/sdk";
import {z} from "zod";
import {betaZodTool} from "@anthropic-ai/sdk/helpers/beta/zod";
import {askAIChatSchema, getListingSchema, searchListingsSchema} from "../../validators/ai.validator";
import {checkAuth, checkStudentOnly} from "../guards";
import {BetaMessage} from "@anthropic-ai/sdk/resources/beta";


const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

export const AIResolvers = {
    Mutation: {
        askChatbot: async (_parent: any, args: { input: any }, context: GraphQLContext) => {

            checkStudentOnly(context);

            let message: string;
            let AIConversationId: string;
            let messages: any[] = [];
            const knownListingIds = new Set<string>();
            const conditionTR = { new: "sıfır", like_new: "az kullanılmış", good: "iyi durumda", fair: "orta durumda" };
            const typeTR = { secondhand: "ikinci el", roommate: "ev arkadaşı", carpooling: "araç paylaşımı", course: "ders", job: "iş", scholarship: "burs", urgent: "acil", note: "ders notu" };

            const parsed = askAIChatSchema.safeParse(args.input);

            if (!parsed.success) {
                throw new Error("Geçersiz girdi: " + JSON.stringify(z.treeifyError(parsed.error)));
            }

            if (parsed.data.message) {
                message = parsed.data.message;
            } else {
                throw new Error("Message is required");
            }

            if (parsed.data.aiConversationId) {
                AIConversationId = parsed.data.aiConversationId;

                const conversation = await context.prisma.aIConversation.findFirst({
                    where: {
                        id: AIConversationId,
                        userId: context.userId!,
                    },
                    include: {
                        chats: {
                            orderBy: {createdAt: "asc"}
                        }
                    }
                });

                if (!conversation) {
                    throw new Error("AIConversationId is invalid");
                }

                messages = conversation.chats.map(chat => ({
                    role: chat.role,
                    content: chat.content   // this is your stored Json — see bug 2 for what shape it should be
                }));


            } else {
                const newAIconversation = await context.prisma.aIConversation.create({
                    data: {
                        userId: context.userId!,
                        title: message.substring(0, 100) // Limit title length
                    }
                })
                AIConversationId = newAIconversation.id;
                // throw new Error("AIConversationId is required");
            }

            const messssage= await context.prisma.aIChat.create({

                data: {
                    aiConversationId: AIConversationId,
                    role: "user",
                    content: [{type: "text", text: message}]
                }
            })

            console.log(messssage);

            messages = [...messages, {role: "user", content: [{type: "text", text: message}]}];


            /*const getWeatherTool = betaZodTool({
                name: "get_weather",
                description: "Get the current weather in a given location",
                inputSchema: z.object({
                    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
                    unit: z.enum(["celsius", "fahrenheit"]).default("fahrenheit").describe("Temperature unit")
                }),
                run: async (input) => {
                    return JSON.stringify({
                        temperature: "20°C" + input.unit,
                        condition: "Sunny",
                        location: input.location
                    });
                }
            });*/

            function buildSearchListingsTool(userId: string, knownListingIds: Set<string>) {
                return betaZodTool({
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

Use "categories" to filter by one or more of these when the request is clearly about buying/selling a physical secondhand item. Skip category filtering entirely for other listing types (roommate, carpooling, course, job, scholarship, urgent, note) — filter those using "type" instead.

The "query" parameter searches listing title and description text directly (substring match) — these fields are written in TURKISH by users, so always translate the search intent into Turkish keywords before calling this tool, regardless of what language the user wrote in. Category and type values, by contrast, must stay in English exactly as listed above — never translate those.

You can call this tool multiple times in one turn (e.g. different categories, or a category search plus a broader keyword-only search) if a user's need could span more than one type of listing.

If a search returns no or very few results, retry with a broader or different keyword before concluding nothing is available.`, // see note below
                    inputSchema: searchListingsSchema,
                    run: async (input) => {

                        console.log("search_listings called with:", input);

                        const conditions: any[] = [
                            {status: "active"},
                            {is_deleted: false},
                            {ownerId: {not: userId}},   // never suggest the user their own listing
                            {OR: [{expires: {gt: new Date()}}, {expires: null}]},
                        ];

                        if (input.query) {
                            conditions.push({
                                OR: [
                                    {title: {contains: input.query, mode: "insensitive"}},
                                    {description: {contains: input.query, mode: "insensitive"}},
                                ],
                            });
                        }
                        if (input.categories?.length) {
                            conditions.push({category: {in: input.categories}});
                        }
                        if (input.type) conditions.push({type: input.type});
                        if (input.condition) conditions.push({condition: input.condition});
                        if (input.minPrice !== undefined || input.maxPrice !== undefined) {
                            conditions.push({
                                price: {
                                    ...(input.minPrice !== undefined ? {gte: input.minPrice} : {}),
                                    ...(input.maxPrice !== undefined ? {lte: input.maxPrice} : {}),
                                },
                            });
                        }

                        const results = await context.prisma.listing.findMany({
                            where: {AND: conditions},
                            orderBy: {createdAt: "desc"},
                            take: input.limit,
                            select: {
                                id: true, title: true, description: true, price: true,
                                category: true, subcategory: true, condition: true,
                                type: true, location: true, photos: true,
                            },
                        });

                        results.forEach(r => knownListingIds.add(r.id));  // for presentListings validation later
                        console.log("search_listings returned:", results.length, "results");

                        return JSON.stringify(
                            results.map(r => ({
                                ...r,
                                description: r.description.slice(0, 200),
                                condition: r.condition ? conditionTR[r.condition] : null,
                                type: typeTR[r.type],
                            }))
                        );
                    },
                });
            }

            function getListingTool(knownListingIds: Set<string>) {
                return betaZodTool({
                    name: "get_listing",
                    description: `Retrieve full current details of one specific listing by its exact ID.
                     Use this when the user references a specific listing already seen earlier in this conversation 
                     (e.g. "the second one," "that laptop you showed me") — always resolve their reference to the real
                     listing ID from conversation history first, then call this to get fresh, up-to-date details (price,
                     availability, condition may have changed since it was first shown). Do not guess or invent an ID — only
                     use IDs that actually appeared in a prior search result or tool call in this conversation.
                        
                     IMPORTANT: keyword ('query') matching is literal substring matching and often misses relevant listings 
                     (e.g. searching 'ekran kartı' will NOT match a listing titled 'rtx 3070ti'). Prefer filtering by 
                     'categories' and 'type' as your primary method, since those are reliable. Use 'query' only to 
                     further narrow results within a category, not as your main search strategy.
                      `,
                    inputSchema: getListingSchema,
                    run: async (input) => {
                        const listing = await context.prisma.listing.findUnique({
                            where: {id: input.id},
                            select: {
                                id: true, title: true, description: true, price: true,
                                category: true, subcategory: true, condition: true,
                                type: true, location: true, photos: true,
                            },
                        });

                        if (!listing) {
                            throw new Error("Listing not found");
                        }

                        knownListingIds.add(listing.id);

                        return JSON.stringify({...listing, type: typeTR[listing.type]});


                    },
                });
            }


            let finalMessage: BetaMessage;

            const systemPrompt = `You are MTBot, a marketplace assistant for Universe, a platform where students at Turkish universities buy and sell secondhand items, find roommates, carpool, and share courses/notes/job postings.
            
            Your job is to help students find relevant listings on the platform. You have real, working tools to search and look up listings — use them actively, not just when explicitly asked to search.
            
            When to search:
            - Whenever a user describes a need or problem that could plausibly be solved by something on the platform — even if they haven't explicitly asked to buy or search — call search_listings before answering. Infer the likely category or listing type from the problem they describe; don't wait for an explicit "do you have X" request.
            - If a user references a specific listing from earlier in the conversation, use get_listing with its real ID to fetch current details — never describe a listing from memory alone.
            
            How to search:
            - Category and listing-type values must always be passed in English exactly as defined in the search tool (e.g. "electronics", "secondhand") — never translate these.
            - Free-text keywords (the "query" parameter) match against Turkish listing titles/descriptions — always translate the user's intent into Turkish keywords before calling the tool, regardless of what language the user is writing in.
            - A request can span multiple categories or listing types — search broadly rather than narrowly if unsure.
            - If a search returns few or no results, retry with a broader or different term before telling the user nothing was found.
            - Only mention listings that genuinely fit what the user described, even if they technically matched your search filters. Never invent or guess at listings that weren't actually returned by a tool call.
            
            Boundaries:
            - Never share other users' personal information beyond what's already public in a listing.
            - Never reveal your underlying model or provider. If asked what model or AI you are, just say you're MTBot.
            - If asked for something unrelated to the platform (e.g. a recipe, coding help, general chit-chat), politely decline and explain that's outside what you can help with here.
            - Always respond in the same language the user wrote in.
            - Keep responses concise and friendly — this is a chat interface, not an essay.
            
            Tone:
            - Match the user's energy — this is a casual chat with students, not a sales pitch. Don't over-celebrate or use excessive excitement ("I FOUND IT!", multiple emojis) — especially for a listing already discussed earlier in the conversation.
            - If you've already shown a listing earlier in the conversation, don't re-announce it as a fresh discovery. Acknowledge it's the one already being discussed and move the conversation forward instead.
            - Don't use emojis.
            - Don't repeat information the user already has. If they said they're looking at something, help with the next step rather than re-pitching it.
            
            What you cannot do (never offer or imply these):
            - You have NO ability to notify users, send push notifications, send emails, or contact anyone later. Never say "haber vereyim," "sana bildiririm," "yeni ilan gelince söylerim," or anything implying future contact or monitoring.
            - You cannot watch for, track, or be alerted about new listings. You can only search what currently exists at this moment, within this conversation.
            - You cannot save searches, set reminders, follow up later, or take any action after this conversation ends.
            - You cannot message sellers, make offers, complete purchases, or perform any action on the user's behalf — you can only help them find listings and give them the information to act themselves.
            - If a user asks for any of these, briefly explain you can't do that, and offer what you actually can do instead (search again now, help them refine what they're looking for).
            `;

            try {
                finalMessage = await client.beta.messages.toolRunner({
                    model: "claude-sonnet-5",
                    max_tokens: 1024,
                    tools: [
                        buildSearchListingsTool(context.userId!, knownListingIds),
                        getListingTool(knownListingIds)
                    ],
                    system: systemPrompt,
                    messages,
                });

                for (const block of finalMessage.content) {
                    if (block.type === "text") {
                        console.log(block.text);
                    }
                }
            } catch (e) {
                console.error("AI request failed:", e);
                throw new Error(
                    `AI response generation failed: ${e instanceof Error ? e.message : String(e)}`
                );
            }

            await context.prisma.aIChat.create({
                data: {
                    aiConversationId: AIConversationId,
                    role: "assistant",
                    content: JSON.parse(JSON.stringify(finalMessage.content))
                }
            });

            const replyText = finalMessage.content
                .filter(block => block.type === "text")
                .map(block => block.text)
                .join("\n");

            return {
                aiConversationId: AIConversationId,
                message: replyText,
            };
            // const calculateSumTool = betaTool({
            //     name: "calculate_sum",
            //     description: "Add two numbers together",
            //     inputSchema: {
            //         type: "object",
            //         properties: {
            //             a: { type: "number", description: "First number" },
            //             b: { type: "number", description: "Second number" }
            //         },
            //         required: ["a", "b"]
            //     },
            //     run: async (input) => {
            //         return String(input.a + input.b);
            //     }
            // });
            //
            // const message = await client.messages.create({
            //     model: "claude-haiku-4-5",
            //     max_tokens: 1000,
            //     messages: [
            //         {
            //             role: "user",
            //             content: query
            //         }
            //     ]
            // });
            //
            // for (const block of message.content) {
            //     if (block.type === "text") {
            //         console.log(block.text);
            //     }
            // }
            //
            // return message.content.map(block => block.type === "text" ? block.text : "").join("\n");

        }
    },
}