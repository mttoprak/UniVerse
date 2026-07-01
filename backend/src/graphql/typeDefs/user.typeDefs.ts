export const userTypeDefs = `#graphql
scalar JSON

type User {
    id: ID!
    username: String
    email: String!
    edu_email: String
    name: String!
    surname: String!
    birthdate: String
    telephone: String
    profile_photo: String

    account_type: AccountType!
    auth_provider: AuthProvider!

    is_complete: Boolean!
    is_verified: Boolean!
    is_banned: Boolean!
    is_admin: Boolean!

    university: String
    rating_sum: Int!
    rating_count: Int!

    saved_listings: JSON

    # ── İlişkiler (Relationships) ──
    listings: [Listing!]!
    favoriteListings: [Listing!]!
    favoriteSellers: [User!]!
    favoritedBy: [User!]!

    createdAt: String!
    updatedAt: String!
}

enum AccountType {
    student
    external
}

enum AuthProvider {
    local
    google
}

type PublicProfileResponse {
    user: User!
    listing_count: Int!
}

type ToggleFavoriteResponse {
    favorited: Boolean!
}

type SavedListResponse {
    saved: Boolean
    removed: Boolean
    listName: String!
    saved_listings: JSON!
}

type CloudinarySignatureResponseUser {
    timestamp: Int!
    signature: String!
    cloudName: String!
    apiKey: String!
    folder: String!
}

input UpdateUserInput {
    username: String
    name: String
    surname: String
    password: String
}

input VerifyEduMailInput {
    code: String!
}

input AddToSavedInput {
    listingId: ID!
    listName: String!
}

input RemoveFromSavedInput {
    listingId: ID!
    listName: String!
}

input ChangePasswordInput {
    oldPassword: String
    newPassword: String!
}

type SystemAnnouncement {
    title: String!
    message: String!
    createdAt: String!
}

type Query {
    getMe: User
    getPublicProfile(id: ID!): PublicProfileResponse!
    getPublicProfileByUsername(username: String!): PublicProfileResponse!
    getFavoriteListings: [Listing!]!
    getSavedListings: JSON!
}

type Mutation {
    updateUser(input: UpdateUserInput!): User!
    changePassword(input: ChangePasswordInput!): String!

    # YENİ EKLENDİ: Profil Fotoğrafı Güncelleme
    updateProfilePhoto(photoUrl: String!): String!

    sendEduVerification: String!
    verifyEduMail(input: VerifyEduMailInput!): String!

    toggleFavorite(listingId: ID!): ToggleFavoriteResponse!
    addToSaved(input: AddToSavedInput!): SavedListResponse!
    removeFromSaved(input: RemoveFromSavedInput!): SavedListResponse!

    generateUploadSignatureUser(folderName: String!): CloudinarySignatureResponseUser!
}
type Subscription {
    # Herhangi bir argüman almıyor çünkü spesifik bir ID'ye bağlı değil, global.
    systemAnnouncement: SystemAnnouncement!
}
`;