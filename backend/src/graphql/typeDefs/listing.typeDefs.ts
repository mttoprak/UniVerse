export const listingTypeDefs = `#graphql

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

enum ListingStatus {
    active
    sold
    closed
    expired
}

enum ItemCondition {
    new
    like_new
    good
    fair
}

type SavedList {
    id: ID!
    name: String!
    userId: String!
    listingId: String!
    createdAt: String!

    # İlişkiler
    user: User!
    listing: Listing!
}

type Listing {
    id: ID!
    ownerId: String!

    owner: User!

    title: String!
    description: String!
    price: Float
    type: ListingType!
    status: ListingStatus!

    features: JSON
    criteria: JSON

    photos: [String!]!
    views: Int!
    save_count: Int!
    is_deleted: Boolean!
    expires: String

    # ── Discriminator Alanları (Hepsi opsiyonel) ──
    condition: ItemCondition
    category: String
    subcategory: String
    smoking_allowed: String
    pet_friendly: String
    gender_preference: String
    origin: String
    destination: String
    departure_date: String
    available_seats: Int
    subject: String
    format: String
    application_url: String
    deadline: String
    amount: Float
    lecture: String

    createdAt: String!
    updatedAt: String!
}

# ─── GİRDİLER (INPUTS) ───────────────────────────────────────────────────

input CreateListingInput {
    title: String!
    description: String!
    type: ListingType!
    price: Float
    features: JSON
    criteria: JSON
    
    # Multer dosya yükleme mantığını REST veya Cloudinary signed-url ile bağlayacağız.
    photos: [String!]

    condition: ItemCondition
    category: String
    subcategory: String
    smoking_allowed: String
    pet_friendly: String
    gender_preference: String
    origin: String
    destination: String
    departure_date: String
    available_seats: Int
    subject: String
    format: String
    application_url: String
    deadline: String
    amount: Float
    lecture: String
}

input UpdateListingInput {
    title: String
    description: String
    price: Float
    status: ListingStatus
    features: JSON
    criteria: JSON
    photos: [String!]

    condition: ItemCondition
    category: String
    subcategory: String
    # İhtiyaca göre diğer opsiyonel alanlar buraya eklenebilir...
}

# ─── QUERIES (REST'teki GET İşlemlerin) ──────────────────────────────────
type Query {
    # router.get('/my-listings')
    getMyListings: [Listing!]!

    # router.get('/')
    getListings: [Listing!]!

    # router.get('/feed')
    getFeedListings: [Listing!]!

    # router.get('/urgent-feed')
    getUrgentListings: [Listing!]!

    # router.get('/user/:uID')
    getUserListings(userId: ID!): [Listing!]!

    # router.get('/:id')
    getListing(id: ID!): Listing
}

# ─── MUTATIONS (REST'teki POST, PATCH, DELETE İşlemlerin) ────────────────
type Mutation {
    # router.post('/')
    createListing(input: CreateListingInput!): Listing!

    # router.patch('/:id')
    updateListing(id: ID!, input: UpdateListingInput!): Listing!

    # router.delete('/:id')
    deleteListing(id: ID!): Boolean!

    # router.patch('/:id/republish')
    republishListing(id: ID!): Listing!
}
`;