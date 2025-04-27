import fs from 'fs';
import axios from 'axios';
import FormData from 'form-data';
import formidable from 'formidable';
import jwt from 'jsonwebtoken';
import Volunteer from '../model/volunteer_model.js';
import { User, UserDisasterReport } from '../model/index.js';

const userController = {
  // Register a new user
  register: async (req, res, next) => {
    try {
      const { name, email, password } = req.body;
      const user = new User({ name, email, password });
      await user.save();
      res.json({ success: true, message: 'User registered successfully', data: user });
    } catch (e) {
      next(e);
    }
  },

  // Login existing user
  login: async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid password' });
      }
      const tokendata = { _id: user._id, email: user.email, name: user.name };
      const token = jwt.sign(tokendata, 'arip', { expiresIn: '24h' });
      res.status(200).json({ success: true, message: 'User logged in successfully', token });
    } catch (e) {
      next(e);
    }
  },

  // Upload an image and process it via external service
  uploadImage: async (req, res, next) => {
    try {
      const token = req.headers['authorization']?.split(' ')[1];
      if (!token) {
        return res.status(400).json({ message: 'JWT token is required' });
      }
      const decoded = jwt.verify(token, 'arip');
      const userId = decoded._id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { location } = req.body;
      const imagePath = req.file.path;

      // Parse location string "lat: X, long: Y"
      const [latPart, longPart] = location.split(', ');
      const latitude = parseFloat(latPart.split(': ')[1]);
      const longitude = parseFloat(longPart.split(': ')[1]);

      // Send image to processing service
      const form = new FormData();
      form.append('image', fs.createReadStream(imagePath));
      const response = await axios.post('http://127.0.0.1:5000/process-image', form, { headers: form.getHeaders() });
      const { description, severity } = response.data;

      // If not a disaster, return without saving
      if (severity === 'Not a Natural Disaster') {
        return res.json({ success: true, description, severity, data: user });
      }

       // Step 2: Now send POST to '/user/upload-disaster-report'
      const formToNode = new FormData();
      formToNode.append('file', fs.createReadStream(imagePath));
      formToNode.append('type', 'image');
      formToNode.append('latitude', latitude);
      formToNode.append('longitude', longitude);
      formToNode.append('description', description);
      formToNode.append('severity', severity);

      const nodeResponse = await axios.post('http://127.0.0.1:3000/user/upload-disaster-report', formToNode, {
        headers: {
          ...formToNode.getHeaders(),
          Authorization: `Bearer ${token}`,
        },
      });

      // Save upload to user's uploads array
      user.uploads.push({
        type: 'image',
        filePath: imagePath,
        location: { latitude, longitude },
        description,
        severity
      });
      await user.save();

      res.json({ success: true, message: 'Image uploaded successfully', data: user, description, severity });
    } catch (e) {
      next(e);
    }
  },

  // Upload audio transcript
  uploadAudioTranscript: async (req, res, next) => {
    try {
      const token = req.headers['authorization']?.split(' ')[1];
      if (!token) {
        return res.status(400).json({ message: 'JWT token is required' });
      }
      const decoded = jwt.verify(token, 'arip');
      const userId = decoded._id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { text, latitude, longitude } = req.body;
      user.uploads.push({
        type: 'audio',
        transcript: text,
        location: { latitude, longitude }
      });
      await user.save();
      res.json({ success: true, message: 'Audio transcript uploaded successfully', data: user });
    } catch (e) {
      next(e);
    }
  },

  // Get all image locations and severity
  getAllImageLocationsAndSeverity: async (req, res, next) => {
    try {
      const users = await User.find({}, 'uploads');
      const data = users.flatMap(u => u.uploads
        .filter(upload => upload.type === 'image')
        .map(upload => ({ location: upload.location, severity: upload.severity }))
      );
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  },

  // Create a volunteer record
  createVolunteer: async (req, res, next) => {
    try {
      const { name, phoneNumber, age, district, state, country } = req.body;
      const volunteer = new Volunteer({ name, phoneNumber, age, district, state, country });
      await volunteer.save();
      res.json({ success: true, message: 'Volunteer registered successfully', data: volunteer });
    } catch (e) {
      next(e);
    }
  },

  // Count volunteers
  countVolunteers: async (req, res, next) => {
    try {
      const count = await Volunteer.countDocuments();
      res.json({ success: true, count });
    } catch (e) {
      next(e);
    }
  },

  // Fetch volunteer data
  fetchVolunteerData: async (req, res, next) => {
    try {
      const volunteers = await Volunteer.find({});
      res.json({ success: true, data: volunteers });
    } catch (e) {
      next(e);
    }
  },

  uploadDisasterReport: async (req, res, next) => {
    try {
      // 1) Authenticate
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(401).json({ message: 'Authorization header missing' });
      }
      const token = authHeader.split(' ')[1];
      if (!token) {
        return res.status(401).json({ message: 'JWT token missing' });
      }
      let decoded;
      try {
        decoded = jwt.verify(token, 'arip');
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired token' });
      }
      const userId = decoded._id;
  
      // 2) Grab form data and file (express-formidable)
      const { type, latitude, longitude } = req.fields;
      const file = req.files?.file;
      if (!file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
  
      // 3) Validate type and file size
      if (!['image', 'audio'].includes(type)) {
        fs.unlink(file.path, () => {});
        return res.status(400).json({ message: 'Invalid report type' });
      }
      if (file.size > 5 * 1024 * 1024) {
        fs.unlink(file.path, () => {});
        return res.status(400).json({ message: 'File too large (max 5 MB)' });
      }
  
      let description;
      let severity;
      let transcript;
  
      // 4) If image → call Flask server to get description and severity
      if (type === 'image') {
        const form = new FormData();
        form.append('image', fs.createReadStream(file.path));
  
        const flaskResponse = await axios.post('http://127.0.0.1:5000/process-image', form, {
          headers: form.getHeaders(),
        });
  
        ({ description, severity } = flaskResponse.data);
  
        if (!severity || severity === 'Not a Natural Disaster') {
          // Clean up temp file
          fs.unlink(file.path, () => {});
          return res.status(200).json({
            success: true,
            message: 'Image processed but not a natural disaster',
            description,
            severity,
          });
        }
      } 
      // 5) If audio → you might later add audio processing here (optional)
      else if (type === 'audio') {
        transcript = req.fields.transcript;
        if (!transcript) {
          fs.unlink(file.path, () => {});
          return res.status(400).json({ message: 'Transcript is required for audio' });
        }
      }
  
      // 6) Convert file to Base64
      const fileData = fs.readFileSync(file.path, 'base64');
  
      // 7) Build location object (if provided)
      const location = {};
      if (latitude != null && longitude != null) {
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        if (!isNaN(lat) && !isNaN(lon)) {
          location.latitude = lat;
          location.longitude = lon;
        }
      }
  
      // 8) Build and validate report document
      const reportFields = {
        user: userId,
        type,
        fileData,
        location: Object.keys(location).length ? location : undefined,
      };
  
      if (type === 'image') {
        reportFields.description = description;
        reportFields.severity = severity;
      } else {
        reportFields.transcript = transcript;
      }
  
      // 9) Save to MongoDB
      const report = new UserDisasterReport(reportFields);
      await report.save();
  
      // 10) Clean up temp file
      fs.unlink(file.path, () => {});
  
      // 11) Respond
      return res
        .status(201)
        .json({ success: true, message: 'Disaster report uploaded', report });
    } catch (err) {
      next(err);
    }
  }
  
  
  
};

export default userController;

