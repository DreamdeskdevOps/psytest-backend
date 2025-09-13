const rateLimit = require('express-rate-limit');

// Admin Login Rate Limiter
const rateLimitLogin = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many login attempts. Please try again later.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests
  skipSuccessfulRequests: true
});

// General API Rate Limiter
const rateLimitAPI = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Password Change Rate Limiter
const rateLimitPasswordChange = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password changes per hour
  message: {
    success: false,
    message: 'Too many password change attempts. Please try again later.',
    data: null
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  rateLimitLogin,
  rateLimitAPI,
  rateLimitPasswordChange
};