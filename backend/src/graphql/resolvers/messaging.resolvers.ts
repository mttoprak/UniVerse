import { GraphQLContext } from "../context";
import { checkAuth, checkStudentOnly } from "../guards";
import { pubsub, SUBSCRIPTION_EVENTS } from "../../utils/pubsub.util";
import { withFilter } from 'graphql-subscriptions';
import cloudinary from "../../utils/cloudinary/cloudinary.config";
import { sendMessageSchema } from "../../validators/message.validator.prisma";

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
                data: { isRead: true, readAt: new Date() }
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
                // Prisma işlemi
                const updatedConv = await context.prisma.conversation.update({
                    where: { id: conversationId },
                    data: updateData
                });

                // YENİ: Socket (PubSub) üzerinden bu sohbetin güncellendiğini haber ver
                pubsub.publish(SUBSCRIPTION_EVENTS.CONVERSATION_UPDATED, { conversationUpdated: updatedConv });
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
        },
        getListingApplications: async (_parent: any, args: any, context: GraphQLContext) => {
            checkAuth(context);
            const { listingId, page = 1, limit = 20, status } = args;

            // 1. İlanı bul ve sahibini doğrula
            const listing = await context.prisma.listing.findUnique({
                where: { id: listingId },
                select: { ownerId: true }
            });

            if (!listing) throw new Error("İlan bulunamadı.");
            if (listing.ownerId !== context.userId) {
                throw new Error("Sadece ilan sahibi başvuruları görebilir.");
            }

            // 2. Filtreleri oluştur (Sadece direkt başvurular, yani conversationId null olanlar)
            const whereClause: any = {
                listingId,
                conversationId: null
            };
            if (status) whereClause.status = status;

            // 3. Veriyi Prisma ile çek
            const [applications, totalCount] = await Promise.all([
                context.prisma.offer.findMany({
                    where: whereClause,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit
                }),
                context.prisma.offer.count({ where: whereClause })
            ]);

            return {
                applications,
                total: totalCount,
                page
            };
        },

        // ─── GET MY APPLICATIONS (Kullanıcının Kendi Başvuruları) ───
        getMyApplications: async (_parent: any, args: any, context: GraphQLContext) => {
            checkAuth(context);
            const { page = 1, limit = 20 } = args;

            const whereClause = {
                applicantId: context.userId!,
                conversationId: null
            };

            const [applications, totalCount] = await Promise.all([
                context.prisma.offer.findMany({
                    where: whereClause,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit
                }),
                context.prisma.offer.count({ where: whereClause })
            ]);

            return {
                applications,
                total: totalCount,
                page
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
            // 1. Zod ile Gelen Veriyi (Input) Doğrula
            const parsed = sendMessageSchema.safeParse(input);

            if (!parsed.success) {
                // Zod'un karmaşık hata objesini frontend'in okuyabileceği temiz bir string'e çeviriyoruz
                const errorMessages = parsed.error.issues.map(issue => issue.message).join(" | ");
                throw new Error(`Validasyon Hatası: ${errorMessages}`);
            }

            // 2. Doğrulanmış ve temizlenmiş veriyi kullan
            // parsed.data içinde Zod'un .transform() fonksiyonundan geçmiş tertemiz veri var
            const {
                conversationId,
                listingId,
                text,
                photos,
                location,
                offerPrice,
                offerPricePer,
                offerNote
            } = parsed.data;

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
            if (!conversation) throw new Error("Mesaj gönderilecek sohbet bulunamadı veya oluşturulamadı.");
            if (!listing) throw new Error("İlgili ilan bulunamadı.");

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
            let preview = text ? text.slice(0, 80)
                : photos?.length ? `${photos.length} fotoğraf`
                : location ? 'Konum paylaşıldı'
                : finalOfferId ? 'Teklif gönderildi'
                : 'Yeni Mesaj';

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
                            location,
                            offerId: finalOfferId
                        }
                    }
                },
                include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });

            const newMessage = updatedConversation.messages[0];

            // --- SOCKET (PUBSUB) YAYINLARI ---
            await pubsub.publish(SUBSCRIPTION_EVENTS.NEW_MESSAGE, { newMessage });
            await pubsub.publish(SUBSCRIPTION_EVENTS.CONVERSATION_UPDATED, { conversationUpdated: updatedConversation });
            return newMessage;
        },

        // ─── APPLY (İş/Burs Direkt Başvuru) ───
        // applyToListing: async (_parent: any, { listingId, note }: any, context: GraphQLContext) => {
        //     checkStudentOnly(context);
        //
        //     const listing = await context.prisma.listing.findUnique({ where: { id: listingId } });
        //     if (!listing || !['job', 'scholarship'].includes(listing.type)) throw new Error("Bu ilana başvurulamaz");
        //
        //     const existing = await context.prisma.offer.findFirst({
        //         where: { listingId, applicantId: context.userId!, conversationId: null, status: { in: ['Pending', 'Accepted'] } }
        //     });
        //     if (existing) throw new Error("Zaten başvurdunuz.");
        //
        //     const offer = await context.prisma.offer.create({
        //         data: {
        //             listingId,
        //             applicantId: context.userId!,
        //             note
        //         }
        //     });
        //
        //     return offer;
        // },

        applyToListing: async (_parent: any, { listingId, note }: any, context: GraphQLContext) => {
            checkAuth(context);
            const applicantId = context.userId!;

            const listing = await context.prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing) throw new Error("İlan bulunamadı.");

            const applicableTypes = ['job', 'scholarship'];
            if (!applicableTypes.includes(listing.type)) {
                throw new Error("Bu ilan türüne direkt başvuru yapılamaz. Mesaj üzerinden teklif gönderiniz.");
            }

            if (listing.ownerId === applicantId) {
                throw new Error("Kendi ilanınıza başvuramazsınız.");
            }

            const existing = await context.prisma.offer.findFirst({
                where: {
                    listingId,
                    applicantId,
                    conversationId: null,
                    status: { in: ['Pending', 'Accepted'] }
                }
            });

            if (existing) throw new Error("Bu ilana zaten başvurdunuz.");

            const offer = await context.prisma.offer.create({
                data: {
                    listingId,
                    applicantId,
                    note,
                    status: 'Pending'
                }
            });

            await context.prisma.activityLog.create({
                data: {
                    actorId: applicantId,
                    action: "OFFER_SENT",
                    entity_type: "Offer",
                    entity_id: offer.id,
                    metadata: { listingId, is_direct_application: true }
                }
            });

            return offer;
        },

        // ─── MAKE OFFER (Marketplace Sohbet İçi Teklif) ───
        makeOffer: async (_parent: any, { input }: any, context: GraphQLContext) => {
            checkAuth(context);
            const { conversationId, price, pricePer, note } = input;
            const userId = context.userId!;

            const conversation = await context.prisma.conversation.findUnique({
                where: { id: conversationId }
            });

            if (!conversation) throw new Error("Sohbet bulunamadı.");

            if (conversation.sellerId !== userId && conversation.buyerId !== userId) {
                throw new Error("Bu sohbete erişim yetkiniz yok.");
            }

            // Önceki bekleyen teklifleri temizle (Prisma Batch Update)
            await context.prisma.$transaction([
                // Kendisinin daha önce yaptığı bekleyen teklifleri Cancel yap
                context.prisma.offer.updateMany({
                    where: { conversationId, applicantId: userId, status: 'Pending' },
                    data: { status: 'Cancelled' }
                }),
                // Karşı tarafın yaptığı bekleyen teklifleri Reject yap
                context.prisma.offer.updateMany({
                    where: { conversationId, applicantId: { not: userId }, status: 'Pending' },
                    data: { status: 'Rejected' }
                })
            ]);

            const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

            // Yeni teklifi oluştur
            const offer = await context.prisma.offer.create({
                data: {
                    listingId: conversation.listingId,
                    applicantId: userId,
                    conversationId,
                    price,
                    pricePer: pricePer || "One Time",
                    note,
                    status: 'Pending',
                    expiresAt
                }
            });

            // Sohbeti güncelle ve Sistem Mesajını tek seferde oluştur
            const updatedConversation = await context.prisma.conversation.update({
                where: { id: conversationId },
                data: {
                    offerStatus: "Offer Sent",
                    messages: {
                        create: {
                            senderId: userId,
                            type: 'system',
                            offerId: offer.id,
                            text: 'Yeni bir teklif gönderildi.'
                        }
                    }
                },
                include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });

            const systemMsg = updatedConversation.messages[0];

            await context.prisma.activityLog.create({
                data: {
                    actorId: userId,
                    action: "OFFER_SENT",
                    entity_type: "Offer",
                    entity_id: offer.id,
                    metadata: { conversationId, price }
                }
            });

            // WebSocket Yayınları
            await pubsub.publish(SUBSCRIPTION_EVENTS.NEW_MESSAGE, { newMessage: systemMsg });
            await pubsub.publish(SUBSCRIPTION_EVENTS.OFFER_UPDATED, { offerUpdated: offer });

            return offer;
        },

        // ─── RESPOND TO OFFER (Teklifi Kabul / Reddet) ───
        respondToOffer: async (_parent: any, { offerId, action }: any, context: GraphQLContext) => {
            checkAuth(context);
            const userId = context.userId!;

            const offer = await context.prisma.offer.findUnique({
                where: { id: offerId },
                include: { listing: true }
            });

            if (!offer) throw new Error("Teklif bulunamadı.");
            if (offer.status !== 'Pending') throw new Error("Bu teklif artık yanıtlanamaz.");

            if (offer.conversationId) {
                const conversation = await context.prisma.conversation.findUnique({
                    where: { id: offer.conversationId }
                });

                if (!conversation) throw new Error("Sohbet bulunamadı.");
                if (conversation.buyerId !== userId && conversation.sellerId !== userId) {
                    throw new Error("Bu sohbete erişim yetkiniz yok.");
                }
                if (offer.applicantId === userId) {
                    throw new Error("Kendi teklifinize yanıt veremezsiniz.");
                }
            } else {
                if (offer.listing.ownerId !== userId) {
                    throw new Error("Sadece ilan sahibi teklife yanıt verebilir.");
                }
            }

            const newStatus = action === 'accepted' ? 'Accepted' : 'Rejected';

            // 1. Teklifi Güncelle
            const updatedOffer = await context.prisma.offer.update({
                where: { id: offerId },
                data: { status: newStatus }
            });

            await context.prisma.activityLog.create({
                data: {
                    actorId: userId,
                    action: action === 'accepted' ? "OFFER_ACCEPTED" : "OFFER_REJECTED",
                    entity_type: "Offer",
                    entity_id: offer.id,
                    metadata: { listingId: offer.listingId }
                }
            });

            // 2. Kabul edildiyse ve ilan 2. el ise (Satıldı mantığı)
            if (action === 'accepted' && offer.listing.type === 'secondhand') {
                await context.prisma.listing.update({
                    where: { id: offer.listingId },
                    data: { status: 'sold' }
                });

                // Diğer bekleyen teklifleri bul ve reddet
                const otherOffers = await context.prisma.offer.findMany({
                    where: { listingId: offer.listingId, status: 'Pending', id: { not: offer.id } }
                });

                for (const other of otherOffers) {
                    await context.prisma.offer.update({
                        where: { id: other.id },
                        data: { status: 'Rejected' }
                    });

                    if (other.conversationId) {
                        await context.prisma.conversation.update({
                            where: { id: other.conversationId },
                            data: {
                                offerStatus: 'Offer Rejected',
                                messages: {
                                    create: {
                                        senderId: userId,
                                        type: 'system',
                                        text: 'İlan başka bir kullanıcıya satıldığı için teklif reddedildi.'
                                    }
                                }
                            }
                        });

                        // Diğer kaybeden teklifler için de socket eventi fırlat
                        await pubsub.publish(SUBSCRIPTION_EVENTS.OFFER_UPDATED, {
                            offerUpdated: { ...other, status: 'Rejected' }
                        });
                    }
                }
            }

            // 3. Sohbeti olan bir teklifse (Marketplace)
            if (offer.conversationId) {
                const statusText = action === 'accepted' ? 'Kabul edildi' : 'Reddedildi';

                await context.prisma.conversation.update({
                    where: { id: offer.conversationId },
                    data: {
                        offerStatus: action === 'accepted' ? 'Offer Accepted' : 'Offer Rejected',
                        messages: {
                            create: {
                                senderId: userId,
                                type: 'system',
                                text: `Teklif ${statusText}`
                            }
                        }
                    }
                });

                // Kazanan teklif için socket eventi fırlat
                await pubsub.publish(SUBSCRIPTION_EVENTS.OFFER_UPDATED, { offerUpdated: updatedOffer });
            }

            return updatedOffer;
        },

        // ─── CANCEL OFFER (Teklifi İptal Et) ───
        cancelOffer: async (_parent: any, { offerId }: any, context: GraphQLContext) => {
            checkAuth(context);

            const offer = await context.prisma.offer.findFirst({
                where: {
                    id: offerId,
                    applicantId: context.userId!,
                    status: 'Pending'
                }
            });

            if (!offer) throw new Error("İptal edilebilir teklif bulunamadı.");

            const updatedOffer = await context.prisma.offer.update({
                where: { id: offerId },
                data: { status: 'Cancelled' }
            });

            await context.prisma.activityLog.create({
                data: {
                    actorId: context.userId,
                    action: "OFFER_CANCELLED",
                    entity_type: "Offer",
                    entity_id: offer.id
                }
            });

            if (offer.conversationId) {
                await context.prisma.conversation.update({
                    where: { id: offer.conversationId },
                    data: { offerStatus: 'No Offer' }
                });

                await pubsub.publish(SUBSCRIPTION_EVENTS.OFFER_UPDATED, { offerUpdated: updatedOffer });
            }

            return updatedOffer;
        }

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
        },
        offerUpdated: {
            subscribe: async (_parent: any, args: any, context: GraphQLContext) => {
                if (!context.userId) {
                    throw new Error("Giriş yapmalısınız.");
                }

                // Opsiyonel: Burada da conversation üzerinden yetki kontrolü yapabilirsin
                return withFilter(
                    // SUBSCRIPTION_EVENTS içerisine OFFER_UPDATED eklemeyi unutma!
                    () => pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.OFFER_UPDATED || "OFFER_UPDATED"),
                    (payload, variables) => String(payload.offerUpdated.conversationId) === String(variables.conversationId)
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