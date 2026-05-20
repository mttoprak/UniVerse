import { Router } from 'express'
import { authMiddleware } from '../middleware/middleware'
import * as CC from '../controllers/comment.controller'

const router = Router()

// POST   /api/comment/               → Yorum / yanıt oluştur
router.post('/',                        authMiddleware, CC.newComment)

// GET    /api/comment/listing/:listingId  → İlanın top-level yorumları (newest)
router.get('/listing/:listingId',        authMiddleware, CC.getComments)

// GET    /api/comment/replies/:commentId → Bir yorumun yanıtları (oldest)
router.get('/replies/:commentId',        authMiddleware, CC.getCommentReplies)

// GET    /api/comment/user/:userId    → Kullanıcıya yapılan yorumlar (profil)
router.get('/user/:userId',              authMiddleware, CC.getUserComments)

// PATCH  /api/comment/:id             → Yorumu güncelle (sadece content)
router.patch('/:id',                     authMiddleware, CC.updateComment)

// DELETE /api/comment/:id             → Yorumu sil
router.delete('/:id',                    authMiddleware, CC.deleteComment)

export default router
