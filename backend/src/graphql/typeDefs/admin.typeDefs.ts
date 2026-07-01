export const adminTypeDefs = `#graphql

type DashboardStats {
    users: UserStats!
    listings: ListingStats!
    activity: ActivityStats!
}

type UserStats {
    total: Int!
    newThisWeek: Int!
}

type ListingStats {
    active: Int!
}

type ActivityStats {
    totalConversations: Int!
    totalOffers: Int!
}

type ActivityLog {
    id: ID!
    actorId: ID
    action: String!
    entity_type: String!
    entity_id: String
    metadata: String # JSON datayı string olarak basabiliriz frontend'de parse eder
    createdAt: String!
    updatedAt: String!
}

type AdminUserDetails {
    user: User!
    logs: [ActivityLog!]!
    listings: [Listing!]!
    comments: [Comment!]!
    conversations: [Conversation!]!
}

type OnlineUser {
    userId: ID!
    ip: String
    connectedAt: String
    userInfo: User
}

type OnlineUsersResponse {
    totalOnline: Int!
    users: [OnlineUser!]!
}

type AdminConversationDetails {
    conversation: Conversation!
    messages: [Message!]!
}
type ListingConnection {
    listings: [Listing!]!
    totalCount: Int!
    page: Int!
    totalPages: Int!
    hasNextPage: Boolean!
}

type Query {
    getDashboardStats: DashboardStats!
    getOnlineUsers: OnlineUsersResponse!
    getUserFullDetails(id: ID!): AdminUserDetails!
    getAllListingsAdmin(page: Int, limit: Int, showDeleted: Boolean): ListingConnection!
    getConversationDetailsAdmin(convId: ID!): AdminConversationDetails!
}

type Mutation {
    toggleBanStatus(identifier: String!): User!
    manualVerifyUser(id: ID!): User!
    broadcastAnnouncement(title: String!, message: String!): Boolean!
    adminDeleteListing(id: ID!): Boolean!
    sendAdminMessageToConversation(convId: ID!, text: String!): Message!
}
    `;