import {Router} from "express";
import * as MC from "../controllers/misc.controller";
import {authMiddleware} from "../middleware/middleware";

const router = Router()

// GET /api/misc/districts/:city_id
router.get("/districts/:city_id", authMiddleware,       MC.getDistricts )

export default router