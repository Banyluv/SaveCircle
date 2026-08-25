import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_savecircle');
            const user = await User.findById(decoded.id);
            if (!user) {
                return res.status(401).json({ message: 'Not authorized, token failed' });
            }
            const { password, ...safeUser } = user;
            req.user = safeUser;
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }
    if (!token) {
        return res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Allows admin, superadmin, and (for backwards compatibility) trustee
export const isTrustee = (req, res, next) => {
    if (req.user && ['admin', 'superadmin', 'trustee'].includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

export const isSuperAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'superadmin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as super admin' });
    }
};
