export const listingTypeDefs = `#graphql

enum ListingStatus {
    active
    sold
    closed
    expired
}

enum ListingType {
    secondhand
    roommate
    carpooling
    course
    job
    scholarship
    urgent
    note
}

enum ItemCondition {
    new
    like_new
    good
    fair
}

type Listing {
    id: ID!
    type: ListingType!
    title: String!
    description: String!
    location: String!
    photos: [String!]!
    price: Float
    status: ListingStatus!
    expires: String
    views: Int!
    save_count: Int!
    features: JSON
    criteria: JSON
    is_deleted: Boolean!
    owner: User!
    createdAt: String!
    updatedAt: String!
}

#type Query {
#    
#}
#
#type Mutation {
#    
#}
`;