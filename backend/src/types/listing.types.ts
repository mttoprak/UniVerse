import { Types } from 'mongoose'

// ─── BASE ─────────────────────────────────────────────────────────────────────

export interface IBaseListing {
    _id: Types.ObjectId
    owner: Types.ObjectId
    title: string
    description: string
    location: string
    photos: string[]
    price: number
    status: 'active' | 'sold' | 'closed' | 'expired'
    expires: number
    is_urgent: boolean
    views: number
    save_count: number
    features: Record<string, string>
    criteria: Record<string, string>
    createdAt: Date
    updatedAt: Date
}

// ─── DISCRIMINATOR TYPES ──────────────────────────────────────────────────────

export interface ISecondhandListing extends IBaseListing {
    type: 'secondhand'
    condition: 'new' | 'like_new' | 'good' | 'fair'
    category:
        | 'textbooks_and_notes'
        | 'electronics'
        | 'dorm_and_housing'
        | 'kitchenware'
        | 'department_materials'
        | 'transportation'
        | 'clothing'
        | 'hobbies_and_gaming'
        | 'other'
    subcategory?: string
}

export interface IRoommateListing extends IBaseListing {
    type: 'roommate'
    smoking_allowed: string
    pet_friendly: string
    gender_preference: string
}

export interface ICarpoolingListing extends IBaseListing {
    type: 'carpooling'
    origin: string
    destination: string
    departure_date: Date
    available_seats: number
}

export interface ICourseListing extends IBaseListing {
    type: 'course'
    subject: string
    format: 'online' | 'in_person'
}

export interface IJobListing extends IBaseListing {
    type: 'job'
    application_url: string | null
    deadline: Date | null
}

export interface IScholarshipListing extends IBaseListing {
    type: 'scholarship'
    amount: number | null
    deadline: Date | null
    application_url: string | null
}

// ─── UNION ────────────────────────────────────────────────────────────────────

export type IListing =
    | ISecondhandListing
    | IRoommateListing
    | ICarpoolingListing
    | ICourseListing
    | IJobListing
    | IScholarshipListing

// ─── LISTING TYPE KEY ─────────────────────────────────────────────────────────

export type ListingType = IListing['type']
// 'secondhand' | 'roommate' | 'carpooling' | 'course' | 'job' | 'scholarship'

// ─── TYPE GUARDS ──────────────────────────────────────────────────────────────

export const isSecondhand   = (l: IListing): l is ISecondhandListing  => l.type === 'secondhand'
export const isRoommate      = (l: IListing): l is IRoommateListing    => l.type === 'roommate'
export const isCarpooling    = (l: IListing): l is ICarpoolingListing  => l.type === 'carpooling'
export const isCourse           = (l: IListing): l is ICourseListing      => l.type === 'course'
export const isJob                = (l: IListing): l is IJobListing         => l.type === 'job'
export const isScholarship   = (l: IListing): l is IScholarshipListing => l.type === 'scholarship'