// backend/src/graphql/resolvers/comment.resolvers.ts

import { GraphQLContext } from "../context";
import { checkAuth,
    checkStudentOnly } from "../guards";
import { createCommentSchema, updateCommentSchema } from "../../validators/comment.validator.prisma";
import { createActivityLog } from "../../utils/logger.util";

// --- YARDIMCI FONKSİYON: Agreement Kontrolü ---
const checkAgreement = async (prisma: any, authorId: string, targetId: string, listingId: string) => {
    const agreement = await prisma.offer.findFirst({
        where: {
            listingId,
            status: 'Accepted',
            applicantId: { in: [authorId, targetId] }
        }
    });
    return !!agreement;
};

export const commentResolvers = {
    Query: {
        // ─── GET LISTING COMMENTS (Top-level) ───
        getListingComments: async (_parent: any, args: any, context: GraphQLContext) => {
            checkAuth(context);
            const { listingId, page = 1, limit = 20 } = args;

            const listing = await context.prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing) throw new Error("İlan bulunamadı.");

            const isUserStudent = context.user?.account_type === 'student';
            const isOwner = listing.ownerId === context.userId;

            if (!isUserStudent && !isOwner) {
                throw new Error("Sadece öğrenciler veya ilanın sahibi bu yorumları görebilir.");
            }

            const totalCount = await context.prisma.comment.count({
                where: { listingId, parentId: null }
            });

            // Prisma'nın gücü: include { _count } ile Mongoose'daki 10 satırlık lookup operasyonunu tek satırda yapıyoruz.
            const comments = await context.prisma.comment.findMany({
                where: { listingId, parentId: null },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: { _count: { select: { replies: true } } }
            });

            return {
                comments,
                totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount
            };
        },

        // ─── GET REPLIES ───
        getCommentReplies: async (_parent: any, { commentId }: any, context: GraphQLContext) => {
            checkAuth(context);

            const parentComment = await context.prisma.comment.findUnique({
                where: { id: commentId },
                include: { listing: true }
            });

            if (!parentComment) throw new Error("Yorum bulunamadı.");

            const isUserStudent = context.user?.account_type === 'student';
            const isOwner = parentComment.listing.ownerId === context.userId;

            if (!isUserStudent && !isOwner) {
                throw new Error("Sadece öğrenciler veya ilanın sahibi bu yanıtları görebilir.");
            }

            return context.prisma.comment.findMany({
                where: { parentId: commentId },
                orderBy: { createdAt: 'asc' } // Eski -> Yeni (Okuma akışı)
            });
        },

        // ─── GET USER COMMENTS (Profil Sayfası) ───
        getUserComments: async (_parent: any, args: any, context: GraphQLContext) => {
            checkAuth(context);
            const { userId, page = 1, limit = 20 } = args;

            const isUserStudent = context.user?.account_type === 'student';
            if (!isUserStudent && userId !== context.userId) {
                throw new Error("Sadece öğrenciler veya kullanıcının kendisi bu yorumları görebilir.");
            }

            const totalCount = await context.prisma.comment.count({
                where: { targetId: userId, parentId: null }
            });

            const comments = await context.prisma.comment.findMany({
                where: { targetId: userId, parentId: null },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
                include: { _count: { select: { replies: true } } }
            });

            return {
                comments,
                totalCount,
                page,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount
            };
        }
    },

    Mutation: {
        // ─── CREATE COMMENT ───
        createComment: async (_parent: any, { input }: any, context: GraphQLContext) => {
            checkAuth(context);

            const parsed = createCommentSchema.safeParse(input);
            if (!parsed.success) throw new Error(`Validasyon Hatası: ${parsed.error.issues[0].message}`);

            const { listingId, content, rating, parentId } = parsed.data;
            const authorId = context.userId!;

            const listing = await context.prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing) throw new Error("İlan bulunamadı.");

            const targetId = listing.ownerId;
            const isUserStudent = context.user?.account_type === 'student';
            const isOwner = targetId === authorId;

            if (!isUserStudent && !isOwner) throw new Error("Sadece öğrenciler veya ilanın sahibi işlem yapabilir.");

            if (isOwner && !parentId) {
                throw new Error("Kendi ilanınıza top-level yorum yapamazsınız. Sadece yanıt verebilirsiniz.");
            }

            if (parentId) {
                const parentComment = await context.prisma.comment.findUnique({ where: { id: parentId } });
                if (!parentComment) throw new Error("Yanıtlanacak yorum bulunamadı.");
                if (parentComment.listingId !== listingId) throw new Error("Yorum bu ilana ait değil.");
                if (parentComment.parentId) throw new Error("Yanıtlara yanıt yapılamaz.");
            }

            if (rating && !parentId) {
                const agreed = await checkAgreement(context.prisma, authorId, targetId, listingId);
                if (!agreed) throw new Error("Puan vermek için satıcıyla kabul edilmiş bir anlaşmanız olmalıdır.");

                const existingRating = await context.prisma.comment.findFirst({
                    where: { listingId, authorId, parentId: null, rating: { not: null }, is_deleted: false }
                });
                if (existingRating) throw new Error("Bu ilana zaten puan verdiniz.");
            }

            // Prisma transaction: Yorumu oluştur ve eğer rating varsa User'ı güncelle
            const result = await context.prisma.$transaction(async (tx) => {
                const newComment = await tx.comment.create({
                    data: {
                        listingId,
                        authorId,
                        targetId,
                        content,
                        rating: rating ?? null,
                        parentId: parentId ?? null,
                    }
                });

                if (rating && !parentId) {
                    await tx.user.update({
                        where: { id: targetId },
                        data: {
                            rating_sum: { increment: rating },
                            rating_count: { increment: 1 }
                        }
                    });
                }
                return newComment;
            });

            await createActivityLog({
                actor: authorId,
                action: "COMMENT_CREATED",
                entity_type: "Comment",
                entity_id: result.id,
                metadata: {
                    listingId,
                    targetId,
                    isReply: !!parentId,
                    hasRating: !!rating
                }
            });

            return result;
        },

        // ─── UPDATE COMMENT ───
        updateComment: async (_parent: any, { commentId, input }: any, context: GraphQLContext) => {
            checkAuth(context);
            const parsed = updateCommentSchema.safeParse(input);
            if (!parsed.success) throw new Error(`Validasyon Hatası: ${parsed.error.issues[0].message}`);

            const comment = await context.prisma.comment.findFirst({
                where: { id: commentId, authorId: context.userId!, is_deleted: false }
            });
            if (!comment) throw new Error("Yorum bulunamadı.");

            if (parsed.data.rating !== undefined && comment.parentId) {
                throw new Error("Yanıtlara puan verilemez.");
            }

            const updateData: any = { is_edited: true };
            if (parsed.data.content !== undefined) updateData.content = parsed.data.content;

            await context.prisma.$transaction(async (tx) => {
                if (parsed.data.rating !== undefined && !comment.parentId && comment.rating !== null) {
                    const diff = parsed.data.rating - comment.rating;
                    if (diff !== 0) {
                        await tx.user.update({
                            where: { id: comment.targetId },
                            data: { rating_sum: { increment: diff } }
                        });
                    }
                    updateData.rating = parsed.data.rating;
                }

                await tx.comment.update({
                    where: { id: comment.id },
                    data: updateData
                });
            });

            await createActivityLog({
                actor: context.userId!,
                action: "COMMENT_UPDATED",
                entity_type: "Comment",
                entity_id: comment.id,
                metadata: { hasRatingChanged: parsed.data.rating !== undefined }
            });

            // Prisma'da güncel veriyi dönmek için
            return context.prisma.comment.findUnique({ where: { id: comment.id } });
        },

        // ─── DELETE COMMENT ───
        deleteComment: async (_parent: any, { commentId }: any, context: GraphQLContext) => {
            checkAuth(context);

            const comment = await context.prisma.comment.findFirst({
                where: { id: commentId, authorId: context.userId! }
            });
            if (!comment) throw new Error("Yorum bulunamadı.");

            const replyCount = await context.prisma.comment.count({
                where: { parentId: comment.id }
            });

            await context.prisma.$transaction(async (tx) => {
                if (replyCount > 0) {
                    // Soft Delete
                    await tx.comment.update({
                        where: { id: comment.id },
                        data: {
                            content: '[bu yorum silindi]',
                            rating: null,
                            is_deleted: true,
                            is_edited: false
                        }
                    });
                } else {
                    // Hard Delete
                    await tx.comment.delete({ where: { id: comment.id } });
                }

                // Puanı geri al
                if (comment.rating && !comment.parentId) {
                    const targetUser = await tx.user.findUnique({ where: { id: comment.targetId } });
                    if (targetUser) {
                        await tx.user.update({
                            where: { id: comment.targetId },
                            data: {
                                rating_sum: Math.max(0, targetUser.rating_sum - comment.rating),
                                rating_count: Math.max(0, targetUser.rating_count - 1)
                            }
                        });
                    }
                }
            });

            await createActivityLog({
                actor: context.userId!,
                action: "COMMENT_DELETED",
                entity_type: "Comment",
                entity_id: comment.id,
                metadata: {
                    targetId: comment.targetId,
                    isSoftDelete: replyCount > 0 // İleride admin panelinden bakarken gerçekten mi silindi yoksa içeriği mi gizlendi anlamak için
                }
            });

            return true;
        }
    },

    // ─── FIELD RESOLVERS ───
    Comment: {
        author: (parent: any, _args: any, context: GraphQLContext) => context.prisma.user.findUnique({ where: { id: parent.authorId } }),
        target: (parent: any, _args: any, context: GraphQLContext) => context.prisma.user.findUnique({ where: { id: parent.targetId } }),
        listing: (parent: any, _args: any, context: GraphQLContext) => context.prisma.listing.findUnique({ where: { id: parent.listingId } }),
        parent: (parent: any, _args: any, context: GraphQLContext) => parent.parentId ? context.prisma.comment.findUnique({ where: { id: parent.parentId } }) : null,

        // Mongoose lookup'ın Prisma Karşılığı (Eğer Query'de _count çekildiyse onu kullanır, yoksa kendisi anlık sayar)
        reply_count: async (parent: any, _args: any, context: GraphQLContext) => {
            if (parent._count?.replies !== undefined) {
                return parent._count.replies;
            }
            return context.prisma.comment.count({ where: { parentId: parent.id } });
        }
    }
};