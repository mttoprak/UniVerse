export const commentTypeDefs = `#graphql

type Comment {
    id: ID!
    listingId: ID!
    authorId: ID!
    targetId: ID!
    parentId: ID

    listing: Listing!
    author: User!
    target: User!
    parent: Comment
    replies: [Comment!]!

    content: String!
    rating: Int
    is_edited: Boolean!
    is_deleted: Boolean!

    # Frontend'in "X yanıtı gör" butonunu basabilmesi için
    reply_count: Int!

    createdAt: String!
    updatedAt: String!
}

type CommentConnection {
    comments: [Comment!]!
    totalCount: Int!
    page: Int!
    totalPages: Int!
    hasNextPage: Boolean!
}

input CreateCommentInput {
    listingId: ID!
    content: String!
    rating: Int
    parentId: ID
}

input UpdateCommentInput {
    content: String
    rating: Int
}

type Query {
    getListingComments(listingId: ID!, page: Int, limit: Int): CommentConnection!
    getCommentReplies(commentId: ID!): [Comment!]!
    getUserComments(userId: ID!, page: Int, limit: Int): CommentConnection!
}

type Mutation {
    createComment(input: CreateCommentInput!): Comment!
    updateComment(commentId: ID!, input: UpdateCommentInput!): Comment!
    deleteComment(commentId: ID!): Boolean!
}


`;