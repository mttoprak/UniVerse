/*
 *middleware.ts
 *
 */

import { Request, Response, NextFunction } from "express"
import { IUser } from "../types/user.types";
import { verifyToken } from "../utils/token.utils"
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