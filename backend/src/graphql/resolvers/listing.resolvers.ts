    import { z, ZodError } from "zod";
    import { createActivityLog } from "../../utils/logger.util";
    import { GraphQLContext } from "../context";
    import cloudinary from "../../utils/cloudinary/cloudinary.config"; // Kendi dosya yoluna göre ayarla
    import {checkAuth, checkStudentOnly} from "../guards";
    import {createListingSchema, listingSchemasMap} from "../../validators/listing.validator";
    import GraphQLJSON from "graphql-type-json";

    export const listingResolvers = {
        JSON: GraphQLJSON,  // <-- SADECE BU SATIRI EKLE
        Query: {
            // ─── GET ONE ───────────────────────────────────────────────────────
            getListing: async (_parent: any, args: { id: string }, context: GraphQLContext) => {
                const listing = await context.prisma.listing.findUnique({
                    where: { id: args.id }
                });

                if (!listing) throw new Error("İlan bulunamadı.");

                let isStudent = false;
                let isOwner = false;

                if (context.userId) {
                    const currentUser = await context.prisma.user.findUnique({
                        where: { id: context.userId },
                        select: { account_type: true } // Sadece gerekeni çekiyoruz
                    });

                    if (currentUser) {
                        isStudent = currentUser.account_type === "student";
                    }
                    isOwner = context.userId === listing.ownerId;
                }

                if (!isStudent && !isOwner) {
                    throw new Error("Sadece öğrenciler veya ilanın sahibi bu ilanı görüntüleyebilir.");
                }

                // Görüntülenme sayısını artır
                const updatedListing = await context.prisma.listing.update({
                    where: { id: args.id },
                    data: { views: { increment: 1 } }
                });

                // TODO: İleride Offer modülünü bağladığımızda offerStatus mantığını buraya ekleyeceğiz

                return updatedListing;
            },

            // ─── GET MANY (Arama ve Filtreleme) ────────────────────────────────
            getListings: async (_parent: any, args: { q?: string, type?: string, category?: string, sort?: string, page?: number, limit?: number }, context: GraphQLContext) => {
                // Sadece öğrenciler listeleyebilir (Middleware karşılığı)
                checkStudentOnly(context);

                const pageNum = Math.max(1, args.page || 1);
                const limitNum = Math.max(1, args.limit || 20);

                // 1. TEMEL KURALLAR (Herkesin uyması gerekenler)
                // Bu kurallar HER DURUMDA sağlanmalı (AND)
                const baseConditions: any[] = [
                    { status: "active" },
                    { is_deleted: false },
                    {
                        OR: [
                            { expires: { gt: new Date() } },
                            { expires: null }
                        ]
                    }
                ];

                if (args.type) {
                    // "job,scholarship" -> ["job", "scholarship"]
                    baseConditions.push({ type: { in: args.type.split(',') } });
                }

                if (args.category) {
                    baseConditions.push({ category: { in: args.category.split(',') } });
                }
                // 3. ARAMA KELİMESİ FİLTRESİ
                if (args.q) {
                    // Eğer arama kelimesi varsa, bu kelime Başlık VEYA Açıklama içinde geçmeli
                    baseConditions.push({
                        OR: [
                            { title: { contains: args.q, mode: "insensitive" } },
                            { description: { contains: args.q, mode: "insensitive" } }
                        ]
                    });
                }

                // SIRALAMA MANTIĞI
                let orderBy: any = { createdAt: "desc" };
                if (args.sort === "oldest") orderBy = { createdAt: "asc" };
                if (args.sort === "price_asc") orderBy = { price: "asc" };
                if (args.sort === "price_desc") orderBy = { price: "desc" };
                if (args.sort === "popular") orderBy = { views: "desc" };

                // SONUÇLARI PRISMA'DAN ÇEK
                return await context.prisma.listing.findMany({
                    where: {
                        AND: baseConditions // Tüm kurallar aynı anda sağlanmalı
                    },
                    orderBy,
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                });
            },

            // ─── FEED ──────────────────────────────────────────────────────────
            getFeedListings: async (_parent: any, args: { page?: number, limit?: number }, context: GraphQLContext) => {
                checkStudentOnly(context);

                const pageNum = Math.max(1, args.page || 1);
                const limitNum = Math.max(1, args.limit || 20);

                return await context.prisma.listing.findMany({
                    where: {
                        status: "active",
                        is_deleted: false,
                        type: { not: "urgent" }, // Acil ilanları dışla
                        OR: [{ expires: { gt: new Date() } }, { expires: null }]
                    },
                    orderBy: { createdAt: "desc" },
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                });
            },

            // ─── URGENT FEED ───────────────────────────────────────────────────
            getUrgentListings: async (_parent: any, args: { page?: number, limit?: number }, context: GraphQLContext) => {
                checkStudentOnly(context);

                const pageNum = Math.max(1, args.page || 1);
                const limitNum = Math.max(1, args.limit || 20);

                return await context.prisma.listing.findMany({
                    where: {
                        status: "active",
                        is_deleted: false,
                        type: "urgent", // Sadece aciller
                        OR: [{ expires: { gt: new Date() } }, { expires: null }]
                    },
                    orderBy: { createdAt: "desc" },
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                });
            },

            // ─── KULLANICI İLANLARI ────────────────────────────────────────────
            getUserListings: async (_parent: any, args: { userId: string }, context: GraphQLContext) => {
                checkStudentOnly(context);

                return await context.prisma.listing.findMany({
                    where: {
                        ownerId: args.userId,
                        status: "active",
                        is_deleted: false,
                        OR: [{ expires: { gt: new Date() } }, { expires: null }]
                    },
                    orderBy: { createdAt: "desc" }
                });
            },

            // ─── BENİM İLANLARIM ───────────────────────────────────────────────
            getMyListings: async (_parent: any, _args: any, context: GraphQLContext) => {
                checkAuth(context);

                return await context.prisma.listing.findMany({
                    where: {
                        ownerId: context.userId!,
                        is_deleted: false
                    },
                    orderBy: {createdAt: "desc"}
                });
            }
        },

        Mutation: {
            // ─── CREATE ────────────────────────────────────────────────────────
            createListing: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
                checkStudentOnly(context);

                const parsed = createListingSchema.safeParse(args.input);
                if (!parsed.success) {
                    throw new Error("Geçersiz girdi: " + JSON.stringify(z.treeifyError(parsed.error)));
                }

                const { expires, photos, ...restData } = parsed.data;
                // Süre (Expires) Hesaplaması
                let expiresDate = new Date();
                if (parsed.data.type === "urgent") {
                    expiresDate.setHours(expiresDate.getHours() + (expires || 24));
                } else {
                    expiresDate.setMonth(expiresDate.getMonth() + 1);
                }

                const newListing = await context.prisma.listing.create({
                    data: {
                        ...restData, // İçinde expires olmayan temiz veri!
                        expires: expiresDate, // Tarih objesi olan expires'ı biz veriyoruz
                        photos: photos || [], // URL dizisi
                        ownerId: context.userId!,
                        status: "active",
                    }
                });

                await createActivityLog({
                    actor: context.userId!,
                    action: "LISTING_CREATED",
                    entity_type: "Listing",
                    entity_id: newListing.id
                });

                return newListing;
            },

            // ─── UPDATE ────────────────────────────────────────────────────────
            updateListing: async (_parent: any, args: { id: string, input: any }, context: GraphQLContext) => {
                checkAuth(context);

                const listing = await context.prisma.listing.findUnique({
                    where: { id: args.id }
                });

                if (!listing) throw new Error("İlan bulunamadı.");
                if (listing.ownerId !== context.userId) throw new Error("Bu ilanı düzenleme yetkiniz yok.");

                // 1. İlanın tipine göre NOKTA ATIŞI şemayı buluyoruz (Örn: roommateSchema)
                const exactSchema = listingSchemasMap[listing.type as keyof typeof listingSchemasMap];

                if (!exactSchema) throw new Error("Geçersiz ilan tipi.");

                // 2. Bulduğumuz bu spesifik şemayı hepsi opsiyonel olacak şekilde Update şemasına çeviriyoruz
                const dynamicUpdateSchema = exactSchema.partial();

                // Artık input'a "type" enjekte etmemize bile gerek yok, çünkü şema zaten belli!
                const parsed = dynamicUpdateSchema.safeParse(args.input);

                if (!parsed.success) {
                    throw new Error("Geçersiz girdi: " + JSON.stringify(z.treeifyError(parsed.error as ZodError)));
                }

                const { expires, photos, type, ...restUpdateData } = parsed.data as any;

                const prismaUpdatePayload: any = { ...restUpdateData };

                if (photos !== undefined) {
                    prismaUpdatePayload.photos = photos;
                }

                if (expires !== undefined) {
                    if (listing.type !== "urgent") {
                        throw new Error("Normal ilanlar için geçerlilik süresi manuel olarak güncellenemez.");
                    }
                    const expiresDate = new Date();
                    expiresDate.setHours(expiresDate.getHours() + expires);
                    prismaUpdatePayload.expires = expiresDate;
                }

                const updatedListing = await context.prisma.listing.update({
                    where: { id: args.id },
                    data: prismaUpdatePayload
                });

                await createActivityLog({
                    actor: context.userId!,
                    action: "LISTING_UPDATED",
                    entity_type: "Listing",
                    entity_id: updatedListing.id
                });

                return updatedListing;
            },

            // ─── DELETE (SOFT DELETE) ──────────────────────────────────────────
            deleteListing: async (_parent: any, args: { id: string }, context: GraphQLContext) => {
                checkAuth(context);

                const listing = await context.prisma.listing.findUnique({
                    where: { id: args.id }
                });

                if (!listing) throw new Error("İlan bulunamadı.");
                if (listing.ownerId !== context.userId) throw new Error("Bu ilanı silme yetkiniz yok.");

                await context.prisma.listing.update({
                    where: { id: args.id },
                    data: {
                        is_deleted: true,
                        status: "closed"
                    }
                });

                await createActivityLog({
                    actor: context.userId!,
                    action: "LISTING_DELETED",
                    entity_type: "Listing",
                    entity_id: args.id
                });

                return true;
            },

            // ─── REPUBLISH ─────────────────────────────────────────────────────
            republishListing: async (_parent: any, args: { id: string }, context: GraphQLContext) => {
                checkAuth(context);

                const listing = await context.prisma.listing.findUnique({
                    where: { id: args.id }
                });

                if (!listing) throw new Error("İlan bulunamadı.");
                if (listing.ownerId !== context.userId) throw new Error("Yetkiniz yok.");
                if (listing.status === "active") throw new Error("Bu ilan zaten aktif durumda.");

                const now = new Date();
                const isExpired = !listing.expires || listing.expires <= now || listing.status === "expired";

                const updateData: any = {
                    status: "active",
                    is_deleted: false
                };

                if (isExpired) {
                    const expiresDate = new Date();
                    if (listing.type === "urgent") {
                        expiresDate.setHours(expiresDate.getHours() + 24);
                    } else {
                        expiresDate.setMonth(expiresDate.getMonth() + 1);
                    }
                    updateData.expires = expiresDate;
                }

                const updatedListing = await context.prisma.listing.update({
                    where: { id: args.id },
                    data: updateData
                });

                await createActivityLog({
                    actor: context.userId!,
                    action: "LISTING_REPUBLISHED",
                    entity_type: "Listing",
                    entity_id: updatedListing.id,
                    metadata: {
                        newExpiresDate: updateData.expires || listing.expires,
                        wasExpired: isExpired
                    }
                });

                return updatedListing;
            },

            generateUploadSignature: async (_parent: any, args: { folderName: string }, context: GraphQLContext) => {
                // 1. Sadece giriş yapmış kullanıcılar resim yükleyebilir
                checkAuth(context);

                // 2. Cloudinary'nin istediği Unix Timestamp (Saniye cinsinden şu anki zaman)
                const timestamp = Math.round(new Date().getTime() / 1000);

                // 3. Resmin yükleneceği klasör (Frontend'den "universe/posts" gibi gelecek)
                const folder = args.folderName;

                // 4. İmzayı Cloudinary kütüphanesiyle şifreleyerek oluştur
                const signature = cloudinary.utils.api_sign_request(
                    {
                        timestamp: timestamp,
                        folder: folder,
                    },
                    process.env.CLOUDINARY_API_SECRET!
                );

                // 5. Frontend'in fetch atarken ihtiyaç duyacağı TÜM cephaneyi geri dön
                return {
                    timestamp,
                    signature,
                    cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
                    apiKey: process.env.CLOUDINARY_API_KEY!,
                    folder
                };
            }

        },

        // ─── GRAPHQL FIELD RESOLVERS (İlişki Bağlantıları) ───────────────────
        Listing: {
            owner: async (parent: any, _args: any, context: GraphQLContext) => {
                return await context.prisma.user.findUnique({
                    where: { id: parent.ownerId }
                });
            }

        }
    };