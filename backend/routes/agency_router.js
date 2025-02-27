import express from 'express';
import agencyController from '../controller/agency_controllers.js';
import userController from '../controller/user_controllers.js';

const agencyRouter = express.Router();

agencyRouter.post("/login"); 
agencyRouter.post("/signup");
agencyRouter.post("/floopMapping", agencyController.checkGEEInitialized , agencyController.fetchFloodMapping);

agencyRouter.get("/locationMapping", agencyController.fetchLocationMappings);
agencyRouter.get("/volunteer-fetch", userController.fetchVolunteerData);

export default agencyRouter;
