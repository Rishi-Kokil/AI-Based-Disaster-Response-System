import { Router } from 'express';
import userController from '../controller/user_controllers.js';
import multer from 'multer';

const userRouter = Router();
const upload = multer({ dest: 'uploads/' }); // Configure multer to store uploaded files in the 'uploads' directory

userRouter.post('/register', userController.register);
userRouter.post('/login', userController.login);
userRouter.post('/upload-image', upload.single('image'), userController.uploadImage);
userRouter.get('/image-locations', userController.getAllImageLocationsAndSeverity); 
userRouter.post('/volunteer-registration', userController.createVolunteer);
userRouter.get('/volunteer-count', userController.countVolunteers); 
userRouter.post('/upload-audio-transcript', userController.uploadAudioTranscript);

export default userRouter;
