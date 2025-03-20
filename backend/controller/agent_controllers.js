import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ResponseAgent, ResponseAgentProfile } from "../model/index.js";

import { signToken, verifyToken } from '../utils/index.js';
import { hashPassword, comparePassword } from '../utils/index.js';
import fs from 'fs';

// Resolve __dirname for ES modules
const fileName = fileURLToPath(import.meta.url);
const dirName = path.dirname(fileName);

dotenv.config({ path: path.resolve(dirName, '../.env') });

const { RESPONSE_AGENT_SECRECT_KEY } = process.env;

export const agentControllers = {
    login: async (req, res) => {
        const { email, password } = req.body;

        try {
            const agent = await ResponseAgent.findOne({ email });
            if (!agent) {
                return res.status(404).json({ message: 'Agent not found' });
            }

            const isMatch = await comparePassword(password, agent.password_hash);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid password' });
            }

            const token = signToken(
                { _id: agent._id, email: agent.email },
                RESPONSE_AGENT_SECRECT_KEY,
                { expiresIn: '24h' }
            );

            res.status(200).json({ message: 'Login successful', token });
        } catch (error) {
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    signup: async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const {
                email,
                password,
                name,
                phone_number,
            } = req.fields;

            if (!email || !password || !name || !phone_number) {
                await session.abortTransaction();
                session.endSession();
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const existingAgent = await ResponseAgent.findOne({ email }).session(session);
            if (existingAgent) {
                await session.abortTransaction();
                session.endSession();
                return res.status(409).json({ error: 'Email already registered' });
            }

            const passwordHash = await hashPassword(password);

            const newAgent = new ResponseAgent({
                email,
                password_hash: passwordHash
            });

            const savedAgent = await newAgent.save({ session });

            const profileData = {
                agent_id: savedAgent._id,
                name,
                phone_number,
                account_created_on: new Date()
            };

            if (req.files?.profile_image) {
                const file = req.files.profile_image;
                profileData.profile_image = fs.readFileSync(file.path);
            } else if (req.fields.profile_image) {
                profileData.profile_image = Buffer.from(req.fields.profile_image, 'base64');
            }

            const newProfile = new ResponseAgentProfile(profileData);
            await newProfile.save({ session });

            const token = signToken(
                { _id: savedAgent._id, email: savedAgent.email },
                RESPONSE_AGENT_SECRECT_KEY,
                { expiresIn: '24h' }
            );

            await session.commitTransaction();
            session.endSession();

            res.status(201).json({
                message: 'Agent registered successfully',
                token,
                agent: {
                    email: savedAgent.email,
                    created_at: savedAgent.created_at
                },
                profile: {
                    name: newProfile.name,
                    phone_number: newProfile.phone_number,
                    agency_id: newProfile.agency_id
                }
            });

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            res.status(500).json({ error: 'Registration failed', details: error.message });
        }
    }
};
