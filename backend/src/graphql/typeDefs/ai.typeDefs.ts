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

type Mutation {
    askChatbot(input: askChatbotInput!): AIResponse!
}
`;