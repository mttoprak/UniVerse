import {GraphQLContext, prisma} from "../context";
import { checkAuth } from "../guards";
import bcrypt from "bcryptjs";
import GraphQLJSON from "graphql-type-json"; // JSON verilerini çözebilmesi için ekledik

const generateCode = (): string =>
    Math.floor(100000 + Math.random() * 900000).toString()

export const userResolvers = {
    // Şemadaki "scalar JSON" ifadesinin nasıl çözüleceğini GraphQL'e öğretiyoruz
    JSON: GraphQLJSON,

    // REST'teki GET isteklerinin karşılığı (Veri çekme)
    Query: {
        // EKSİK 1: getMe Eklendi
        getMe: async (_parent: any, _args: any, context: GraphQLContext) => {
            // Sadece giriş yapmış kullanıcılar kendi bilgisini çekebilir
            // checkAuth(context); TODO BURAYI AÇ
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

            // İlan sayısını da ekliyoruz (Eski listingCount mantığı)
            const listing_count = await context.prisma.listing.count({
                where: { ownerId: args.id, status: "active" }
            });

            return { user, listing_count };
        }
    },

    // REST'teki POST, PATCH, DELETE isteklerinin karşılığı (Veri değiştirme)
    Mutation: {

        updateUser: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            // 1. Yetki Kontrolü
            checkAuth(context);

            const { username, name, surname, password } = args.input;
            const updateData: any = {};

            if (name) updateData.name = name;
            if (surname) updateData.surname = surname;
            if (username) updateData.username = username;
            if (password) updateData.password = await bcrypt.hash(password, 12);

            // 2. Prisma ile Güncelleme
            const updatedUser = await context.prisma.user.update({
                where: { id: context.userId! },
                data: updateData
            });

            return updatedUser;
        },

        sendEduVerification: async (_parent: any, _args: any, context: GraphQLContext) => {
            checkAuth(context);

            const user = context.user;

            // 1. Guard Clauses (Kontroller)
            if (user?.account_type !== "student") {
                throw new Error("Sadece öğrenciler edu mail ekleyebilir.");
            }
            if (!user?.edu_email) {
                throw new Error("Edu Mail adresi bulunamadı.");
            }
            if (user?.is_verified) {
                throw new Error("Kullanıcı zaten doğrulanmış bir öğrenci.");
            }

            // 2. Kod Üretimi ve Hashleme
            const code = generateCode(); // Bu fonksiyonun 6 haneli string ürettiğini varsayıyoruz
            const hashedCode = await bcrypt.hash(code, 10);
            const expires = new Date(Date.now() + 10 * 60 * 1000); // +10 dakika

            // 3. Veritabanına Kayıt (Upsert)
            await context.prisma.pendingVerification.upsert({
                where:  { email: user.edu_email },
                update: { code: hashedCode, expires },
                create: { email: user.edu_email, code: hashedCode, expires },
            });

            // TODO: Burada mail gönderme fonksiyonunu çağırmalısın (örn: sendMail(user.edu_email, code))
            if (process.env.DEVPROCESS === "true") {
                console.log(`[DEV] Generated Code for ${user.edu_email}: ${code}`);
            }

            return "Doğrulama kodu başarıyla gönderildi.";
        },

        verifyEduMail: async (_parent: any, args: { input: { code: string } }, context: GraphQLContext) => {
            checkAuth(context);

            const { code } = args.input;
            const user = context.user;

            // 1. Guard Clauses
            if (user?.account_type !== "student") {
                throw new Error("Sadece öğrenciler edu mail ekleyebilir.");
            }
            if (!user?.edu_email) {
                throw new Error("Edu Mail adresi bulunamadı.");
            }
            if (user?.is_verified) {
                throw new Error("Kullanıcı zaten doğrulanmış bir öğrenci.");
            }

            // 2. Bekleyen Doğrulama Var mı Kontrolü
            const verification = await context.prisma.pendingVerification.findUnique({
                where: { email: user.edu_email }
            });

            if (!verification) {
                throw new Error("Doğrulama talebi bulunamadı veya süresi dolmuş.");
            }

            // 3. Süre Kontrolü (Expire Check)
            if (new Date() > new Date(verification.expires)) {
                throw new Error("Doğrulama kodunun süresi dolmuş. Lütfen yeni bir kod isteyin.");
            }

            // 4. Kod Eşleşme Kontrolü & Dev Mode Bypass
            const isCodeValid = await bcrypt.compare(code, verification.code);
            const isDevBypass = process.env.DEVPROCESS === "true" && code === "000000";

            if (!isCodeValid && !isDevBypass) {
                throw new Error("Geçersiz doğrulama kodu.");
            }

            // 5. Başarılı Senaryo: Kullanıcıyı doğrula ve geçici veriyi sil (Transaction ile)
            await context.prisma.$transaction([
                // Kullanıcıyı doğrulanmış yap
                context.prisma.user.update({
                    where: { id: user.id },
                    data: { is_verified: true }
                }),
                // Kullanılan kodu temizle
                context.prisma.pendingVerification.delete({
                    where: { email: user.edu_email }
                })
            ]);

            return "Edu mail adresiniz başarıyla doğrulandı.";
        }
    }
};