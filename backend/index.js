import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { userRouter, agencyRouter, agentRouter } from './routes/index.js';
import proxyRouter from './proxy/index.js';
import {connectDB} from './config/db.js';

connectDB();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());

// Proxy
app.use('/api/proxy', proxyRouter);

// Routes
app.use('/user', userRouter);
app.use('/agency', agencyRouter);
app.use('/agent', agentRouter);

app.get('/', (req, res) => {
    res.send('Hello world');
});

app.post('/send', (req, res) => {
    const { message, lat, long } = req.body;

    if (!message || lat === undefined || long === undefined) {
        return res.status(400).send({ error: 'Message, lat, and long are required' });
    }

    console.log(`Alert: ${message}, Location: (${lat}, ${long})`);

    // Broadcast to WebSocket clients
    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ message, lat, long }));
        }
    });

    res.status(200).send({ message: 'Alert sent successfully' });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});

// Start Server
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`App running on port ${port}`);
});

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('Client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            const { crewId, latitude, longitude, status } = data;

            console.log(`Received data: Crew ID: ${crewId}, Latitude: ${latitude}, Longitude: ${longitude}, Status: ${status}`);

            // Broadcast updated location to all connected clients
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(data));
                }
            });
        } catch (error) {
            console.error('Invalid WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.log('WebSocket error:', error);
    });
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    wss.clients.forEach((client) => client.close());
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});