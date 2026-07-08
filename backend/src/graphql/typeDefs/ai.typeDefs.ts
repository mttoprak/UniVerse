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
}

input askChatbotInput {
    message: String!
    aiConversationId: ID
}

type Mutation {
    askChatbot(input: askChatbotInput!): AIResponse!
}
`;