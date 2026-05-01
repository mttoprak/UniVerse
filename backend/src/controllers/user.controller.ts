import { Request, Response } from "express"
import { z } from "zod";
import User from "../models/User"
import { updateUserSchema} from "../validators/user.validator";


export const updateUser = async (req: Request, res: Response) => {
    try {
        const parsed = updateUserSchema.safeParse(req.body)
        if (!parsed.success) {
            return res.status(400).json({
                errors: z.treeifyError(parsed.error)
            });
        }



    }catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" })
    }
}