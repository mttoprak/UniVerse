export const AITypeDefs = `#graphql

type PresentedListing {
    listing: Listing!
    note: String
}

type ComparisonValue {
    listingId: ID!
    value: String!
    isBest: Boolean!      # true = this listing wins THIS attribute → highlight it
}

type ComparisonAttribute {
    label: String!        # e.g. "Fiyat", "Durum", "Ekran"
    values: [ComparisonValue!]!   # one per listing being compared
}

type ComparisonListing {
    listing: Listing!
    note: String
}

type PresentedComparison {
    listings: [ComparisonListing!]!       # 2–4 listings
    attributes: [ComparisonAttribute!]    # NULLABLE — null means advisory mode
    comment: String!                      # AI's guidance / recommendation
    assumptionNote: String                # optional, e.g. "Orijinal PS4 varsaydım"
}

type AIResponse {
    aiConversationId: ID!
    message: String!
    messageAfter: String
    listings: [PresentedListing!]!
    title: String
    comparison: PresentedComparison
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