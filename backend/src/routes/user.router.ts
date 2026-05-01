import { Router } from "express"
import { studentOnly , authMiddleware } from "../middleware/middleware"
import {updateUser} from "../controllers/user.controller";



const router = Router()


router.post("/updateUser", authMiddleware, updateUser)




export default router