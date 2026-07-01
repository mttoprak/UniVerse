import { GraphQLContext } from "../context";
import { checkAuth } from "../guards";
import bcrypt from "bcryptjs";
import GraphQLJSON from "graphql-type-json";
import { v2 as cloudinary } from "cloudinary";
import {pubsub, SUBSCRIPTION_EVENTS} from "../../utils/pubsub.util";

const generateCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString();

export const userResolvers = {
    // Şemadaki JSON scalar alanının çözülmesi için
    JSON: GraphQLJSON,

    // ─── FIELD RESOLVERS (KÖPRÜLER) ───────────────────────────────────────
    // Prisma'daki isimlerle GraphQL'in beklediği isimleri eşleştirdiğimiz yer
    User: {
        // Prisma: favorite_listings -> GraphQL: favoriteListings
        favoriteListings: async (parent: any, _args: any, context: GraphQLContext) => {
            // Eğer üst sorguda include ile çekildiyse direkt dön
            if (parent.favorite_listings) return parent.favorite_listings;

            const user = await context.prisma.user.findUnique({
                where: { id: parent.id },
                include: { favorite_listings: { where: { status: "active" } } }
            });
            return user?.favorite_listings || [];
        },

        // Prisma: SavedList Tablosu -> GraphQL: saved_listings JSON objesi
        saved_listings: async (parent: any, _args: any, context: GraphQLContext) => {
            const savedItems = await context.prisma.savedList.findMany({
                where: { userId: parent.id }
            });

            const groupedObject: Record<string, string[]> = {};
            savedItems.forEach(item => {
                if (!groupedObject[item.name]) groupedObject[item.name] = [];
                groupedObject[item.name].push(item.listingId);
            });
            return groupedObject;
        }
    },

    // ─── QUERY RESOLVERS ──────────────────────────────────────────────────
    Query: {
        getMe: async (_parent: any, _args: any, context: GraphQLContext) => {
            checkAuth(context);
            return context.user;
        },

        getPublicProfile: async (_parent: any, args: { id: string }, context: GraphQLContext) => {
            checkAuth(context);

            const user = await context.prisma.user.findUnique({
                where: { id: args.id },
                select: {
                    id: true, username: true, name: true, surname: true,
                    profile_photo: true, university: true, rating_sum: true,
                    rating_count: true, createdAt: true
                }
            });

            if (!user) throw new Error("Kullanıcı bulunamadı");

            const listing_count = await context.prisma.listing.count({
                where: { ownerId: args.id, status: "active" }
            });

            return { user, listing_count };
        },

        getPublicProfileByUsername: async (_parent: any, args: { username: string }, context: GraphQLContext) => {
            checkAuth(context);

            const user = await context.prisma.user.findUnique({
                where: { username: args.username },
                select: {
                    id: true, username: true, name: true, surname: true,
                    profile_photo: true, university: true, rating_sum: true,
                    rating_count: true, createdAt: true
                }
            });

            if (!user) throw new Error("Kullanıcı bulunamadı");

            const listing_count = await context.prisma.listing.count({
                where: { ownerId: user.id, status: "active" }
            });

            return { user, listing_count };
        },

        getFavoriteListings: async (_parent: any, _args: any, context: GraphQLContext) => {
            checkAuth(context);

            if (context.user?.account_type !== "student") {
                throw new Error("Sadece öğrenciler favori ilanlarına erişebilir.");
            }

            const user = await context.prisma.user.findUnique({
                where: { id: context.userId! },
                include: {
                    favorite_listings: { // DİKKAT: Prisma şemasındaki adıyla çağırıyoruz
                        where: { status: "active" },
                        include: { owner: true }
                    }
                }
            });

            if (!user) throw new Error("Kullanıcı bulunamadı");
            return user.favorite_listings;
        },

        getSavedListings: async (_parent: any, _args: any, context: GraphQLContext) => {
            checkAuth(context);
            if (context.user?.account_type !== "student") {
                throw new Error("Sadece öğrenciler kaydedilmiş listelere erişebilir.");
            }

            // DİKKAT: Artık User içinden değil, direkt SavedList tablosundan çekiyoruz
            const savedItems = await context.prisma.savedList.findMany({
                where: { userId: context.userId! },
                include: {
                    listing: {
                        include: { owner: true }
                    }
                }
            });

            const groupedListings: Record<string, any[]> = {};

            savedItems.forEach(item => {
                if (item.listing.status === "active") {
                    if (!groupedListings[item.name]) groupedListings[item.name] = [];
                    groupedListings[item.name].push(item.listing);
                }
            });

            return groupedListings;
        }
    },

    // ─── MUTATION RESOLVERS ───────────────────────────────────────────────
    Mutation: {
        updateUser: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            checkAuth(context);

            const { username, name, surname, password } = args.input;
            const updateData: any = {};

            if (name) updateData.name = name;
            if (surname) updateData.surname = surname;
            if (username) updateData.username = username;
            if (password) updateData.password = await bcrypt.hash(password, 12);

            const updatedUser = await context.prisma.user.update({
                where: { id: context.userId! },
                data: updateData
            });

            return updatedUser;
        },

        sendEduVerification: async (_parent: any, _args: any, context: GraphQLContext) => {
            checkAuth(context);

            const user = context.user;

            if (user?.account_type !== "student") throw new Error("Sadece öğrenciler edu mail ekleyebilir.");
            if (!user?.edu_email) throw new Error("Edu Mail adresi bulunamadı.");
            if (user?.is_verified) throw new Error("Kullanıcı zaten doğrulanmış bir öğrenci.");

            const code = generateCode();
            const hashedCode = await bcrypt.hash(code, 10);
            const expires = new Date(Date.now() + 10 * 60 * 1000);

            await context.prisma.pendingVerification.upsert({
                where:  { email: user.edu_email },
                update: { code: hashedCode, expires },
                create: { email: user.edu_email, code: hashedCode, expires },
            });

            if (process.env.DEVPROCESS === "true") {
                console.log(`[DEV] Generated Code for ${user.edu_email}: ${code}`);
            }

            return "Doğrulama kodu başarıyla gönderildi.";
        },

        verifyEduMail: async (_parent: any, args: { input: { code: string } }, context: GraphQLContext) => {
            checkAuth(context);

            const { code } = args.input;
            const user = context.user;

            if (user?.account_type !== "student") throw new Error("Sadece öğrenciler edu mail ekleyebilir.");
            if (!user?.edu_email) throw new Error("Edu Mail adresi bulunamadı.");
            if (user?.is_verified) throw new Error("Kullanıcı zaten doğrulanmış bir öğrenci.");

            const verification = await context.prisma.pendingVerification.findUnique({
                where: { email: user.edu_email }
            });

            if (!verification) throw new Error("Doğrulama talebi bulunamadı veya süresi dolmuş.");
            if (new Date() > verification.expires) throw new Error("Doğrulama kodunun süresi dolmuş. Lütfen yeni bir kod isteyin.");

            const isCodeValid = await bcrypt.compare(code, verification.code);
            const isDevBypass = process.env.DEVPROCESS === "true" && code === "000000";

            if (!isCodeValid && !isDevBypass) throw new Error("Geçersiz doğrulama kodu.");

            await context.prisma.$transaction([
                context.prisma.user.update({
                    where: { id: user.id },
                    data: { is_verified: true }
                }),
                context.prisma.pendingVerification.delete({
                    where: { email: user.edu_email }
                })
            ]);

            return "Edu mail adresiniz başarıyla doğrulandı.";
        },

        toggleFavorite: async (_parent: any, args: { listingId: string }, context: GraphQLContext) => {
            checkAuth(context);
            if (context.user?.account_type !== "student") {
                throw new Error("Sadece öğrenciler favori ekleyebilir/çıkarabilir.");
            }

            const { listingId } = args;

            const listing = await context.prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing) throw new Error("İlan bulunamadı");

            const user = await context.prisma.user.findUnique({
                where: { id: context.userId! },
                include: { favorite_listings: { where: { id: listingId } } } // DİKKAT: favorite_listings
            });

            const alreadyFavorited = user!.favorite_listings.length > 0;

            if (alreadyFavorited) {
                await context.prisma.$transaction([
                    context.prisma.user.update({
                        where: { id: context.userId! },
                        data: { favorite_listings: { disconnect: { id: listingId } } } // DİKKAT: favorite_listings
                    }),
                    context.prisma.listing.update({
                        where: { id: listingId },
                        data: { save_count: { decrement: 1 } }
                    })
                ]);
                return { favorited: false };
            } else {
                await context.prisma.$transaction([
                    context.prisma.user.update({
                        where: { id: context.userId! },
                        data: { favorite_listings: { connect: { id: listingId } } } // DİKKAT: favorite_listings
                    }),
                    context.prisma.listing.update({
                        where: { id: listingId },
                        data: { save_count: { increment: 1 } }
                    })
                ]);
                return { favorited: true };
            }
        },

        addToSaved: async (_parent: any, args: { input: { listingId: string, listName: string } }, context: GraphQLContext) => {
            checkAuth(context);
            if (context.user?.account_type !== "student") {
                throw new Error("Sadece öğrenciler listelere erişebilir.");
            }

            const { listingId, listName } = args.input;

            const listing = await context.prisma.listing.findUnique({ where: { id: listingId } });
            if (!listing) throw new Error("İlan bulunamadı");

            // Kayıt tablosunda bu listeye bu ilan eklenmiş mi kontrol et
            const existingRecord = await context.prisma.savedList.findFirst({
                where: { userId: context.userId!, name: listName, listingId }
            });

            const alreadyInList = !!existingRecord;

            if (alreadyInList) {
                // Listeden Çıkar (Toggle)
                await context.prisma.savedList.delete({
                    where: { id: existingRecord!.id }
                });
            } else {
                // Listeye Ekle
                await context.prisma.savedList.create({
                    data: { name: listName, userId: context.userId!, listingId }
                });
            }

            // Frontend için tüm listeleri GraphQL tipine uygun olarak grupla
            const allSavedItems = await context.prisma.savedList.findMany({
                where: { userId: context.userId! }
            });

            const savedObject: Record<string, string[]> = {};
            allSavedItems.forEach(item => {
                if (!savedObject[item.name]) savedObject[item.name] = [];
                savedObject[item.name].push(item.listingId);
            });

            return {
                saved: !alreadyInList,
                listName,
                saved_listings: savedObject
            };
        },

        removeFromSaved: async (_parent: any, args: { input: { listingId: string, listName: string } }, context: GraphQLContext) => {
            checkAuth(context);
            if (context.user?.account_type !== "student") throw new Error("Erişim reddedildi.");

            const { listingId, listName } = args.input;

            // Listeden belirli ilanı tamamen kaldırıyoruz
            await context.prisma.savedList.deleteMany({
                where: { userId: context.userId!, name: listName, listingId }
            });

            // Frontend'i güncel tutmak için kalan listeleri obje yapısına çeviriyoruz
            const allSavedItems = await context.prisma.savedList.findMany({
                where: { userId: context.userId! }
            });

            const savedObject: Record<string, string[]> = {};
            allSavedItems.forEach(item => {
                if (!savedObject[item.name]) savedObject[item.name] = [];
                savedObject[item.name].push(item.listingId);
            });

            return {
                removed: true,
                listName,
                saved_listings: savedObject
            };
        },

        changePassword: async (_parent: any, args: { input: { oldPassword?: string, newPassword: string } }, context: GraphQLContext) => {
            checkAuth(context);

            const { oldPassword, newPassword } = args.input;
            const user = await context.prisma.user.findUnique({ where: { id: context.userId! } });

            if (!user) throw new Error("Kullanıcı bulunamadı");

            const hasExistingPassword = !!user.password;

            if (hasExistingPassword) {
                if (!oldPassword) throw new Error("Mevcut şifrenizi girmelisiniz.");
                const isMatch = await bcrypt.compare(oldPassword, user.password!);
                if (!isMatch) throw new Error("Eski şifreniz yanlış.");
            }

            const hashedPassword = await bcrypt.hash(newPassword, 12);
            await context.prisma.user.update({
                where: { id: context.userId! },
                data: { password: hashedPassword }
            });

            return hasExistingPassword
                ? "Şifreniz başarıyla değiştirildi."
                : "Şifreniz başarıyla oluşturuldu. Artık e-posta ve şifrenizle de giriş yapabilirsiniz.";
        },

        updateProfilePhoto: async (_parent: any, args: { photoUrl: string }, context: GraphQLContext) => {
            checkAuth(context);

            if (!args.photoUrl) {
                throw new Error("Lütfen bir fotoğraf URL'i sağlayın.");
            }

            // Kullanıcıyı veritabanında yeni URL ile güncelle
            const updatedUser = await context.prisma.user.update({
                where: { id: context.userId! },
                data: { profile_photo: args.photoUrl }
            });

            // REST mimarindeki Loglamanın birebir Prisma versiyonu
            await context.prisma.activityLog.create({
                data: {
                    actorId: context.userId!,
                    action: "PROFILE_PHOTO_CHANGED",
                    entity_type: "User",
                    entity_id: context.userId!,
                    metadata: { photoUrl: args.photoUrl }
                }
            });

            return updatedUser.profile_photo || "";
        },

        generateUploadSignatureUser: async (_parent: any, args: { folderName: string }, context: GraphQLContext) => {
            checkAuth(context);

            const timestamp = Math.round(new Date().getTime() / 1000);
            const folder = args.folderName;

            const signature = cloudinary.utils.api_sign_request(
                {
                    timestamp: timestamp,
                    folder: folder,
                },
                process.env.CLOUDINARY_API_SECRET!
            );

            return {
                timestamp,
                signature,
                cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
                apiKey: process.env.CLOUDINARY_API_KEY!,
                folder
            };
        }
    },
    Subscription: {
        systemAnnouncement: {
            subscribe: (_parent: any, _args: any, context: GraphQLContext) => {
                // Sadece sisteme giriş yapmış (online) kullanıcıların dinleyebilmesi için güvenlik:
                if (!context.userId) {
                    throw new Error("Giriş yapmalısınız.");
                }

                // Filtre yok! Bu kanala abone olan HERKES publish edilen veriyi anında alır.
                return pubsub.asyncIterableIterator(SUBSCRIPTION_EVENTS.SYSTEM_ANNOUNCEMENT);
            }
        }
    }
};