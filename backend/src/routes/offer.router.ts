import { Router as OfferRouter } from 'express'
import * as OC from '../controllers/offer.controller'
import {authMiddleware, studentOnly} from "../middleware/middleware";

const offerRouter = OfferRouter()

// POST   /api/offer/apply                           → Job/Scholarship başvuru
offerRouter.post('/apply',              authMiddleware, studentOnly, OC.applyToListing)

// POST   /api/offer/make                            → Conversation içi fiyat teklifi
offerRouter.post('/make',               authMiddleware, OC.makeOffer)

// GET    /api/offer/my-applications                 → Benim başvurularım
offerRouter.get('/my-applications',     authMiddleware, OC.getMyApplications)

// GET    /api/offer/listing/:listingId/applications → İlana gelen başvurular (ilan sahibi)
offerRouter.get(
    '/listing/:listingId/applications', authMiddleware, OC.getListingApplications)

// PATCH  /api/offer/:offerId/respond                → Kabul / Red
offerRouter.patch('/:offerId/respond',  authMiddleware, OC.respondToOffer)

// PATCH  /api/offer/:offerId/cancel                 → İptal
offerRouter.patch('/:offerId/cancel',   authMiddleware, OC.cancelOffer)

export { offerRouter }