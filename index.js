import { Server } from "socket.io";
import app from "./src/app.js";
import connectDb from "./src/config/db.js";
import dotEnv from 'dotenv'
dotEnv.config()
import http, { createServer } from 'http'
import { socketHandler } from "./src/config/socket.js";

const PORT = process.env.PORT

const server = createServer(app)

const io = new Server(server, {
    cors: {
        origin: process.env.CORS_ORIGIN,
        credentials: true,
        methods: ['POST', 'GET']
    }
})

app.set('io', io)
socketHandler(io)

connectDb().then(() => {
    server.listen(PORT, () => {
        console.log(`server is running on http://localhost:${PORT}`);
    })
}).catch(() => {
    console.log('server connection failed');
})