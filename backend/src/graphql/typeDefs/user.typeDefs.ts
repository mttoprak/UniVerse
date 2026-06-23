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

    # Mongoose'daki Map/Mixed alanın SQL JSONB karşılığı
    saved_listings: JSON

    # ── İlişkiler (Relationships) ──
    listings: [Listing!]!         # Kullanıcının kendi açtığı ilanlar
    favoriteListings: [Listing!]! # Favoriye eklediği ilanlar
    favoriteSellers: [User!]!     # Takip ettiği satıcılar
    favoritedBy: [User!]!         # Bu kullanıcıyı favorileyen diğer kullanıcılar

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

#  type VerificationResponse {
#    success: Boolean!
#    message: String!
#  }

  input UpdateUserInput {
    username: String
    name: String
    surname: String
    password: String
  }

#input RegisterInput {
#    email: String!
#    name: String!
#    surname: String!
#    password: String!
#}

input VerifyEduMailInput {
    code: String!
}

  # Sadece User ile ilgili GET işlemleri
  type Query {
    getMe: User
    getPublicProfile(id: ID!): PublicProfileResponse!
  }

  # Sadece User ile ilgili POST/PATCH işlemleri
  type Mutation {
#    sendVerification(email: String!): VerificationResponse!
    updateUser(input: UpdateUserInput!): User!

      # sendEduVerification için input argümanına gerek yok, çünkü email zaten context'teki user'dan alınıyor
      sendEduVerification: String!

      # Kod doğrulaması için input alıyoruz
      verifyEduMail(input: VerifyEduMailInput!): String!
  }
`;