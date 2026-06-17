import "dotenv/config";
import { Request, Response } from "express";
import { PrismaClient, User } from "@prisma/client";
import { verifyToken } from "../utils/token.utils";

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
        const decoded = verifyToken(token);

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
    } catch (error) {
        return { prisma, userId: null, tokenType: null, user: null, clientIp };
    }
};