export const AITypeDefs = `#graphql

type PresentedListing {
    listing: Listing!
    note: String
}

type AIResponse {
    aiConversationId: ID!
    message: String!
    messageAfter: String
    listings: [PresentedListing!]!
    title: String
}

input askChatbotInput {
    message: String!
    aiConversationId: ID
    title: Boolean 
}

type AIConversationPreview {
    aiConversationId: ID!
    title: String
    updatedAt: String!
}

type AIHistoryPreviewResponse {
    conversations: [AIConversationPreview!]!
}

type AIHistoryMessage {
    role: String!                     # "user" | "assistant"
    text: String                      # visible text (null if this turn is only cards)
    listings: [PresentedListing!]!    # cards shown on this turn (empty for plain text turns)
}

type AIHistoryResponse {
    aiConversationId: ID!
    messages: [AIHistoryMessage!]!
}

type Query {
    aiConversationPreviews: AIHistoryPreviewResponse!
    aiConversationHistory(aiConversationId: ID!): AIHistoryResponse!
}

type Mutation {
    askChatbot(input: askChatbotInput!): AIResponse!
}
`;