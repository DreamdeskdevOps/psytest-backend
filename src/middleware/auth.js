const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { promisify } = require('util');

const authMiddleware = async (req, res, next) => {
    try {
        // First try to get token from cookies, then fallback to Authorization header
        let token = req.cookies?.token;

        if (!token) {
            token = req.headers.authorization?.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: No token provided' });
        }

        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    }
};

const hashPassword = async (password) => {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
};

const comparePassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

const generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });
};

const generateRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    });
};

const authenticateAdmin = async (req, res, next) => {
    try {
        // First try to get token from cookies, then fallback to Authorization header
        let token = req.cookies?.adminToken;

        if (!token) {
            token = req.headers.authorization?.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: No token provided',
                data: null
            });
        }

        const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
        req.admin = decoded; // Use req.admin instead of req.user for admin routes
        next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid token',
            data: null
        });
    }
};

// Permission checking middleware
const checkPermission = (requiredPermission) => {
    return (req, res, next) => {
        // For now, we'll allow all authenticated admins to perform all actions
        // In a production environment, you would implement proper role-based permissions
        if (!req.admin) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized: Admin authentication required',
                data: null
            });
        }
        
        // Simple permission check - in a real app, you would check against user roles/permissions
        next();
    };
};

module.exports = {
    authMiddleware,
    authenticateAdmin,
    checkPermission,
    hashPassword,
    comparePassword,
    generateToken,
    generateRefreshToken
};