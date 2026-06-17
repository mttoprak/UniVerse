// export const typeDefs = `#graphql
//   # 1. PostgreSQL'deki esnek JSONB (saved_listings vb.) alanları desteklemek için scalar tanımlıyoruz
//   scalar JSON
//
//   # 2. Şemadaki Enum yapılarının GraphQL karşılıkları
//   enum AccountType {
//     student
//     external
//   }
//
//   enum AuthProvider {
//     local
//     google
//   }
//
//   enum ListingStatus {
//     active
//     sold
//     closed
//     expired
//   }
//
//   enum ListingType {
//     secondhand
//     roommate
//     carpooling
//     course
//     job
//     scholarship
//     urgent
//     note
//   }
//
//   enum ItemCondition {
//     new
//     like_new
//     good
//     fair
//   }
//
//   # 3. ANA USER TIPI (Mongoose ve Prisma alanlarının birebir karşılığı)
//   type User {
//     id: ID!
//     username: String
//     email: String!
//     edu_email: String
//     name: String!
//     surname: String!
//     birthdate: String
//     telephone: String
//     profile_photo: String
//
//     account_type: AccountType!
//     auth_provider: AuthProvider!
//
//     is_complete: Boolean!
//     is_verified: Boolean!
//     is_banned: Boolean!
//     is_admin: Boolean!
//
//     university: String
//     rating_sum: Int!
//     rating_count: Int!
//
//     # Mongoose'daki Map/Mixed alanın SQL JSONB karşılığı
//     saved_listings: JSON
//
//     # ── İlişkiler (Relationships) ──
//     listings: [Listing!]!         # Kullanıcının kendi açtığı ilanlar
//     favoriteListings: [Listing!]! # Favoriye eklediği ilanlar
//     favoriteSellers: [User!]!     # Takip ettiği satıcılar
//     favoritedBy: [User!]!         # Bu kullanıcıyı favorileyen diğer kullanıcılar
//
//     createdAt: String!
//     updatedAt: String!
//   }
//
// # 4. Kılavuz olması için Listing tipinin de temel halini ekliyoruz (İleride genişleteceğiz)
//   type Listing {
//     id: ID!
//     type: ListingType!
//     title: String!
//     description: String!
//     location: String!
//     photos: [String!]!
//     price: Float
//     status: ListingStatus!
//     expires: String
//     views: Int!
//     save_count: Int!
//     features: JSON
//     criteria: JSON
//     is_deleted: Boolean!
//     owner: User!
//     createdAt: String!
//     updatedAt: String!
//   }
//
//   type PublicProfileResponse {
//       user: User!
//       listing_count: Int!
//   }
//
//   type VerificationResponse {
//       success: Boolean!
//       message: String!
//   }
//
//   input UpdateUserInput {
//     username: String
//     name: String
//     surname: String
//     password: String
//   }
//
//
//
//   # 5. Apollo Server'ın hata vermeden ayağa kalkması için en az bir Query şarttır
//   type Query {
//       # Dünden kalan test/me sorgun varsa burada durabilir
//       getMe: User
//
//       # Yeni eklediğimiz Public Profile sorgusu
//       getPublicProfile(id: ID!): PublicProfileResponse!
//   }
//
// type CommonResponse {
//     success: Boolean!
//     message: String
// }
//
// type Mutation {
//     sendVerification(email: String!): VerificationResponse!
//
//     # Yeni eklediğimiz Profil Güncelleme mutasyonu
//     updateUser(input: UpdateUserInput!): User!
// }
// `;