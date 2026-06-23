import { GraphQLContext } from "../context";
import { checkAuth, checkStudentOnly } from "../guards";
import { pubsub, SUBSCRIPTION_EVENTS } from "../../utils/pubsub.util";
import { withFilter } from 'graphql-subscriptions';
import cloudinary from "../../utils/cloudinary/cloudinary.config";
import { createActivityLog } from "../../utils/logger.util";

export const messagingResolvers = {
    Query: {
        // ─── CONVERSATIONS ───
        getConversations: async (_parent: any, args: any, context: GraphQLContext) => {
            checkAuth(context);
            const { page = 1, limit = 20, status } = args;
            const userId = context.userId!;

            const baseQuery: any = {
                OR: [{ sellerId: userId }, { buyerId: userId }],
                status: { not: 'blocked' }
            };

            if (status && ['active', 'archived'].includes(status)) {
                baseQuery.status = status;
            }

            const totalCount = await context.prisma.conversation.count({ where: baseQuery });
            const conversations = await context.prisma.conversation.findMany({
                where: baseQuery,
                orderBy: { updatedAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            });

            return {
                conversations,
                pagination: {
                    page, limit, totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                    hasNextPage: page * limit < totalCount
                }
            };
        },

        // ─── GET MESSAGES ───
        getMessages: async (_parent: any, args: any, context: GraphQLContext) => {
            checkAuth(context);
            const { conversationId, cursor, limit = 30 } = args;
            const limitNum = Math.min(50, Math.max(1, limit));

            const conversation = await context.prisma.conversation.findUnique({
                where: { id: conversationId }
            });

            if (!conversation) throw new Error("Sohbet bulunamadı.");
            if (conversation.sellerId !== context.userId && conversation.buyerId !== context.userId) {
                throw new Error("Erişim yetkiniz yok.");
            }

            // Cursor Paginasyonu (Prisma'da createdAt'e göre)
            const queryParams: any = { conversationId };
            if (cursor) queryParams.createdAt = { lt: new Date(cursor) };

            const messages = await context.prisma.message.findMany({
                where: queryParams,
                orderBy: { createdAt: 'desc' },
                take: limitNum
            });

            // Eski → yeni sırası
            messages.reverse();

            // OKUNMAMIŞLARI OKUNDU YAPMA (Prisma updateMany)
            await context.prisma.message.updateMany({
                where: {
                    conversationId,
                    senderId: { not: context.userId },
                    isRead: false
                },
                data: { isRead: true, readAt: new Date() } //TODO READ
            });

            // CONVERSATION SAYAÇLARINI SIFIRLAMA
            const isSeller = conversation.sellerId === context.userId;

            // Hangi rolü güncelleyeceğimizi buluyoruz
            const role = isSeller ? 'unreadSeller' : 'unreadBuyer';

            // TypeScript'in bunun kesinlikle bir Number (Int) olduğunu anlaması için doğrudan erişiyoruz
            const currentUnreadCount = isSeller ? conversation.unreadSeller : conversation.unreadBuyer;

            const lastMessageObj: any = conversation.lastMessage || {};

            let convNeedsUpdate = false;
            const updateData: any = {};

            // Artık currentUnreadCount kesinlikle bir number olduğu için TS > 0 kontrolüne kızmaz
            if (currentUnreadCount > 0) {
                updateData[role] = 0;
                convNeedsUpdate = true;
            }

            if (lastMessageObj && lastMessageObj.senderId !== context.userId && !lastMessageObj.isRead) {
                lastMessageObj.isRead = true;
                updateData.lastMessage = lastMessageObj;
                convNeedsUpdate = true;
            }

            if (convNeedsUpdate) {
                await context.prisma.conversation.update({
                    where: { id: conversationId },
                    data: updateData
                });
            }

            return {
                messages,
                nextCursor: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
                hasMore: messages.length === limitNum
            };
        },

        // ─── OFFER QUERIES ───
        checkListingAgreement: async (_parent: any, args: { listingId: string }, context: GraphQLContext) => {
            checkAuth(context);

            const listing = await context.prisma.listing.findUnique({ where: { id: args.listingId } });
            if (!listing) throw new Error("İlan bulunamadı.");

            // Prisma exists() karşılığı findFirst() idir.
            const agreementExists = await context.prisma.offer.findFirst({
                where: {
                    listingId: args.listingId,
                    status: "Accepted",
                    applicantId: { in: [context.userId!, listing.ownerId] }
                }
            });

            return {
                hasAgreement: !!agreementExists,
                listingId: args.listingId,
                currentUser: context.userId,
                listingOwner: listing.ownerId
            };
        }
    },

    Mutation: {
        // ─── CLOUDINARY İMZA (MESAJLAR İÇİN YENİ) ───
        generateMessageUploadSignature: async (_parent: any, _args: any, context: GraphQLContext) => {
            checkAuth(context);
            const timestamp = Math.round(new Date().getTime() / 1000);
            const folder = "universe/messages"; // Frontend'e bırakmadık, backendden zorluyoruz

            const signature = cloudinary.utils.api_sign_request(
                { timestamp, folder },
                process.env.CLOUDINARY_API_SECRET!
            );

            return {
                timestamp, signature, folder,
                cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
                apiKey: process.env.CLOUDINARY_API_KEY!
            };
        },

        // ─── SEND MESSAGE ───
        sendMessage: async (_parent: any, { input }: any, context: GraphQLContext) => {
            checkAuth(context);
            const { conversationId, listingId, text, photos, offerPrice, offerPricePer, offerNote } = input;
            const currentUserId = context.userId!;

            let conversation: any = null;
            let listing: any = null;
            let sellerId = "";
            let buyerId = "";
            let isNewConversation = false;

            // ... [Sohbet bulma veya oluşturma mantığı Mongoose'daki ile aynı, sadece prisma metodları ile]
            if (conversationId) {
                conversation = await context.prisma.conversation.findUnique({ where: { id: conversationId } });
                if (!conversation) throw new Error("Konuşma bulunamadı.");
                sellerId = conversation.sellerId;
                buyerId = conversation.buyerId;
                listing = await context.prisma.listing.findUnique({ where: { id: conversation.listingId } });
            } else if (listingId) {
                listing = await context.prisma.listing.findUnique({ where: { id: listingId } });
                if (!listing) throw new Error("İlan bulunamadı.");
                sellerId = listing.ownerId;
                buyerId = currentUserId;

                conversation = await context.prisma.conversation.findFirst({
                    where: { listingId, sellerId, buyerId, status: 'active' }
                });

                if (!conversation) {
                    conversation = await context.prisma.conversation.create({
                        data: { listingId, sellerId, buyerId }
                    });
                    isNewConversation = true;
                }
            }

            // --- TEKLİF MANTIĞI ---
            let finalOfferId: string | undefined = undefined;
            let offerStatus = conversation.offerStatus;

            if (offerPrice && offerPrice > 0) {
                // Eski teklifleri iptal et
                await context.prisma.offer.updateMany({
                    where: { conversationId: conversation.id, applicantId: currentUserId, status: 'Pending' },
                    data: { status: 'Cancelled' }
                });

                await context.prisma.offer.updateMany({
                    where: { conversationId: conversation.id, applicantId: { not: currentUserId }, status: 'Pending' },
                    data: { status: 'Rejected' }
                });

                const newOffer = await context.prisma.offer.create({
                    data: {
                        listingId: listing.id,
                        applicantId: currentUserId,
                        conversationId: conversation.id,
                        price: offerPrice,
                        pricePer: offerPricePer || "One Time",
                        note: offerNote,
                        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
                    }
                });
                finalOfferId = newOffer.id;
                offerStatus = "Offer Sent";
            }

            // --- MESAJ OLUŞTURMA ---
            const currentUserObj = await context.prisma.user.findUnique({ where: { id: currentUserId } });
            let preview = text ? text.slice(0, 80) : photos?.length ? `${photos.length} fotoğraf` : finalOfferId ? 'Teklif gönderildi' : 'Yeni Mesaj';

            const lastMessagePayload = {
                senderId: currentUserId,
                senderName: `${currentUserObj?.name} ${currentUserObj?.surname}`,
                preview,
                type: 'user',
                sentAt: new Date().toISOString(),
                isRead: false,
                emailNotified: false
            };

            // Prisma işlemi - Update Conversation ve Create Message tek adımda
            const updatedConversation = await context.prisma.conversation.update({
                where: { id: conversation.id },
                data: {
                    offerStatus,
                    lastMessage: lastMessagePayload,
                    unreadSeller: currentUserId === buyerId ? { increment: 1 } : undefined,
                    unreadBuyer: currentUserId === sellerId ? { increment: 1 } : undefined,
                    messages: {
                        create: {
                            senderId: currentUserId,
                            type: 'user',
                            text,
                            photos: photos || [], // Frontend URL'leri verdi
                            offerId: finalOfferId
                        }
                    }
                },
                include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });

            const newMessage = updatedConversation.messages[0];

            // --- SOCKET (PUBSUB) YAYINLARI ---
            pubsub.publish(SUBSCRIPTION_EVENTS.NEW_MESSAGE, { newMessage });
            pubsub.publish(SUBSCRIPTION_EVENTS.CONVERSATION_UPDATED, { conversationUpdated: updatedConversation });

            return newMessage;
        },

        // ─── APPLY (İş/Burs Direkt Başvuru) ───
        applyToListing: async (_parent: any, { listingId, note }: any, context: GraphQLContext) => {
            checkStudentOnly(context);

            const listing = await context.prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing || !['job', 'scholarship'].includes(listing.type)) throw new Error("Bu ilana başvurulamaz");

            const existing = await context.prisma.offer.findFirst({
                where: { listingId, applicantId: context.userId!, conversationId: null, status: { in: ['Pending', 'Accepted'] } }
            });
            if (existing) throw new Error("Zaten başvurdunuz.");

            const offer = await context.prisma.offer.create({
                data: {
                    listingId,
                    applicantId: context.userId!,
                    note
                }
            });

            return offer;
        },

        // Diğer offer mutation'ları (respondToOffer, cancelOffer) aynı mantıkla prisma update olarak yazılacak.
    },

    // ─── SUBSCRIPTIONS (GraphQL'in Socket'i) ───
    Subscription: {
        newMessage: {
            subscribe: async (_parent: any, args: any, context: GraphQLContext) => {
                // 1. Kullanıcı giriş yapmış mı?
                if (!context.userId) {
                    throw new Error("Giriş yapmalısınız.");
                }

                // 2. Kullanıcı bu sohbetin bir parçası mı?
                const conversation = await context.prisma.conversation.findUnique({
                    where: { id: args.conversationId }
                });

                if (!conversation) {
                    throw new Error("Sohbet bulunamadı.");
                }

                if (conversation.sellerId !== context.userId && conversation.buyerId !== context.userId) {
                    throw new Error("Bu sohbeti dinleme yetkiniz yok.");
                }

                // 3. Her şey yolundaysa kanalı dinlemeye başla
                return withFilter(
                    () => pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.NEW_MESSAGE),
                    (payload, variables) => payload.newMessage.conversationId === variables.conversationId
                )(_parent, args, context);
            }
        },

        conversationUpdated: {
            subscribe: async (_parent: any, args: any, context: GraphQLContext) => {
                // 1. Kullanıcı giriş yapmış mı?
                if (!context.userId) {
                    throw new Error("Giriş yapmalısınız.");
                }

                // 2. Kullanıcı KENDİ sohbet listesini mi dinlemek istiyor?
                // (Başkalarının ID'sini gönderip onların mesajlarını dinlemesini engelliyoruz)
                if (args.userId !== context.userId) {
                    throw new Error("Sadece kendi sohbetlerinizi dinleyebilirsiniz!");
                }

                // 3. Her şey yolundaysa, global güncellemeleri dinle
                return withFilter(
                    () => pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.CONVERSATION_UPDATED),
                    (payload, variables) => {
                        const conv = payload.conversationUpdated;
                        // Eğer bu güncellenen sohbetin alıcısı veya satıcısı bizim kullanıcıysa ilet
                        return conv.sellerId === variables.userId || conv.buyerId === variables.userId;
                    }
                )(_parent, args, context);
            }
        }
    },

    // ─── FIELD RESOLVERS (Mongoose Populate'in Prisma / GraphQL Karşılığı) ───
    Conversation: {
        seller: (parent: any, _args: any, context: GraphQLContext) => context.prisma.user.findUnique({ where: { id: parent.sellerId } }),
        buyer: (parent: any, _args: any, context: GraphQLContext) => context.prisma.user.findUnique({ where: { id: parent.buyerId } }),
        listing: (parent: any, _args: any, context: GraphQLContext) => context.prisma.listing.findUnique({ where: { id: parent.listingId } }),
    },
    Message: {
        sender: (parent: any, _args: any, context: GraphQLContext) => context.prisma.user.findUnique({ where: { id: parent.senderId } }),
        offer: (parent: any, _args: any, context: GraphQLContext) => parent.offerId ? context.prisma.offer.findUnique({ where: { id: parent.offerId } }) : null,
        conversation: (parent: any, _args: any, context: GraphQLContext) => context.prisma.conversation.findUnique({ where: { id: parent.conversationId } }),
    },
    Offer: {
        applicant: (parent: any, _args: any, context: GraphQLContext) => context.prisma.user.findUnique({ where: { id: parent.applicantId } }),
        listing: (parent: any, _args: any, context: GraphQLContext) => context.prisma.listing.findUnique({ where: { id: parent.listingId } }),
    }
};