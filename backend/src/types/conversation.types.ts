import { Document, Types } from 'mongoose'
import { MessageContentType } from './message.types'

export interface ILastMessage {
    senderId:   Types.ObjectId
    senderName: string
    preview:    string             //We need to send 80 char to frontend
    type:       MessageContentType
    sentAt:     Date
    isRead:     boolean
}

export interface IUnreadCount {
    seller: number
    buyer:  number
}

export type ConversationStatus = 'active' | 'archived' | 'blocked'

export type OfferStatus = 'No Offer'| 'Offer Sent'| 'Offer Accepted'| 'Offer Rejected'


export interface IConversation extends Document {
    _id: Types.ObjectId

    listing: Types.ObjectId

    seller: Types.ObjectId   // listing's owner
    buyer:  Types.ObjectId   // buyer

    lastMessage:  ILastMessage | null
    unreadCount:  IUnreadCount

    status: ConversationStatus

    //when there is a new offer, make it "Offer Sent"
    offerStatus: OfferStatus

    createdAt: Date
    updatedAt: Date
}