import express from 'express';
import cors from 'cors';
import http from 'http';
import os from 'os';
import cluster from 'cluster';
import { Server } from 'socket.io';
import Redis from 'ioredis';

// Config
const PORT = process.env.PORT || 3000;
const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
    console.log(`Master process ${process.pid} is running`);
   
    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on("exit", (worker) => {
        console.log(`Worker ${worker.process.pid} died. Restarting...`);
        cluster.fork();
    });
} else {
    const app = express();
    app.use(cors());
    const server = http.createServer(app);
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
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
        if (!token || token !== "valid-token") {
            return next(new Error("Authentication error"));
        }
        next();
    });

    // Handle Socket.IO Connections
    io.on("connection", (socket) => {
        console.log(`Client connected: ${socket.id}`);

        socket.on("join_team", ({ teamId, userId }) => {
            socket.join(teamId); // Join the team room
            console.log(`${userId} joined team: ${teamId}`);
        });

        socket.on("leave_team", ({ teamId, userId }) => {
            socket.leave(teamId); // Leave the team room
            console.log(`${userId} left team: ${teamId}`);
        });

        socket.on("text_message", ({ teamId, senderId, content }) => {
            const message = { type: "text_message", senderId, content };
            io.to(teamId).emit("message", message); // Broadcast to all members in the team
            console.log(`Text message sent by ${senderId} in team ${teamId}: ${content}`);
        });

        socket.on("call_offer", ({ teamId, senderId, targetId, offer }) => {
            const message = { type: "call_offer", senderId, offer };
            io.to(targetId).emit("call_offer", message); // Send offer to the target user
            console.log(`Call offer sent from ${senderId} to ${targetId}`);
        });

        socket.on("call_answer", ({ teamId, senderId, targetId, answer }) => {
            const message = { type: "call_answer", senderId, answer };
            io.to(targetId).emit("call_answer", message); // Send answer to the caller
            console.log(`Call answer sent from ${senderId} to ${targetId}`);
        });

        socket.on("ice_candidate", ({ teamId, senderId, targetId, candidate }) => {
            const message = { type: "ice_candidate", senderId, candidate };
            io.to(targetId).emit("ice_candidate", message); // Forward ICE candidate to the target user
            console.log(`ICE candidate sent from ${senderId} to ${targetId}`);
        });

        socket.on("disconnect", (reason) => {
            console.log(`Client ${socket.id} disconnected: ${reason}`);
        });
    });

    server.listen(PORT, () => {
        console.log(`Worker ${process.pid} running on port ${PORT}`);
    });
}