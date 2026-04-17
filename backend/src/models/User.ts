/*
 * In User.ts we are modeling the user collection of MongoDB database
 * with Mongoose Schema
 *
 */


import mongoose, {Schema,  } from "mongoose";
import {IUser} from "../types/user.types";

const UserSchema = new Schema({
    // ─── CREDENTIALS ──────────────────────────────────────
    username:     { type: String, unique: true, sparse: true },
    email:        { type: String, unique: true, required: true },
    edu_email:    { type: String, unique: true, sparse: true },

    name:         { type: String, required: true },
    surname:      { type: String, required: true },
    birthdate:    { type: Date },
    telephone:    { type: String, unique: true, sparse: true },

    // ─── AUTH ────────────────────────────────────────────
    password:     { type: String },        // It can be null when singup via Google
    googleId:     { type: String, unique: true, sparse: true },
    profile_photo:{ type: String },        // Cloudinary URL

    // ─── ACCOUNT TYPE ────────────────────────────────────
    account_type: {
        type: String,
        enum: ["student", "external"],   // Changed the account type as student or an external user.
        required: true
    },

    // ─── REGISTER PROCESS ─────────────────────────────────
    auth_provider:{ type: String, enum: ["local", "google"], required: true },
    is_complete:  { type: Boolean, default: false },

    // is_verified:  { type: Boolean, default: false },
    /* Should we add this?
    * Because it is going to be validated while the user tries to add their email
    * */

    // ─── AUTHORITY ────────────────────────────────────────
    is_banned:    { type: Boolean, default: false },
    is_admin:     { type: Boolean, default: false },

    // ─── PLATFORM VERİSİ (sadece student'ta dolu olur) ────
    university:         { type: String } ,
    favourite_listings: [{ type: mongoose.Schema.Types.ObjectId, ref: "Listing" }],
    favourite_sellers:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // saved_listings:     { type: Map<String,String>} , Could be a feature
    rating_sum:         { type: Number, default: 0 },
    rating_count:       { type: Number, default: 0 },

}, { timestamps: true })  // created_at, updated_at automatic

const User = mongoose.model<IUser>("User", UserSchema)
export default User