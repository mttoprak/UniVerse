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
import { startExpiredListingsCron } from "./cron/expiredListings.prisma.job";
import { initSocket } from "./Socket/Socket";
import { startMessageEmailCron } from "./cron/sendMessageEmail.prisma.job";
import { ipResolver, globalLimiter } from "./middleware/middleware";
import adminRouter from "./routes/admin.router";

import { GraphQLContext, createContext } from "./graphql/context";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import { resolvers } from "./graphql/resolvers/index";
import { typeDefs } from "./graphql/typeDefs/index";
import {startPendingVerificationCron} from "./cron/expiredPendingVerification.prisma.job";

import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { prisma } from "./graphql/context";
import jwt from 'jsonwebtoken';
import { onlineUsersMap } from "./utils/onlineUsers.util";

const app = express()
const httpServer = http.createServer(app)   // HTTP Server for Socket.io
const PORT = process.env.PORT || 5000

// ─── MIDDLEWARE ──────────────────────────────
app.set("trust proxy", 1);
app.use(express.json())
app.use(cors({
    origin: [process.env.CLIENT_URL || "http://localhost:3000", "http://192.168.1.59:3000"], // Local IP'ni de ekle (hata logunda bu IP'den istek geldiği gözüküyor)
    credentials: true
}))
// ─── RATE LIMITING & IP ──────────────────────
// Sıralama çok kritik: Önce IP bulunur, sonra limit uygulanır
app.use(ipResolver);

// WebSocket handshake isteklerini (Upgrade) rate limiter'dan hariç tutuyoruz
// app.use((req, res, next) => {
//     // Eğer istek bir WebSocket Upgrade isteğiyse Limiter'ı atla
//     if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
//         return next();
//     }
//     // Değilse global limiter'a gir
//     globalLimiter(req, res, next);
// });
// ─── ROUTES ──────────────────────────────────

// // We will add these in the future
// app.use("/api/auth", authRouter);
// app.use("/api/misc", miscRouter);
// app.use('/api/test', testRouter);
// app.use('/api/listing', listingRouter);
// app.use('/api/comment', commendRouter);
// app.use("/api/user", userRouter);
// app.use("/api/messaging", messageRouter);
// app.use("/api/offer", offerRouter);
// app.use('/api/admin', adminRouter);

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
        // await connect()

        // ─── APOLLO SERVER ENTEGRASYONU ───────────
        const schema = makeExecutableSchema({ typeDefs, resolvers });

        // 2. WebSocket Sunucusunu Oluştur
        // httpServer'ı dinleyerek '/graphql' yoluna gelen WebSocket isteklerini yakalayacak
        const wsServer = new WebSocketServer({
            server: httpServer,
            path: '/graphql',
        });

        // 3. graphql-ws kütüphanesini WebSocket sunucumuza bağlıyoruz
        // const serverCleanup = useServer({ schema }, wsServer);

        const serverCleanup = useServer({
            schema,

            onConnect: async (ctx) => {
                const paramAuth = ctx.connectionParams?.Authorization as string | undefined;
                const headerAuth = ctx.extra.request.headers.authorization;
                const authHeader = paramAuth || headerAuth;

                if (authHeader && authHeader.startsWith("Bearer ")) {
                    try {
                        const token = authHeader.split(" ")[1];
                        const decodedUnverified = jwt.decode(token) as any;

                        if (decodedUnverified && decodedUnverified.userId) {
                            const userId = decodedUnverified.userId;

                            // IP adresini yakalama
                            const req = ctx.extra.request;
                            const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "Bilinmiyor";
                            const ip = Array.isArray(rawIp) ? rawIp[0] : rawIp;

                            const existingUser = onlineUsersMap.get(userId);

                            if (existingUser) {
                                // Zaten online, sekme sayısını artır
                                existingUser.connectionsCount += 1;
                            } else {
                                // İlk bağlantı
                                onlineUsersMap.set(userId, {
                                    ip,
                                    connectedAt: new Date().toISOString(),
                                    connectionsCount: 1
                                });
                            }

                            // Disconnect için userId'yi context cebine koy
                            (ctx.extra as any).userId = userId;
                        }
                    } catch (err) {
                        // Hataları yut, doğrulama asıl context'te yapılacak
                    }
                }
            },
            onDisconnect: (ctx) => {
                const userId = (ctx.extra as any).userId;
                if (userId) {
                    const existingUser = onlineUsersMap.get(userId);
                    if (existingUser) {
                        existingUser.connectionsCount -= 1;
                        if (existingUser.connectionsCount <= 0) {
                            onlineUsersMap.delete(userId);
                        }
                    }
                }
            },

            context: async (ctx, msg, args) => {
                // 1. Frontend (Apollo Client) üzerinden gelme ihtimali (Connection Params)
                const paramAuth = ctx.connectionParams?.Authorization as string | undefined;

                // 2. Postman (HTTP Headers veya Authorization sekmesi) üzerinden gelme ihtimali
                const headerAuth = ctx.extra.request.headers.authorization;

                // Hangisi doluysa onu kullan (İkisi de varsa paramAuth öncelikli)
                const authHeader = paramAuth || headerAuth;

                console.log("=== WEBSOCKET TOKEN KONTROLÜ ===");
                console.log("1. Connection Params'tan gelen:", paramAuth ? "VAR" : "YOK");
                console.log("2. HTTP Headers'tan gelen:", headerAuth ? "VAR" : "YOK");

                let userId = null;
                let tokenType = null;
                let user = null;
                const clientIp = "WebSocket";

                if (authHeader && authHeader.startsWith("Bearer ")) {
                    try {
                        const token = authHeader.split(" ")[1];

                        // Şifresiz okuma
                        const decodedUnverified = jwt.decode(token) as any;

                        if (decodedUnverified && decodedUnverified.userId) {
                            // Doğru gizli anahtarı seç (Env değişkenlerini geri ekledim)
                            const secret = decodedUnverified.type === "temp"
                                ? (process.env.JWT_TEMP_SECRET || "yedek_temp_gizli_anahtar")
                                : (process.env.JWT_SECRET || "yedek_access_gizli_anahtar");

                            // Resmen onayla
                            const decoded = jwt.verify(token, secret) as any;

                            userId = decoded.userId;
                            tokenType = decoded.type as "access" | "temp";

                            console.log("✅ Başarılı! Çözülen User ID:", userId);

                            user = await prisma.user.findUnique({
                                where: { id: userId }
                            });
                        }
                    } catch (error: any) {
                        console.error("❌ [WebSocket Auth] Token hatası:", error.message);
                    }
                } else {
                    console.log("⚠️ Token formata uymuyor veya hiç gönderilmedi.");
                }

                return {
                    prisma,
                    userId,
                    tokenType,
                    user,
                    clientIp
                };
            }
        }, wsServer);

        // 4. Apollo Server Entegrasyonu
        const apolloServer = new ApolloServer<GraphQLContext>({
            schema,
            plugins: [
                // HTTP sunucusunu güvenli kapatmak için
                ApolloServerPluginDrainHttpServer({ httpServer }),
                // WebSocket sunucusunu güvenli kapatmak için
                {
                    async serverWillStart() {
                        return {
                            async drainServer() {
                                await serverCleanup.dispose();
                            },
                        };
                    },
                },
            ],
        });

        await apolloServer.start();

        app.use("/graphql", expressMiddleware(apolloServer, {
            context: async ({ req, res }: { req: any; res: any }) => createContext({ req, res })
        }));
        // ──────────────────────────────────────────────────

        //Web Socket Server
        // initSocket(httpServer)

        // Zamanlanmış görevleri başlat
        // startExpiredListingsCron();

        startExpiredListingsCron();

        // startMessageEmailCron();

        startMessageEmailCron();// Prisma Cron4

        // startPendingVerificationCron();

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