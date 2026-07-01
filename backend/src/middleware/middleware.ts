/*
 *middleware.ts
 *
 */

import { Request, Response, NextFunction } from "express"
import { IUser } from "../types/user.types";
import { verifyToken } from "../utils/token.utils"
import rateLimit from "express-rate-limit" // Yeni eklendi
import User from "../models/User"
import mongoose from "mongoose";

// Request'e user bilgisi eklemek için tip genişletme
declare global {
    namespace Express {
        interface Request {
            userId?: string
            tokenType?: "access" | "temp"
            user?:IUser
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1]
    if (!token) return res.status(401).json({ error: "No token provided" })

    const decoded = verifyToken(token)

    // "temp" token can only enter "/complete-profile" page on frontend
    if (decoded.type === "temp" && !req.path.includes("complete-profile")) {
        return res.status(403).json({ error: "You have to complete your registration process" })
    }

    req.userId    = decoded.userId
    req.tokenType = decoded.type
    next()
}

export const studentOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.userId)
        if (user?.account_type !== "student") {
            return res.status(403).json({ error: "Only students can go through " })
        }
        //req.user = user   sonraki route'da tekrar DB'ye gitmez
        req.user = user  // this prevents fetching the user from the database again
        next()
    }catch (e) {
        console.log("ERROR : " +e)
        return res.status(401).json({ error: "Invalid or expired token" })
    }

}

export const adminOnly = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user = await User.findById(req.userId);
        if (!user || !user.is_admin) {
            return res.status(403).json({ error: "Erişim reddedildi. Bu işlem için Admin yetkisi gereklidir." });
        }
        req.user = user; // Sonraki controller'da tekrar DB'ye gitmemek için
        next();
    } catch (e) {
        console.error("Admin middleware hatası:", e);
        return res.status(500).json({ error: "Server error" });
    }
}

// ─── 2. GÜVENLİK ──────────────────────────────────

export const ipResolver = (req: Request, res: Response, next: NextFunction) => {
    const cfIp = req.headers['cf-connecting-ip'] as string;
    const forwardedFor = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;

    let ip = cfIp || forwardedFor || realIp || req.socket.remoteAddress || req.ip;

    if (ip && ip.includes(',')) {
        ip = ip.split(',')[0].trim();
    }

    res.locals.clientIp = ip || "Bilinmiyor";
    next();
};

// ─── 3. GÜVENLİK: RATE LIMITER'LAR (YENİ EKLENDİ) ───────────────────────────

const keyGenerator = (req: Request, res: Response) => {
    // Kendi IP çözücümüzü kullanıyoruz
    if (req.userId) return req.userId;
    return res.locals.clientIp as string;
};

// Tüm uygulama geneli için varsayılan limit
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 400,
    message: { error: "Çok fazla istekte bulundunuz, lütfen daha sonra tekrar deneyin.  ," },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator
});

// Hassas Auth işlemleri için katı limit (Login, Register, Email Gönderimi vb.)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 10, // Max 10 deneme
    message: { error: "Çok fazla başarısız deneme yaptınız. Lütfen 15 dakika bekleyin." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator
});

// Mesajlaşma ekranındaki sürekli fetch işlemleri için daha toleranslı limit
export const messagingLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 dakika
    max: 120, // Dakikada 120 istek (saniyede 2)
    message: { error: "Mesajlar çok hızlı güncelleniyor, lütfen anlık yavaşlayın." },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator
});

export const emailVerificationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 5, // IP başına 1 saatte en fazla 5 mail
    message: { error: 'Çok fazla doğrulama kodu istediniz. Lütfen daha sonra tekrar deneyin.' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator
});