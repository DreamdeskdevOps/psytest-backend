// Utility functions for the application

/**
 * Send success response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Success message
 * @param {Object} data - Response data
 */
function sendSuccessResponse(res, statusCode = 200, message = 'Success', data = {}) {
    return res.status(statusCode).json({
        success: true,
        status: statusCode,
        message,
        data,
        timestamp: new Date().toISOString()
    });
}

/**
 * Send error response
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {string} message - Error message
 * @param {Array|Object} errors - Validation errors or additional error details
 */
function sendErrorResponse(res, statusCode = 500, message = 'Internal Server Error', errors = null) {
    const response = {
        success: false,
        status: statusCode,
        message,
        timestamp: new Date().toISOString()
    };

    if (errors) {
        response.errors = errors;
    }

    return res.status(statusCode).json(response);
}

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string to generate
 * @returns {string} - Randomly generated string
 */
function generateRandomString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

/**
 * Format a date to a readable string
 * @param {Date} date - Date object to format
 * @returns {string} - Formatted date string
 */
function formatDate(date) {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
}

/**
 * Check if an email is valid
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid, false otherwise
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Format phone number for display (mask all but last 4 digits)
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */
function formatPhoneForDisplay(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
    return `****${phoneNumber.slice(-4)}`;
}

/**
 * Generate OTP code
 * @param {number} length - Length of OTP (default 6)
 * @returns {string} - Generated OTP
 */
function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return otp;
}

module.exports = {
    sendSuccessResponse,
    sendErrorResponse,
    generateRandomString,
    formatDate,
    isValidEmail,
    formatPhoneForDisplay,
    generateOTP
};