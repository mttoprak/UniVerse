import { Router } from "express"
import { studentOnly , authMiddleware } from "../middleware/middleware"
import {helloworld} from "../controllers/user.controller";



const router = Router()


router.post("/helloworld", authMiddleware, helloworld)




export default router