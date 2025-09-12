module.exports = {
    USER_ROLE: {
        ADMIN: 'admin',
        USER: 'user',
    },
    TEST_STATUS: {
        PENDING: 'pending',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        FAILED: 'failed',
    },
    EMAIL_SUBJECTS: {
        WELCOME: 'Welcome to Test Management System',
        PASSWORD_RESET: 'Password Reset Request',
    },
    CLOUDINARY: {
        UPLOAD_FOLDER: 'uploads',
    },
    JWT: {
        ACCESS_TOKEN: 'access_token',
        REFRESH_TOKEN: 'refresh_token',
    },
    PAYMENT_STATUS: {
        SUCCESS: 'success',
        FAILED: 'failed',
        PENDING: 'pending',
    },
    MAX_UPLOAD_SIZE: 5 * 1024 * 1024, // 5 MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    
    // Success Messages
    SUCCESS_MESSAGES: {
        REGISTRATION_SUCCESS: 'User registered successfully',
        LOGIN_SUCCESS: 'Login successful',
        LOGOUT_SUCCESS: 'Logout successful',
        PROFILE_UPDATED: 'Profile updated successfully',
        PASSWORD_CHANGED: 'Password changed successfully',
        PASSWORD_RESET: 'Password reset successfully',
        OTP_SENT: 'OTP sent successfully',
        OTP_VERIFIED: 'OTP verified successfully',
        EMAIL_VERIFIED: 'Email verified successfully',
        PHONE_VERIFIED: 'Phone number verified successfully'
    },

    // Error Messages
    ERROR_MESSAGES: {
        VALIDATION_FAILED: 'Validation failed',
        UNAUTHORIZED: 'Unauthorized access',
        FORBIDDEN: 'Access forbidden',
        NOT_FOUND: 'Resource not found',
        INTERNAL_ERROR: 'Internal server error',
        DUPLICATE_ENTRY: 'Duplicate entry found',
        INVALID_CREDENTIALS: 'Invalid credentials',
        ACCOUNT_BLOCKED: 'Account is blocked',
        ACCOUNT_DEACTIVATED: 'Account is deactivated',
        INVALID_TOKEN: 'Invalid or expired token',
        OTP_EXPIRED: 'OTP has expired',
        OTP_INVALID: 'Invalid OTP',
        PASSWORD_MISMATCH: 'Passwords do not match',
        EMAIL_ALREADY_EXISTS: 'Email already exists',
        PHONE_ALREADY_EXISTS: 'Phone number already exists',
        WEAK_PASSWORD: 'Password is too weak',
        FILE_TOO_LARGE: 'File size too large',
        INVALID_FILE_TYPE: 'Invalid file type',
        RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later'
    },

    // OTP Configuration
    OTP: {
        LENGTH: 6,
        EXPIRY_MINUTES: 10,
        COOLDOWN_MINUTES: 2,
        MAX_ATTEMPTS: 3,
        PURPOSES: {
            REGISTRATION: 'registration',
            PASSWORD_RESET: 'password_reset',
            PHONE_VERIFICATION: 'phone_verification',
            EMAIL_VERIFICATION: 'email_verification'
        }
    }
};