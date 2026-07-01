// backend/src/graphql/resolvers/admin.resolvers.ts

import { GraphQLContext } from "../context";
import { checkAdminOnly } from "../guards";
import { createActivityLog } from "../../utils/logger.util";
import { pubsub, SUBSCRIPTION_EVENTS } from "../../utils/pubsub.util";
import {onlineUsersMap} from "../../utils/onlineUsers.util";
// import { onlineUsersMap } from "../../Socket/Socket"; // Eğer hala global map tutuyorsan

// UUID kontrolü (Mongoose ObjectId.isValid yerine)
const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

export const adminResolvers = {
    Query: {
        // ─── 1. DASHBOARD İSTATİSTİKLERİ ───
        getDashboardStats: async (_parent: any, _args: any, context: GraphQLContext) => {
            checkAdminOnly(context);

            try{

                const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                const [totalUsers, newUsersThisWeek, activeListings, totalConversations, totalOffers] = await Promise.all([
                    context.prisma.user.count(),
                    context.prisma.user.count({ where: { createdAt: { gte: last7Days } } }),
                    context.prisma.listing.count({ where: { status: 'active', is_deleted: false } }),
                    context.prisma.conversation.count(),
                    context.prisma.offer.count()
                ]);

                return {
                    users: { total: totalUsers, newThisWeek: newUsersThisWeek },
                    listings: { active: activeListings },
                    activity: { totalConversations, totalOffers }
                };
            }catch (e) {
                throw new Error("Dashboard Stats Error."+e);
            }
        },

        // ─── 2. SİSTEM & ONLİNE TAKİBİ ───
        getOnlineUsers: async (_parent: any, _args: any, context: GraphQLContext) => {
            checkAdminOnly(context);

            // Map'teki verileri bir diziye (array) çevir
            const onlineArray = Array.from(onlineUsersMap.entries()).map(([userId, data]) => ({
                userId,
                ip: data.ip,
                connectedAt: data.connectedAt
            }));

            const userIds = onlineArray.map(u => u.userId);

            // Prisma'nın "IN" operatörü ile online olan herkesin kullanıcı bilgilerini tek sorguda çek
            const usersInfo = await context.prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    username: true,
                    name: true,
                    surname: true,
                    account_type: true,
                    profile_photo: true
                }
            });

            // Soket verisiyle Prisma verisini birleştir (Enrichment)
            const enrichedOnlineUsers = onlineArray.map(online => ({
                ...online,
                userInfo: usersInfo.find(u => u.id === online.userId) || null
            }));

            return {
                totalOnline: onlineUsersMap.size,
                users: enrichedOnlineUsers
            };
        },

        // ─── 3. KULLANICI DETAYLARI ───
        getUserFullDetails: async (_parent: any, { id }: { id: string }, context: GraphQLContext) => {
            checkAdminOnly(context);

            // 1. Kullanıcıyı ID veya Username'e göre bul
            // Prisma'da OR kullanırken findFirst kullanmak çok daha güvenlidir.
            const user = await context.prisma.user.findFirst({
                where: {
                    OR: [
                        { id: id },
                        { username: id }
                    ]
                }
            });

            if (!user) throw new Error("Kullanıcı bulunamadı.");

            // 2. KRİTİK NOKTA: Arama username ile yapılmış olsa bile
            // diğer tablolarda gerçek user.id'yi aratmamız gerekiyor.
            const targetUserId = user.id;

            // 3. Tüm ilişkili verileri gerçek UUID ile çek
            const [logs, listings, comments, conversations] = await Promise.all([
                context.prisma.activityLog.findMany({
                    where: { actorId: targetUserId },
                    orderBy: { createdAt: 'desc' },
                    take: 100
                }),
                context.prisma.listing.findMany({
                    where: { ownerId: targetUserId },
                    orderBy: { createdAt: 'desc' }
                }),
                context.prisma.comment.findMany({
                    where: { authorId: targetUserId },
                    orderBy: { createdAt: 'desc' }
                }),
                context.prisma.conversation.findMany({
                    where: {
                        OR: [
                            { sellerId: targetUserId },
                            { buyerId: targetUserId }
                        ]
                    },
                    orderBy: { updatedAt: 'desc' },
                    include: { listing: true, seller: true, buyer: true }
                })
            ]);

            // 4. Metadata'yı frontend için JSON String'e çevir
            const formattedLogs = logs.map(log => ({
                ...log,
                metadata: log.metadata ? JSON.stringify(log.metadata) : null
            }));

            return {
                user,
                logs: formattedLogs,
                listings,
                comments,
                conversations
            };
        },

        // ─── 4. İLAN YÖNETİMİ ───
        getAllListingsAdmin: async (_parent: any, args: any, context: GraphQLContext) => {
            checkAdminOnly(context);
            const { page = 1, limit = 50, showDeleted } = args;

            const whereClause = showDeleted ? { is_deleted: true } : {};

            const [totalCount, listings] = await Promise.all([
                context.prisma.listing.count({ where: whereClause }),
                context.prisma.listing.findMany({
                    where: whereClause,
                    orderBy: { createdAt: 'desc' },
                    skip: (page - 1) * limit,
                    take: limit,
                    include: { owner: true }
                })
            ]);

            return {
                listings,
                totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount
            };
        },

        // ─── 5. SOHBET DETAYLARI ───
        getConversationDetailsAdmin: async (_parent: any, { convId }: any, context: GraphQLContext) => {
            checkAdminOnly(context);

            const conversation = await context.prisma.conversation.findUnique({
                where: { id: convId },
                include: { listing: true, seller: true, buyer: true }
            });

            if (!conversation) throw new Error("Sohbet bulunamadı.");

            const messages = await context.prisma.message.findMany({
                where: { conversationId: convId },
                orderBy: { createdAt: 'asc' },
                include: { sender: true }
            });

            return { conversation, messages };
        }
    },

    Mutation: {
        // ─── 2. KULLANICI İŞLEMLERİ (BAN & VERIFY) ───
        toggleBanStatus: async (_parent: any, { identifier }: any, context: GraphQLContext) => {
            checkAdminOnly(context);

            const query = isUUID(identifier) ? { id: identifier } : { username: identifier };

            const targetUser = await context.prisma.user.findFirst({ where: query });
            if (!targetUser) throw new Error("Kullanıcı bulunamadı.");
            if (targetUser.is_admin) throw new Error("Başka bir admini banlayamazsınız!");

            const updatedUser = await context.prisma.user.update({
                where: { id: targetUser.id },
                data: { is_banned: !targetUser.is_banned }
            });

            await createActivityLog({
                actor: context.userId!,
                action: updatedUser.is_banned ? "USER_BANNED" : "USER_UNBANNED",
                entity_type: "User", entity_id: updatedUser.id,
                metadata: { targetUsername: updatedUser.username }
            });

            return updatedUser;
        },

        manualVerifyUser: async (_parent: any, { id }: any, context: GraphQLContext) => {
            checkAdminOnly(context);

            const user = await context.prisma.user.findUnique({ where: { id } });
            if (!user) throw new Error("Kullanıcı bulunamadı.");
            if (user.is_verified) throw new Error("Kullanıcı zaten onaylı.");

            const updatedUser = await context.prisma.user.update({
                where: { id },
                data: { is_verified: true }
            });

            await createActivityLog({
                actor: context.userId!, action: "EDU_EMAIL_VERIFIED",
                entity_type: "User", entity_id: user.id,
                metadata: { manualVerificationByAdmin: true }
            });

            return updatedUser;
        },

        // ─── 3. SİSTEM DUYURUSU ───
        broadcastAnnouncement: async (_parent: any, { title, message }: any, context: GraphQLContext) => {
            checkAdminOnly(context);

            // Soket (PubSub) üzerinden tüm sisteme yayın yap
            // (Bunun çalışması için SUBSCRIPTION_EVENTS içine SYSTEM_ANNOUNCEMENT eklemelisin)
            await pubsub.publish('SYSTEM_ANNOUNCEMENT', {
                systemAnnouncement: { title, message, createdAt: new Date().toISOString() }
            });

            await createActivityLog({
                actor: context.userId!, action: "SYSTEM_BROADCAST",
                entity_type: "None", metadata: { title, message }
            });

            return true;
        },

        // ─── 4. İLAN YÖNETİMİ ───
        adminDeleteListing: async (_parent: any, { id }: any, context: GraphQLContext) => {
            checkAdminOnly(context);

            const listing = await context.prisma.listing.findUnique({ where: { id } });
            if (!listing) throw new Error("İlan bulunamadı.");

            await context.prisma.listing.update({
                where: { id },
                data: { is_deleted: true, status: 'closed' }
            });

            await createActivityLog({
                actor: context.userId!, action: "LISTING_DELETED",
                entity_type: "Listing", entity_id: id, metadata: { deletedByAdmin: true }
            });

            return true;
        },

        // ─── 5. SOHBETLERE MÜDAHALE (MESAJ GÖNDERME) ───
        sendAdminMessageToConversation: async (_parent: any, { convId, text }: any, context: GraphQLContext) => {
            checkAdminOnly(context);

            const conversation = await context.prisma.conversation.findUnique({ where: { id: convId } });
            if (!conversation) throw new Error("Sohbet bulunamadı.");

            const lastMessagePayload = {
                senderId: context.userId,
                senderName: 'SİSTEM MODERATÖRÜ',
                preview: text.slice(0, 50),
                type: 'admin', sentAt: new Date().toISOString(), isRead: false, emailNotified: false
            };

            const updatedConversation = await context.prisma.conversation.update({
                where: { id: convId },
                data: {
                    lastMessage: lastMessagePayload,
                    messages: {
                        create: {
                            senderId: context.userId!,
                            type: 'admin',
                            text,
                            photos: [],
                            location: null
                        }
                    }
                },
                include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });

            const adminMessage = updatedConversation.messages[0];

            // Sohbetin içindeki taraflara soket üzerinden canlı olarak admin mesajını düşür
            await pubsub.publish(SUBSCRIPTION_EVENTS.NEW_MESSAGE, { newMessage: adminMessage });
            await pubsub.publish(SUBSCRIPTION_EVENTS.CONVERSATION_UPDATED, { conversationUpdated: updatedConversation });

            await createActivityLog({
                actor: context.userId!, action: "MESSAGE_SENT",
                entity_type: "Message", entity_id: adminMessage.id,
                metadata: { adminIntervention: true, conversationId: convId }
            });

            return adminMessage;
        }
    }
};