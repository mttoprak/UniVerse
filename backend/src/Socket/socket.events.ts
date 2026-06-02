// ─── CLIENT → SERVER ─────────────────────────────────────────────────────────
export const SOCKET_EVENTS = {

    // Bağlantı / Oda
    JOIN_CONVERSATION:   'join_conversation',   // { conversationId }
    LEAVE_CONVERSATION:  'leave_conversation',  // { conversationId }

    // Yazıyor göstergesi (DB'ye yazılmaz)
    TYPING:              'typing',              // { conversationId }
    STOP_TYPING:         'stop_typing',         // { conversationId }

    // Mesaj okundu (REST yerine socket ile bildirilebilir)
    MARK_READ:           'mark_read',           // { conversationId }

// ─── SERVER → CLIENT ─────────────────────────────────────────────────────────

    // Yeni mesaj (REST ile gönderilir, socket ile broadcast edilir)
    NEW_MESSAGE:         'new_message',         // IMessage (populate edilmiş)

    // Conversation listesi güncellemesi (lastMessage, unreadCount)
    CONVERSATION_UPDATED: 'conversation_updated', // IConversation (kısmi)

    // Bir mesaj güncellendi / silindi
    MESSAGE_UPDATED:     'message_updated',     // IMessage

    // Yazıyor göstergesi
    USER_TYPING:         'user_typing',         // { userId, conversationId }
    USER_STOP_TYPING:    'user_stop_typing',    // { userId, conversationId }

    // Mesajlar okundu bildirimi (karşı tarafa)
    MESSAGES_READ:       'messages_read',       // { conversationId, readBy }

    // Mesajlar silindi bildirimi (mesajları yeniden çekmesi için her iki tarafa da)
    MESSAGE_DELETED: 'message_deleted',

    // Offer durumu değişti
    OFFER_UPDATED:       'offer_updated',       // { offerId, status, conversationId }

    // İlk mesaj gönderilince yeni conversation bildirimi (seller için)
    NEW_CONVERSATION:    'new_conversation',    // IConversation (populate edilmiş)

} as const

export type SocketEvent = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS]