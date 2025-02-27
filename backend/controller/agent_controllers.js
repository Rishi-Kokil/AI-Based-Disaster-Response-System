import {ResponseAgent} from '../models';
import {
    signToken,
    verifyToken,
    hashPassword,
    comparePassword
} from '../utils';

const agentControllers = {
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

            const tokenData = { _id: agent._id, email: agent.email, name: agent.name };
            const token = signToken(tokenData, process.env.JWT_SECRET, { expiresIn: '24h' });

            res.status(200).json({ message: 'Login successful', token });
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    },

    signup: async (req, res) => {
        const { name, email, phone_number, password, area_coordinates, profile_details } = req.body;

        try {
            const existingAgent = await ResponseAgent.findOne({ email });
            if (existingAgent) {
                return res.status(400).json({ message: 'Email already in use' });
            }

            const password_hash = await hashPassword(password);

            const newAgent = new ResponseAgent({
                name,
                email,
                phone_number,
                password_hash,
                area_coordinates,
                profile_details
            });

            await newAgent.save();

            const tokenData = { _id: newAgent._id, email: newAgent.email, name: newAgent.name };
            const token = signToken(tokenData, process.env.JWT_SECRET, { expiresIn: '24h' });

            res.status(201).json({ message: 'Signup successful', token });
        } catch (error) {
            console.error('Error during signup:', error);
            res.status(500).json({ message: 'Internal server error' });
        }
    }
};

export default agentControllers;