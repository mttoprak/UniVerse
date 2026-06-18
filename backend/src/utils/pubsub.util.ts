import { PubSub } from 'graphql-subscriptions';

// Tüm uygulamada tek bir PubSub örneği (singleton) kullanılmalı
export const pubsub = new PubSub();

// Hata yapmamak için event isimlerini sabitliyoruz
export const SUBSCRIPTION_EVENTS = {
    NEW_MESSAGE: 'NEW_MESSAGE',
    CONVERSATION_UPDATED: 'CONVERSATION_UPDATED',
    USER_TYPING: 'USER_TYPING',
    MESSAGES_READ: 'MESSAGES_READ',
    OFFER_UPDATED: 'OFFER_UPDATED',
} as const;