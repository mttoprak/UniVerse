import { Router } from 'express'
import multer     from 'multer'
import { authMiddleware } from '../middleware/middleware'
import * as MC from '../controllers/message.controller'

const messageRouter = Router()
const upload = multer({ storage: multer.memoryStorage() })

// POST   /api/message                          → Mesaj gönder (conversation yoksa oluşturur)
messageRouter.post(
    '/',
    authMiddleware,
    upload.array('photos', 5),
    MC.sendMessage
)

// GET    /api/message/conversations            → Tüm sohbetlerim
messageRouter.get('/conversations',    authMiddleware, MC.getConversations)

// GET    /api/message/:conversationId          → Sohbet mesajları (cursor-based)
messageRouter.get('/:conversationId',  authMiddleware, MC.getMessages)

// DELETE /api/message/:messageId               → Mesajı sil (soft)
messageRouter.delete('/:messageId',    authMiddleware, MC.deleteMessage)

export { messageRouter }