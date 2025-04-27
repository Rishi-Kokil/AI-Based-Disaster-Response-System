import { Router } from 'express';
import userController from '../controller/user_controllers.js';
import formidable from 'express-formidable';
import multer from 'multer';

const formOpts = {
  uploadDir: 'uploads/',
  keepExtensions: true,
  maxFileSize: 5 * 1024 * 1024,
  multiples: false
}

const userRouter = Router();
const upload = multer({ dest: 'uploads/' }); // Store uploaded files temporarily in 'uploads/' folder

// EXISTING ROUTES
userRouter.get('/image-locations', userController.getAllImageLocationsAndSeverity);
userRouter.get('/volunteer-count', userController.countVolunteers);

userRouter.post('/register', userController.register);
userRouter.post('/login', userController.login);

userRouter.post('/upload-image', upload.single('image'), userController.uploadImage);
userRouter.post('/volunteer-registration', userController.createVolunteer);
userRouter.post('/upload-audio-transcript', userController.uploadAudioTranscript);

// ✅ NEW ROUTE: for uploading Disaster Report (audio/image base64)
userRouter.post('/upload-disaster-report', formidable(), userController.uploadDisasterReport);

export default userRouter;
