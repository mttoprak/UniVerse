export const AITypeDefs = `#graphql

input askChatbotInput {
    message: String!
    aiConversationId: ID
}

type AIResponse {
    aiConversationId: ID!
    message: String!
}

type Mutation {
    askChatbot(input: askChatbotInput!): AIResponse!
}
`;