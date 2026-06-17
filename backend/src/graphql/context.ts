import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient, User } from "@prisma/client";
import jwt from "jsonwebtoken";

// 1. Adapter için gerekli modülleri import et
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// 3. PrismaClient'ı artık BOŞ DEĞİL, adaptör ile başlatıyoruz!
export const prisma = new PrismaClient({ adapter });

export interface GraphQLContext {
    prisma: PrismaClient;
    userId: string | null;
    tokenType: "access" | "temp" | null;
    user: User | null;
    clientIp: string;
}

export const createContext = async ({ req, res }: { req: Request; res: Response }): Promise<GraphQLContext> => {
    const clientIp = (res.locals as any).clientIp || "Bilinmiyor";
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return { prisma, userId: null, tokenType: null, user: null, clientIp };
    }

    try {
        const token = authHeader.split(" ")[1];

        // 1. Şifresiz decode edip token tipine (temp/access) bakıyoruz
        const decodedUnverified = jwt.decode(token) as any;
        if (!decodedUnverified || !decodedUnverified.userId) {
            return { prisma, userId: null, tokenType: null, user: null, clientIp };
        }

        // 2. Tipe göre doğru gizli anahtarı seçiyoruz
        const secret = decodedUnverified.type === "temp"
            ? (process.env.JWT_TEMP_SECRET || "yedek_temp_gizli_anahtar")
            : (process.env.JWT_SECRET || "yedek_access_gizli_anahtar");

        // 3. Doğru anahtarla token'ı resmen onaylıyoruz
        const decoded = jwt.verify(token, secret) as any;

        const user = await prisma.user.findUnique({
            where: { id: decoded.userId }
        });

        return {
            prisma,
            userId: decoded.userId,
            tokenType: decoded.type as "access" | "temp",
            user,
            clientIp
        };
    } catch (error: any) {
        // Hata logunu görüp tam olarak neyden patladığını anlamak için (süresi mi dolmuş, şifre mi yanlış)
        console.error("[Auth] Token hatası:", error.message);
        return { prisma, userId: null, tokenType: null, user: null, clientIp };
    }
};