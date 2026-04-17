/*
 * In user.types.ts we define the types for using
 * mongoose/mongodb models into TypeScript types
 *
 */


import { Document, Types } from "mongoose"

export interface IUser extends Document {
    _id: Types.ObjectId

    username?:      string
    email:          string
    edu_email?:     string
    name:           string
    surname:        string
    birthdate?:     Date
    telephone?:     string

    password?:      string
    googleId?:      string
    profile_photo?: string

    account_type:   "student" | "external"
    auth_provider:  "local" | "google"
    is_complete:    boolean
    // is_verified:    boolean
    // I didn't decide rather add this or not. AI still insist on it but, I feel we don't need

    is_banned:      boolean
    is_admin:       boolean

    university?:        string
    favourite_listings: Types.ObjectId[]
    favourite_sellers:  Types.ObjectId[]
    rating_sum:         number
    rating_count:       number

    createdAt: Date
    updatedAt: Date
}