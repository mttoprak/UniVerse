// src/utils/logger.util.ts
import { prisma } from "../graphql/context";

interface LogParams {
    req?: any;
    res?: any;
    actor?: string; // Artık Mongoose ObjectId değil, Prisma UUID (String)
    action: string;
    entity_type?: string;
    entity_id?: string;
    metadata?: any;
}

export const createActivityLog = async (params: LogParams) => {
    try {
        await prisma.activityLog.create({
            data: {
                actorId: params.actor || null,
                action: params.action,
                entity_type: params.entity_type || "None",
                entity_id: params.entity_id || null,
                metadata: params.metadata || null, // JSON objesini direkt Prisma'ya veriyoruz
            }
        });
    } catch (error) {
        // Loglama çökse bile ana sistemi (register/login) çökertmesin diye hatayı yutuyoruz
        console.error("Aktivite loglanırken Prisma hatası oluştu:", error);
    }
};