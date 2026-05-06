/*
 * In index.ts we arrange the entire backend.
 * We adjust cors in here.
 * We set the port for the backend in here.
 * We connect to the database in here.
 * We WILL connect to the socket.io in here.
 * We WILL route the routers in here.
 * ...
 *
 */


import dotenv from "dotenv"
dotenv.config()

import express, { Request, Response } from "express"
import mongoose from "mongoose"
import cors from "cors"
import authRouter from "./routes/auth.router"
import testRouter from './routes/test.router';
import userRouter from "./routes/user.router"
import {Resend} from "resend";
import miscRouter from "./routes/misc.router";
import listingRouter from "./routes/listing.router";


const app = express()
const PORT = process.env.PORT || 5000

// ─── MIDDLEWARE ──────────────────────────────
app.use(express.json())
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}))

// ─── ROUTES ──────────────────────────────────

// We will add these in the future
app.use("/api/auth", authRouter)
app.use("/api/misc", miscRouter)
app.use('/api/test', testRouter);
app.use('/api/listing', listingRouter);
// app.use("/api/auth", authRoutes)
// app.use("/api/users", userRoutes)

app.get("/", (req: Request, res: Response) => {
    res.json({ message: "UniVerse Backend API working" })
})

// ─── DB + SERVER ─────────────────────────────
const connect = async () => {
    if (!process.env.MONGO_URI) {
        console.error("MONGO_URI is not defined")
        process.exit(1)
    }
    await mongoose.connect(process.env.MONGO_URI, {dbName: 'UniVerse'})
    console.log("Connected to MongoDB Atlas")
}

mongoose.connection.on("disconnected", () => {
    console.log("MongoDB disconnected!")
})

const start = async () => {
    try {
        await connect()
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`)
        })
    } catch (error) {
        console.error("Startup error:", error)
        process.exit(1)
    }

}

start()