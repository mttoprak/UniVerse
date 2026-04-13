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



import express, { Request, Response } from 'express'; // I think we can rephrase this as
// " import * as express from 'express' " but the first rule of the programing is never touch any code that works
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;


dotenv.config();
app.use(express.json());
app.use(cors());


const connect=async()=>{ //connection to the database
    if (!process.env.MONGO_URI) {
        console.error("Error: MONGO_URI environment variable is not defined.");
        process.exit(1);
    }
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to MongoDB Atlas");
        console.log(`Backend server running on port ${PORT}`);
    } catch (error) {
        console.error("DB Connection Error:", error);
    }
}

mongoose.connection.on("disconnected", () => { // the error message when database disconnection
    console.log("mongoDB disconnected!");
});


app.get('/', (req: Request, res: Response) => {
    res.send('UniVerse Backend API working');
});

app.listen(PORT, () => {
    connect() //database
    console.log(`Server started working in http://localhost:${PORT}!`);
});