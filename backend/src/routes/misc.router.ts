import {Router} from "express";
import {getDistricts} from "../controllers/misc.controller";

const router = Router()

router.get("/districts/:city_id", getDistricts )

export default router