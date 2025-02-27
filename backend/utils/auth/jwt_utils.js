import jwt from 'jsonwebtoken';

export function signToken(payload, secretKey, options = {}) {
    return jwt.sign(payload, secretKey, options);
}

export function verifyToken(token, secretKey) {
    try {
        return jwt.verify(token, secretKey);
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
}
