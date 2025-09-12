# Test Management Backend

## Overview
The Test Management Backend is a Node.js application designed to manage tests, users, and administrative functionalities. It provides a RESTful API for authentication, user management, test management, and more.

## Features
- User authentication and authorization using JWT
- Admin functionalities for managing users and tests
- Test creation, retrieval, updating, and deletion
- File uploads integrated with Cloudinary
- Email notifications using SMTP
- Payment processing capabilities (future use)

## Technologies Used
- Node.js
- Express.js
- PostgreSQL
- Cloudinary
- JWT for authentication
- Redis (optional for caching)
- Stripe and Razorpay (for payment processing)

## Project Structure
```
test-management-backend/
├── src/
│   ├── config/          # Configuration files for database, email, and Cloudinary
│   ├── models/          # Database models
│   ├── controllers/     # Business logic for handling requests
│   ├── middleware/      # Middleware for authentication and validation
│   ├── routes/          # API routes
│   ├── services/        # Services for email and payment processing
│   ├── utils/           # Utility functions and constants
│   └── app.js           # Express app initialization
├── migrations/          # Database migration files
├── seeders/             # Database seed files
├── uploads/             # Directory for uploaded files
├── .env                 # Environment variables
├── .gitignore           # Git ignore file
├── server.js            # Entry point for the application
└── package.json         # Project metadata and dependencies
```

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/test-management-backend.git
   cd test-management-backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Set up your environment variables in the `.env` file. Refer to the `.env` template for required configurations.

4. Run database migrations (if applicable):
   ```
   npm run migrate
   ```

5. Start the server:
   ```
   npm start
   ```

## API Documentation
Refer to the API documentation for details on available endpoints and their usage.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request for any improvements or bug fixes.

## License
This project is licensed under the MIT License.