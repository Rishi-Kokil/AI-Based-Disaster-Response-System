import express from 'express';
import { checkGEEInitialized, fetchFloodMapping, fetchLocationMappings } from '../controller/admin_controller.js';
import userController from '../controller/user_controller.js';

const agencyRouter = express.Router();

agencyRouter.post("/login"); 
agencyRouter.post("/signup");
agencyRouter.post("/floopMapping", checkGEEInitialized , fetchFloodMapping);

agencyRouter.get("/locationMapping", fetchLocationMappings);
agencyRouter.get("/volunteer-fetch", userController.fetchVolunteerData);

export default agencyRouter;
