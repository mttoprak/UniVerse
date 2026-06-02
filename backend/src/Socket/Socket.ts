import { Server, Socket } from 'socket.io'
import { Server as HttpServer } from 'http'
import { verifyToken } from '../utils/token.utils'
import Message from '../models/Message'
import Conversation from '../models/Conversation'
import { SOCKET_EVENTS } from './socket.events'

// Global io instance — controller'lardan emit için export edilir
export let io: Server

// ─── INIT ─────────────────────────────────────────────────────────────────────

export const initSocket = (httpServer: HttpServer): void => {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            credentials: true,
        },
        // Reconnection için ping ayarları
        pingTimeout: 20000,
        pingInterval: 25000,
    })

    // ─── AUTH MIDDLEWARE ──────────────────────────────────────────────────────
    // Her socket bağlantısında JWT doğrula.
    // Client: socket = io(URL, { auth: { token: 'Bearer ...' } })
    io.use((socket, next) => {
        const raw = socket.handshake.auth?.token as string | undefined

        if (!raw) {
            return next(new Error('AUTH_NO_TOKEN'))
        }

        // "Bearer <token>" veya direkt "<token>" formatını destekle
        const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw

        try {
            const decoded = verifyToken(token)
            if (decoded.type !== 'access') {
                return next(new Error('AUTH_TEMP_TOKEN'))
            }
            socket.data.userId = decoded.userId
            next()
        } catch {
            next(new Error('AUTH_INVALID_TOKEN'))
        }
    })

    // ─── CONNECTION ───────────────────────────────────────────────────────────
    io.on('connection', (socket: Socket) => {
        const userId: string = socket.data.userId

        // Her kullanıcının kişisel odası — bildirim göndermek için
        // Örn: io.to(`user:${sellerId}`).emit(NEW_CONVERSATION, ...)
        socket.join(`user:${userId}`)

        console.log(`[Socket] Connected: ${userId} (${socket.id})`)

        // ── Conversation odasına gir ──────────────────────────────────────────
        // Client sohbet ekranını açınca çağırır. Server-side membership kontrolü eklenir.
        socket.on(SOCKET_EVENTS.JOIN_CONVERSATION, async (conversationId: string) => {
            if (!conversationId) return
            try {
                const conv = await Conversation.findById(conversationId).select('seller buyer')
                if (!conv) return
                const userIdStr = socket.data.userId as string
                // Sadece seller veya buyer olan kullanıcılar odaya katılsın
                if (conv.seller.toString() !== userIdStr && conv.buyer.toString() !== userIdStr) {
                    return
                }
                socket.join(`conv:${conversationId}`)
            } catch (err) {
                console.error('[Socket] join_conversation error:', err)
            }
        })

        // ── Conversation odasından çık ────────────────────────────────────────
        socket.on(SOCKET_EVENTS.LEAVE_CONVERSATION, (conversationId: string) => {
            if (!conversationId) return
            socket.leave(`conv:${conversationId}`)
        })

        // ── Yazıyor göstergesi ────────────────────────────────────────────────
        // DB'ye yazılmaz — sadece broadcast edilir.
        socket.on(SOCKET_EVENTS.TYPING, (conversationId: string) => {
            socket.to(`conv:${conversationId}`).emit(SOCKET_EVENTS.USER_TYPING, {
                userId,
                conversationId,
            })
        })

        socket.on(SOCKET_EVENTS.STOP_TYPING, (conversationId: string) => {
            socket.to(`conv:${conversationId}`).emit(SOCKET_EVENTS.USER_STOP_TYPING, {
                userId,
                conversationId,
            })
        })

        // ── Mesajları okundu işaretle ─────────────────────────────────────────
        // Client mesaj ekranını açtığında (veya focus aldığında) gönderir.
        // REST'te de yapılır ama socket ile anlık bildirim sağlanır.
        socket.on(SOCKET_EVENTS.MARK_READ, async (conversationId: string) => {
            if (!conversationId) return

            try {
                const now = new Date()

                // Bu conversation'da, bu kullanıcıya ait OLMAYAN, okunmamış mesajları işaretle
                await Message.updateMany(
                    {
                        conversation: conversationId,
                        sender:       { $ne: userId },
                        isRead:       false,
                    },
                    {
                        $set: { isRead: true, readAt: now },
                    }
                )

                // Conversation'daki unreadCount'u sıfırla
                const conv = await Conversation.findById(conversationId)
                if (conv) {
                    const role = conv.seller.toString() === userId ? 'seller' : 'buyer'
                    conv.unreadCount[role] = 0
                    await conv.save()
                }

                // Karşı tarafa "mesajlarını okudum" bildir
                socket.to(`conv:${conversationId}`).emit(SOCKET_EVENTS.MESSAGES_READ, {
                    conversationId,
                    readBy: userId,
                    readAt: now,
                })
            } catch (err) {
                console.error('[Socket] mark_read error:', err)
            }
        })


        

        // ── Disconnect ────────────────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Disconnected: ${userId} — ${reason}`)
        })
    })

    console.log('[Socket] Socket.io başlatıldı.')
}

// ─── YARDIMCI EMIT FONKSİYONLARI ─────────────────────────────────────────────
// Controller'lardan kullanmak için

/**
 * Bir conversation odasındaki herkese mesaj gönder.
 * REST mesaj gönderme endpoint'inin sonunda çağrılır.
 */
export const emitNewMessage = (conversationId: string, message: any): void => {
    io?.to(`conv:${conversationId}`).emit(SOCKET_EVENTS.NEW_MESSAGE, message)
}

export const emitMessageUpdated = (conversationId: string, message: any): void => {
    io?.to(`conv:${conversationId}`).emit(SOCKET_EVENTS.MESSAGE_UPDATED, message)
}

/**
 * Conversation'ın lastMessage / unreadCount bilgilerini güncelle.
 * İki kullanıcının da sohbet listesi anlık güncellenir.
 */
export const emitConversationUpdated = (
    sellerId: string,
    buyerId: string,
    conversation: any
): void => {
    io?.to(`user:${sellerId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, conversation)
    io?.to(`user:${buyerId}`).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, conversation)
}

/**
 * İlk mesaj gönderildiğinde satıcıya yeni sohbet bildirimi gönder.
 */

export const emitNewConversation = (sellerId: string, conversation: any): void => {
    io?.to(`user:${sellerId}`).emit(SOCKET_EVENTS.NEW_CONVERSATION, conversation)
}

/**
 * Offer durumu değiştiğinde conversation odasına bildir.
 */
export const emitOfferUpdated = (
    conversationId: string,
    offerId: string,
    status: string
): void => {
    io?.to(`conv:${conversationId}`).emit(SOCKET_EVENTS.OFFER_UPDATED, {
        offerId,
        status,
        conversationId,
    })
}