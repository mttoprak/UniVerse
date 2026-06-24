export const messagingTypeDefs = `#graphql

type LastMessage {
    senderId: ID!
    senderName: String!
    preview: String
    type: String!
    sentAt: String!
    isRead: Boolean!
    emailNotified: Boolean!
}

type Conversation {
    id: ID!
    listingId: ID!
    sellerId: ID!
    buyerId: ID!

    listing: Listing!
    seller: User!
    buyer: User!

    lastMessage: LastMessage
    unreadSeller: Int!
    unreadBuyer: Int!
    status: String!
    offerStatus: String!

    createdAt: String!
    updatedAt: String!
}

type Message {
    id: ID!
    conversationId: ID!
    senderId: ID!
    offerId: ID

    conversation: Conversation!
    sender: User!
    offer: Offer

    type: String!
    text: String
    photos: [String!]!
    location: String

    isRead: Boolean!
    readAt: String
    isDeleted: Boolean!

    createdAt: String!
    updatedAt: String!
}

type Offer {
    id: ID!
    listingId: ID!
    applicantId: ID!
    conversationId: ID

    listing: Listing!
    applicant: User!
    conversation: Conversation

    price: Float
    pricePer: String!
    note: String
    status: String!
    expiresAt: String

    createdAt: String!
    updatedAt: String!
}

# --- PAYLOADS & CONNECTIONS (Sayfalama İçin) ---
    type MessageConnection {
    messages: [Message!]!
    nextCursor: String
    hasMore: Boolean!
}

type ConversationConnection {
    conversations: [Conversation!]!
    pagination: PaginationMeta!
}

type PaginationMeta {
    page: Int!
    limit: Int!
    totalCount: Int!
    totalPages: Int!
    hasNextPage: Boolean!
}

type ApplicationConnection {
    applications: [Offer!]!
    total: Int!
    page: Int!
}

type CheckAgreementResponse {
    hasAgreement: Boolean!
    listingId: ID!
    currentUser: ID!
    listingOwner: ID!
}

type CloudinarySignature {
    timestamp: Int!
    signature: String!
    cloudName: String!
    apiKey: String!
    folder: String!
}

# --- INPUTS ---
input SendMessageInput {
    conversationId: ID
    listingId: ID
    text: String
    photos: [String!] # Frontend cloudinary'e yükleyip URL'leri buraya verecek
    location: String
    offerPrice: Float
    offerPricePer: String
    offerNote: String
}

input MakeOfferInput {
    conversationId: ID!
    price: Float!
    pricePer: String
    note: String
}

# --- ROOT TYPES ---
type Query {
# Message Queries
    getConversations(page: Int, limit: Int, status: String): ConversationConnection!
    getMessages(conversationId: ID!, cursor: String, limit: Int): MessageConnection!

# Offer Queries
    getMyApplications(page: Int, limit: Int): ApplicationConnection!
    getListingApplications(listingId: ID!, page: Int, limit: Int, status: String): ApplicationConnection!
    checkListingAgreement(listingId: ID!): CheckAgreementResponse!
}

type Mutation {
# Message Mutations
    generateMessageUploadSignature: CloudinarySignature!
    sendMessage(input: SendMessageInput!): Message!
    deleteMessage(messageId: ID!): Boolean!

# Offer Mutations
    applyToListing(listingId: ID!, note: String): Offer!
    makeOffer(input: MakeOfferInput!): Offer!
    respondToOffer(offerId: ID!, action: String!): Offer!
    cancelOffer(offerId: ID!): Offer!
}

# GraphQL Soket (Real-time) Dinleyicileri
type Subscription {
    newMessage(conversationId: ID!): Message!
    conversationUpdated(userId: ID!): Conversation!
    offerUpdated(conversationId: ID!): Offer!
}
`;