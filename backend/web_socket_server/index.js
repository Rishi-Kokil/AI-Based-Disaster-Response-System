import express from 'express';
import cors from 'cors';
import http from 'http';
import os from 'os';
import cluster from 'cluster';
import { Server } from 'socket.io';
import Redis from 'ioredis';

//config
const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
    console.log(`Master process ${process.pid} is running`);
    for (let i = 0; i < numCPUs; i++) cluster.fork();
    cluster.on("exit", (worker) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    const app = express();
    app.use(cors());
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: { origin: "*", methods: ["GET", "POST"] },
        pingInterval: 25000,
        pingTimeout: 60000,
    });

    // Redis Adapter for Multi-Instance Scaling
    const pubClient = new Redis();
    const subClient = pubClient.duplicate();
    io.adapter(require("socket.io-redis")({ pubClient, subClient }));

    // Middleware for Authentication
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token || token !== "valid-token") return next(new Error("Authentication error"));
        next();
    });

    // Handle Socket.IO Connections
    io.on("connection", (socket) => {
        const userId = socket.handshake.auth.userId; // Assume client sends userId during auth
        let currentTeamId = null;

        console.log(`Client connected: ${socket.id}`);

        // Track user presence in Redis
        socket.on("join_team", async ({ teamId }) => {
            currentTeamId = teamId;
            socket.join(teamId);
            // Store userId → socketId mapping in Redis with TTL
            await pubClient.set(`user:${teamId}:${userId}`, socket.id, "EX", 3600); // 1-hour TTL
            console.log(`${userId} joined team: ${teamId}`);
        });

        socket.on("leave_team", async ({ teamId }) => {
            socket.leave(teamId);
            await pubClient.del(`user:${teamId}:${userId}`);
            currentTeamId = null;
            console.log(`${userId} left team: ${teamId}`);
        });

        socket.on("text_message", ({ teamId, senderId, content }) => {
            const message = { type: "text_message", senderId, content };
            io.to(teamId).emit("message", message);
            console.log(`Text message sent by ${senderId} in team ${teamId}: ${content}`);
        });

        socket.on('message', async (message) => {
            const data = JSON.parse(message);
            const { crewId, latitude, longitude, status } = data;
    
            console.log(`Received data: Crew ID: ${crewId}, Latitude: ${latitude}, Longitude: ${longitude}, Status: ${status}`);
    
        });
    

        // WebRTC Signaling with Presence Check
        socket.on("call_offer", async ({ teamId, senderId, targetId, offer }) => {
            const targetSocketId = await pubClient.get(`user:${teamId}:${targetId}`);
            if (!targetSocketId) {
                return socket.emit("call_error", { error: "User not online" });
            }
            const message = { type: "call_offer", senderId, offer };
            io.to(targetSocketId).emit("call_offer", message); // Send to target's socketId
            console.log(`Call offer sent from ${senderId} to ${targetId}`);
        });

        socket.on("call_answer", async ({ teamId, senderId, targetId, answer }) => {
            const targetSocketId = await pubClient.get(`user:${teamId}:${targetId}`);
            if (!targetSocketId) {
                return socket.emit("call_error", { error: "User not online" });
            }
            const message = { type: "call_answer", senderId, answer };
            io.to(targetSocketId).emit("call_answer", message);
            console.log(`Call answer sent from ${senderId} to ${targetId}`);
        });

        socket.on("ice_candidate", async ({ teamId, senderId, targetId, candidate }) => {
            const targetSocketId = await pubClient.get(`user:${teamId}:${targetId}`);
            if (!targetSocketId) {
                return socket.emit("call_error", { error: "User not online" });
            }
            const message = { type: "ice_candidate", senderId, candidate };
            io.to(targetSocketId).emit("ice_candidate", message);
            console.log(`ICE candidate sent from ${senderId} to ${targetId}`);
        });

        socket.on("disconnect", async () => {
            if (currentTeamId && userId) {
                await pubClient.del(`user:${currentTeamId}:${userId}`);
            }
            console.log(`Client ${socket.id} disconnected`);
        });
    });

    server.listen(PORT, () => {
        console.log(`Worker ${process.pid} running on port ${PORT}`);
    });
}