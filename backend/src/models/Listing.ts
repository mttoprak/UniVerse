import mongoose from 'mongoose'

// ─── BASE LISTING ─────────────────────────────────────────────────────────────

const listingSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Owner is required'],
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: 100,
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            maxlength: 2000,
        },
        location: {
            type: String,
            required: [true, 'Location is required'],
        },
        photos: [
            {
                type: String, // Cloudinary URL
            },
        ],
        price: {
            type: Number,
            default: 0,
            min: 0,
        },
        status: {
            type: String,
            enum: ['active', 'sold', 'closed', 'expired'],
            default: 'active',
        },
        is_urgent: {
            type: Boolean,
            default: false,
        },
        expires:{
            type: Date,
        },
        views: {
            type: Number,
            default: 0,
        },
        save_count: {
            type: Number,
            default: 0,
            min: 0
        },

        features: {
            type: mongoose.Schema.Types.Mixed, // Tamamen esnek, dinamik objeler için
            required: false,
            default: {}
        },

        criteria: {
            type: mongoose.Schema.Types.Mixed, // Tamamen esnek, dinamik objeler için
            required: false,
            default: {}
        },

        is_deleted: {
            type: Boolean,
            default: false
        }

    },
    {
        timestamps: true,
        discriminatorKey: 'type', // Each discriminator writes its own type
    }
)

listingSchema.index({ status: 1, createdAt: -1 })
listingSchema.index({ title: 'text', description: 'text' })
listingSchema.index({ owner: 1 })

export const Listing = mongoose.model('Listing', listingSchema)

// ─── DISCRIMINATORS ───────────────────────────────────────────────────────────

// Secondhand Sales
export const SecondhandListing = Listing.discriminator(
    'secondhand',
    new mongoose.Schema({
        condition: {
            type: String,
            enum: ['new', 'like_new', 'good', 'fair'],
            required: [true, 'Item condition is required'],
        },
        category: {
            type: String,
            enum: [
                'textbooks_and_notes',
                'electronics',
                'dorm_and_housing',
                'kitchenware',
                'department_materials',
                'transportation',
                'clothing',
                'hobbies_and_gaming',
                'other'
            ],
            required: [true, 'Category is required'],
        },
        subcategory: {
            type: String,
            trim: true,
            required: false, // Validation will be handled in the controller
        }
    })
)

// Roommate / House Rental
export const RoommateListing = Listing.discriminator(
    'roommate',
    new mongoose.Schema({
        smoking_allowed: {
            type: String,
            trim: true,
            required: [true, 'Smoking policy is required'],
            default: 'Not allowed',
        },
        pet_friendly: {
            type: String,
            trim: true,
            required: [true, 'Pet policy is required'],
            default: 'No',
        },
        gender_preference: { // Students often look for same-gender housemates
            type: String,
            trim: true,
            default: 'No preference',
        }
    })
)

// Carpooling / Ride Sharing
export const CarpoolingListing = Listing.discriminator(
    'carpooling',
    new mongoose.Schema({
        origin: {
            type: String,
            required: [true, 'Origin is required'],
        },
        destination: {
            type: String,
            required: [true, 'Destination is required'],
        },
        departure_date: {
            type: Date,
            required: [true, 'Departure date is required'],
        },
        available_seats: {
            type: Number,
            required: [true, 'Available seats are required'],
            min: 1,
            max: 8,
        },
    })
)

// Course / Private Tutoring
export const CourseListing = Listing.discriminator(
    'course',
    new mongoose.Schema({
        subject: {
            type: String,
            required: [true, 'Subject is required'],
        },
        format: {
            type: String,
            enum: ['online', 'in_person'],
            required: [true, 'Format is required'],
        },
    })
)

// Job Listings
export const JobListing = Listing.discriminator(
    'job',
    new mongoose.Schema({
        application_url: {
            type: String,
            default: null,
        },
        deadline: {
            type: Date,
            default: null,
        },
    })
)

// Scholarship Listings
export const ScholarshipListing = Listing.discriminator(
    'scholarship',
    new mongoose.Schema({
        amount: {
            type: Number,
            default: null,
        },
        deadline: {
            type: Date,
            default: null,
        },
        application_url: {
            type: String,
            default: null,
        },
    })
)

//TODO: ACİL İLANLAR EKLENECEK

