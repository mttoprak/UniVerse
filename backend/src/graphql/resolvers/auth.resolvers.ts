import { GraphQLContext } from "../context";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { signTempToken, signAccessToken } from "../../utils/token.utils";
import { localRegisterSchema, loginSchema } from "../../validators/auth.validator";
import { createActivityLog } from "../../utils/logger.util";
import {studentOnly} from "../../middleware/middleware";
import {checkAuth} from "../guards";
import {sendPasswordResetEmail, sendVerificationEmail} from "../../utils/mail.utils";


const generateCode = (): string => Math.floor(100000 + Math.random() * 900000).toString();


export const authResolvers = {
    Mutation: {

        sendVerification: async (_parent: any, args: { email: string }, context: GraphQLContext) => {
            const { email } = args;
            const code = generateCode();
            const hashedCode = await bcrypt.hash(code, 10);
            const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 dakika geçerli

            // Prisma ile upsert (Varsa güncelle, yoksa yeni oluştur)
            await context.prisma.pendingVerification.upsert({
                where: { email },
                update: { code: hashedCode, expires },
                create: { email, code: hashedCode, expires },
            });

            await sendVerificationEmail(email, code);

            // Geliştirme ortamı (Logda görelim diye)
            console.log(`[DEV] Verification code for ${email}: ${code}`);

            return {
                success: true,
                message: "Doğrulama kodu e-posta adresinize gönderildi.",
            };

        },

        register: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            // 1. Zod Validasyonu
            const parsed = localRegisterSchema.safeParse(args.input);
            if (!parsed.success) {
                throw new Error("Geçersiz girdi: " + JSON.stringify(z.treeifyError(parsed.error)));
            }

            const { email, password, name, surname, account_type, code } = parsed.data;

            // 2. Doğrulama (Verification) Kontrolü
            const verification = await context.prisma.pendingVerification.findUnique({
                where: { email }
            });

            if (!verification) throw new Error("There is no verification");

            const comparization = await bcrypt.compare(code, verification.code);
            if (!comparization) {
                if (process.env.DEVPROCESS == "true" && code === "000000") {
                    // Geliştirici ortamı bypass'ı
                } else {
                    throw new Error("Wrong verification code");
                }
            }

            // 3. Email kullanılıyor mu? (Mongoose findOne -> Prisma findUnique)
            const existing = await context.prisma.user.findUnique({ where: { email } });
            if (existing) throw new Error("This email already in use");

            // 4. Şifreyi Hashle ve Kullanıcıyı Yarat
            const hashed = await bcrypt.hash(password, 12);
            const user = await context.prisma.user.create({
                data: {
                    email,
                    password: hashed,
                    name,
                    surname,
                    account_type,
                    auth_provider: "local",
                    is_complete: false,
                    is_verified: false,
                }
            });

            // 5. Activity Log (Prisma versiyonu)
            await createActivityLog({
                // GraphQL context'inde req/res'i paslamak istersen context'ten alabilirsin
                actor: user.id, // user._id yerine user.id
                action: "ACCOUNT_CREATED",
                entity_type: "User",
                entity_id: user.id,
                metadata: {
                    email,
                    password: hashed,
                    name,
                    surname,
                    account_type,
                    auth_provider: "local",
                }
            });

            // 6. Temp Token Ver ve Çık
            const tempToken = signTempToken(user.id);

            // PendingVerification kaydını siliyoruz ki kod tekrar kullanılamasın (Opsiyonel ama mantıklı)
            await context.prisma.pendingVerification.delete({ where: { email } });

            return {
                token: tempToken,
                is_complete: false,
                user
            };
        },

        login: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            // 1. Zod Validasyonu
            const parsed = loginSchema.safeParse(args.input);
            if (!parsed.success) {
                throw new Error("Geçersiz girdi");
            }
            const { email, password } = parsed.data;

            // 2. Kullanıcı var mı?
            const user = await context.prisma.user.findUnique({ where: { email } });
            if (!user || !user.password) {
                throw new Error("Username or password is incorrect");
            }

            // 3. Şifre eşleşiyor mu?
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                throw new Error("Username or password is incorrect");
            }

            // 4. Ban Kontrolü
            if (user.is_banned) {
                throw new Error("Your account has been banned");
            }

            // 5. Activity Log
            await createActivityLog({
                actor: user.id,
                action: "USER_LOGIN",
                entity_type: "User",
                entity_id: user.id,
                metadata: { is_complete: user.is_complete }
            });

            // 6. Token Ayrımı (Temp vs Access)
            if (!user.is_complete) {
                const tempToken = signTempToken(user.id);
                return { token: tempToken, is_complete: false, user };
            }

            const accessToken = signAccessToken(user.id);
            return { token: accessToken, is_complete: true, user };
        },

        completeProfile: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            if (!context.user) throw new Error("UNAUTHORIZED: Giriş yapmanız gerekmektedir.");

            const { username, edu_email, birthdate, password, university } = args.input;
            const updateData: any = { is_complete: true };

            // Kullanıcı adı kontrolü
            if (username) {
                const existingUsername = await context.prisma.user.findUnique({ where: { username } });
                if (existingUsername) throw new Error("This username already in use");
                updateData.username = username;
            }

            // Edu email kontrolü
            if (context.user.account_type=="student"){
                if (edu_email) {
                    const existingEduEmail = await context.prisma.user.findUnique({ where: { edu_email } });
                    if (existingEduEmail) throw new Error("This edu email already in use");
                    updateData.edu_email = edu_email;
                }
                else{
                    throw new Error("Öğrenci hesabında Edu Mail gereklidir.");
                }
            }

            if (university) updateData.university = university;
            if (birthdate) updateData.birthdate = new Date(birthdate); // Prisma Date objesi bekler
            if (password) updateData.password = await bcrypt.hash(password, 12);

            // Prisma ile Güncelleme
            const updatedUser = await context.prisma.user.update({
                where: { id: context.userId! },
                data: updateData
            });

            await createActivityLog({
                actor: updatedUser.id,
                action: "COMPLETE_PROFILE",
                entity_type: "User",
                entity_id: updatedUser.id
            });

            const accessToken = signAccessToken(updatedUser.id);
            return {
                token: accessToken,
                is_complete: true,
                user: updatedUser };
        },

        forgotPassword: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            const { usernameOrEmail } = args.input;

            // Prisma'da $or kullanımı (Ya email eşleşecek, ya da username)
            const user = await context.prisma.user.findFirst({
                where: {
                    OR: [
                        { email: usernameOrEmail },
                        { username: usernameOrEmail }
                    ]
                }
            });

            if (user) {
                const code = generateCode();
                const hashedCode = await bcrypt.hash(code, 10);
                const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 dakika

                // Mongoose findOneAndUpdate + upsert mantığının Prisma karşılığı:
                await context.prisma.passwordReset.upsert({
                    where: { email: user.email },
                    update: { code: hashedCode, expires },
                    create: { email: user.email, code: hashedCode, expires }
                });

                await createActivityLog({
                    actor: user.id,
                    action: "FORGOT_PASSWORD",
                    entity_type: "User",
                    entity_id: user.id
                });

                //TODO: Password Reset Email

                await sendPasswordResetEmail(user.email, code);

                if (process.env.DEVPROCESS === "true") {

                }

                console.log(`[DEV] Password reset code for ${user.email}: ${code}`);
            }

            // Kullanıcı bulunsa da bulunmasa da aynı mesajı dönerek güvenliği artırıyoruz (User Enumeration engelleme)
            return { success: true, message: "If an account with those details exists, a password reset email has been sent." };
        },

        verifyResetCode: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            const { email, code } = args.input;

            const resetToken = await context.prisma.passwordReset.findUnique({ where: { email } });

            if (!resetToken || resetToken.expires < new Date()) {
                throw new Error("Invalid or expired code");
            }

            const comparization = await bcrypt.compare(code, resetToken.code);
            if (!comparization) {
                if (process.env.DEVPROCESS === "true" && code === "000000") {
                    // DEV bypass
                } else {
                    throw new Error("Invalid or expired code");
                }
            }

            return { success: true, message: "Code verified" };
        },


        resetPassword: async (_parent: any, args: { input: any }, context: GraphQLContext) => {
            const { email, code, password } = args.input;

            const resetToken = await context.prisma.passwordReset.findUnique({ where: { email } });
            if (!resetToken || resetToken.expires < new Date()) {
                throw new Error("Invalid or expired code");
            }

            const comparization = await bcrypt.compare(code, resetToken.code);
            if (!comparization) {
                if (process.env.DEVPROCESS === "true" && code === "000000") {
                    // DEV bypass
                } else {
                    throw new Error("Invalid or expired code");
                }
            }

            const user = await context.prisma.user.findUnique({ where: { email } });
            if (!user) throw new Error("User not found");

            // Yeni şifreyi kaydet
            const hashedPassword = await bcrypt.hash(password, 12);
            const updatedUser = await context.prisma.user.update({
                where: { email },
                data: { password: hashedPassword }
            });

            // İşlem bitince şifre sıfırlama kaydını sil
            await context.prisma.passwordReset.delete({ where: { email } });

            // Kullanıcıyı direkt içeri alıyoruz (Full access)
            const accessToken = signAccessToken(updatedUser.id);

            return {
                token: accessToken,
                is_complete: updatedUser.is_complete,
                user: updatedUser
            };
        }

    }
};