import express from 'express';
import agencyController from '../controller/agency_controllers.js';
import userController from '../controller/user_controllers.js';

const agencyRouter = express.Router();

agencyRouter.post("/login"); 
agencyRouter.post("/signup");
agencyRouter.post("/floopMapping", agencyController.checkGEEInitialized , agencyController.fetchFloodMapping);
agencyRouter.post("/floodMapping/image", agencyController.checkGEEInitialized, agencyController.fetchFloodMappingPng);
agencyRouter.get("/locationMapping", agencyController.fetchLocationMappings);
agencyRouter.get("/volunteer-fetch", userController.fetchVolunteerData);
agencyRouter.post('/fetch-contour-lines', agencyController.checkGEEInitialized, agencyController.fetchContourLines);

export default agencyRouter;
