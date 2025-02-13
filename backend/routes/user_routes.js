import { Router } from 'express';
import userController from '../controller/user_controller.js';
import multer from 'multer';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // Configure multer to store uploaded files in the 'uploads' directory


router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/upload-image', upload.single('image'), userController.uploadImage);
router.get('/image-locations', userController.getAllImageLocationsAndSeverity); 
router.post('/volunteer-registration', userController.createVolunteer);
router.get('/volunteer-count', userController.countVolunteers); 
router.post('/upload-audio-transcript', userController.uploadAudioTranscript);


export default router;