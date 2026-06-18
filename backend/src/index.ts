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

import http from "http"
import express, { Request, Response } from "express"
import mongoose from "mongoose"
import cors from "cors"



import authRouter from "./routes/auth.router"
import testRouter from './routes/test.router';
import userRouter from "./routes/user.router"
import miscRouter from "./routes/misc.router";
import listingRouter from "./routes/listing.router";
import commendRouter from "./routes/commend.router";
import messageRouter from "./routes/message.router";
import offerRouter from "./routes/offer.router";
import { startExpiredListingsCron } from "./cron/expiredListings.job";
import {initSocket} from "./Socket/Socket";
import {startMessageEmailCron} from "./cron/sendMessageEmail.job";
import { ipResolver, globalLimiter } from "./middleware/middleware";
import adminRouter from "./routes/admin.router";

import { GraphQLContext, createContext } from "./graphql/context";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
// import { resolvers } from "./graphql/resolvers";
import { resolvers } from "./graphql/resolvers/index";
import { typeDefs } from "./graphql/typeDefs/index";
import {startPendingVerificationCron} from "./cron/expiredPendingVerification.prisma.job";

const app = express()
const httpServer = http.createServer(app)   // HTTP Server for Socket.io
const PORT = process.env.PORT || 5000

// ─── MIDDLEWARE ──────────────────────────────
app.set("trust proxy", 1);
app.use(express.json())
app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}))

// ─── RATE LIMITING & IP ──────────────────────
// Sıralama çok kritik: Önce IP bulunur, sonra limit uygulanır
app.use(ipResolver);
app.use(globalLimiter);

// ─── ROUTES ──────────────────────────────────

// We will add these in the future
app.use("/api/auth", authRouter);
app.use("/api/misc", miscRouter);
app.use('/api/test', testRouter);
app.use('/api/listing', listingRouter);
app.use('/api/comment', commendRouter);
app.use("/api/user", userRouter);
app.use("/api/messaging", messageRouter);
app.use("/api/offer", offerRouter);
app.use('/api/admin', adminRouter);

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

        // ─── APOLLO SERVER ENTEGRASYONU (YENİ) ───────────
        const apolloServer = new ApolloServer<GraphQLContext>({
            typeDefs,
            resolvers
                // : resolvers as any
        });

        await apolloServer.start();

        app.use("/graphql", expressMiddleware(apolloServer, {
            context: async ({ req, res }: { req: any; res: any }) => createContext({ req, res })
        }));
        // ──────────────────────────────────────────────────

        //Web Socket Server
        initSocket(httpServer)

        // Zamanlanmış görevleri başlat
        startExpiredListingsCron();

        startMessageEmailCron();

        startPendingVerificationCron(); //Prisma Cron

        httpServer.listen(PORT, () => {
            console.log(`   Server running on http://localhost:${PORT}`)
            console.log(`  GraphQL running on http://localhost:${PORT}/graphql`)
        })
    } catch (error) {
        console.error("Startup error:", error)
        process.exit(1)
    }

}

start()