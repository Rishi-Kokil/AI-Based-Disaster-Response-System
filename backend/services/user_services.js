import userSchema from '../model/user_model.js';
import Volunteer from '../model/volunteer_model.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';


class UserService {
    static async registerUser(name, email, password) {
        try {
            const user = new userSchema({
                name: name,
                email: email,
                password: password
            });
            await user.save();
            return user;
        } catch (e) {
            console.log('Error', e);
        }
    }

    static async loginUser(email) {
        try {
            return await userSchema.findOne({ email });
        } catch (error) {
            console.log('Error', error);
        }
    }

    static async generateToken(tokendata, secretkey, jwt_expire) {
        return jwt.sign(tokendata, secretkey, { expiresIn: jwt_expire });
    }

    static async uploadImage(token, imagePath, location) {
        try {
            const decoded = jwt.verify(token, 'arip'); // Ensure JWT_SECRET is correctly set
            const userId = decoded._id;
            const user = await userSchema.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Parse the location string
            const locationParts = location.split(', ');
            const latitude = parseFloat(locationParts[0].split(': ')[1]);
            const longitude = parseFloat(locationParts[1].split(': ')[1]);
            
            //Send image to Flask server
            const form = new FormData();
            form.append('image', fs.createReadStream(imagePath));

            const response = await axios.post('http://127.0.0.1:5000/process-image', form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            const { description, severity } = response.data;

            // Do not add to database if severity is "Not a natural Disaster"
            if (severity === "Not a Natural Disaster") {
                return { user, description, severity };
            }
            user.uploads.push({
                imagePath: imagePath,
                location: {
                    latitude: latitude,
                    longitude: longitude
                },
                imageDescription: response.data.description,
                severity: response.data.severity
            });

            await user.save();

            return {user, description, severity};
        } catch (error) {
            console.log('Error', error);
            throw error;
        }
    }

    static async uploadAudioTranscript(token, text, latitude, longitude) {
        try {
            const decoded = jwt.verify(token, 'arip'); // Ensure JWT_SECRET is correctly set
            const userId = decoded._id;
            const user = await userSchema.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            user.uploads.push({
                type: 'audio',
                transcript: text,
                location: {
                    latitude: latitude,
                    longitude: longitude
                }
            });

            await user.save();
            return user;
        } catch (error) {
            console.log('Error', error);
            throw error;
        }
    }

    static async getAllImageLocationsAndSeverity() {
        try {
            const users = await userSchema.find({}, 'uploads');
            const data = users.flatMap(user => user.uploads.map(upload => ({
                location: upload.location,
                severity: upload.severity
            })));
            return data;
        } catch (error) {
            console.log('Error', error);
            throw error;
        }
    }

    static async createVolunteer(name, phoneNumber, age, district, state, country) {
        try {
            const volunteer = new Volunteer({
                name,
                phoneNumber,
                age,
                district,
                state,
                country
            });
            await volunteer.save();
            return volunteer;
        } catch (error) {
            console.log('Error', error);
            throw error;
        }
    }

    static async countVolunteers() {
        try {
            const count = await Volunteer.countDocuments();
            return count;
        } catch (error) {
            console.log('Error', error);
            throw error;
        }
    }

    static async fetchVolunteerData(){
        try {
            const volunteers= await Volunteer.find({});
            return volunteers;
        } catch (error) {
            console.log("Error:",error);
            throw error;
        }
    }

}

export default UserService;