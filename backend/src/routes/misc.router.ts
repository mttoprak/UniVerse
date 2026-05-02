import {Router} from "express";
import {getDistricts} from "../controllers/misc.controller";

const router = Router()

// GET /api/misc/districts/:city_id
router.get("/districts/:city_id", getDistricts )

export default router