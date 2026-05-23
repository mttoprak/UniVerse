import { Router } from 'express'
import multer from 'multer'
import {authMiddleware, studentOnly} from '../middleware/middleware'
import * as LC from '../controllers/listing.controller'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/',            authMiddleware,                 upload.array('photos', 5), LC.createListing)
router.get('/my-listings',  authMiddleware,                 LC.getMyListings)
router.get('/',             authMiddleware, studentOnly,    LC.getListings)
router.get('/feed',         authMiddleware, studentOnly,    LC.getFeedListings)
router.get('/user/:uID',    authMiddleware, studentOnly,    LC.getUserListings)
router.get('/:id',          authMiddleware, /*studentOnly*/ LC.getListing)
router.patch('/:id',        authMiddleware,                 LC.updateListing)
router.delete('/:id',       authMiddleware,                 LC.deleteListing)

export default router