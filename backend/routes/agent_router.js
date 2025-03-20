import express from 'express';
import formidableMiddleware from 'express-formidable';
import { agentControllers } from '../controller/agent_controllers.js';

const agentRouter = express.Router();

// Routes
agentRouter.post('/signin', formidableMiddleware(), agentControllers.login);
agentRouter.post('/signup', agentControllers.signup);

export default agentRouter;
