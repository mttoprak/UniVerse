import { Router } from 'express'
import multer from 'multer'
import { authMiddleware } from '../middleware/middleware'
import * as LC from '../controllers/listing.controller'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/',            authMiddleware, upload.array('photos', 5), LC.createListing)
router.get('/',             authMiddleware, LC.getListings)
router.get('/feed',         authMiddleware, LC.getFeedListings)
router.get('/user/:uID',    authMiddleware, LC.getUserListings)
router.get('/:id',          authMiddleware, LC.getListing)
router.patch('/:id',        authMiddleware, LC.updateListing)
router.delete('/:id',       authMiddleware, LC.deleteListing)

export default router