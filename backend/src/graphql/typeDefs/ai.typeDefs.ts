export const AITypeDefs = `#graphql

input askChatbotInput {
    query: String!
    aiConversationId: ID
}

type AIResponse {
    token: String!
    is_complete: Boolean!
    user: User
}


type Mutation {
    askChatbot(input: askChatbotInput!): String!
}

`;