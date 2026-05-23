import { Router } from 'express'
import { authMiddleware } from '../middleware/middleware'
import * as CC from '../controllers/comment.controller'

const router = Router()

// POST   /api/comment/                         → Create new Comment
router.post('/',                         authMiddleware, CC.newComment)

// GET    /api/comment/listing/:listingId       → Get the Comments (not the replies!) (newest)
router.get('/listing/:listingId',        authMiddleware, CC.getComments)

// GET    /api/comment/replies/:commentId       → Get the Replies with CommentID (oldest)
router.get('/replies/:commentId',        authMiddleware, CC.getCommentReplies)

// GET    /api/comment/user/:userId             → Get all the Comments that user got (profile)
router.get('/user/:userId',              authMiddleware, CC.getUserComments)

// PATCH  /api/comment/:id                      → Update the Comment/Reply (only content)
router.patch('/:id',                     authMiddleware, CC.updateComment)

// DELETE /api/comment/:id                      → Delete the Comment/Reply
router.delete('/:id',                    authMiddleware, CC.deleteComment)

export default router
