import app from './app.js';
import db from './config/db.js';
import userModel from './model/user_model.js';
import CrewLocation from './model/response_crew_model.js';
import { WebSocketServer, WebSocket } from 'ws';

const port = 3000;

app.get('/', (req, res) => {
    res.send('Hello world');
});

const server = app.listen(port, '0.0.0.0', () => { 
    console.log(`App running on port ${port}`);
});

// Set up WebSocket server
const wss = new WebSocketServer({ server, perMessageDeflate: false });

wss.on('connection', (ws, req) => {
    console.log('New client connected:', req.socket.remoteAddress);
});

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        const { crewId, latitude, longitude, status } = data;

        console.log(`Received data: Crew ID: ${crewId}, Latitude: ${latitude}, Longitude: ${longitude}, Status: ${status}`);

        // Update or create crew location in the database
        // await CrewLocation.findOneAndUpdate(
        //     { crewId },
        //     { latitude, longitude, status, timestamp: new Date() },
        //     { upsert: true, new: true }
        // );

        // Broadcast updated location to all connected clients
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.log('WebSocket error:', error);
    });
});