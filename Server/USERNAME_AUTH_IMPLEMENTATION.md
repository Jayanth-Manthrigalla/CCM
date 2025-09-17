# Username-Based Authentication System Implementation

## Overview
This document outlines the implementation of username-based authentication for the CCM Website's Users table, replacing the previous email-based authentication system.

## Changes Made

### 1. Database Migration
- **File**: `migrate_add_username.sql`
- **Purpose**: Adds username column to existing Users table
- **Features**:
  - Adds `username` column (NVARCHAR(255), NOT NULL, UNIQUE)
  - Populates username from existing firstName + lastName data
  - Handles duplicate usernames by appending numbers
  - Creates unique constraint and index for performance
  - Includes transaction safety and rollback capability

### 2. New Authentication Module
- **File**: `userAuth.js`
- **Purpose**: Handles username-based authentication for Users table
- **Endpoints**:
  - `POST /api/user-login` - Username/password login
  - `GET /api/user-profile` - Get current user info (protected)
  - `POST /api/user-logout` - Logout and clear cookies
  - `POST /api/user-change-password` - Change password (protected)

### 3. Updated User Management
- **File**: `userManagement.js` (modified)
- **Changes**: 
  - Modified `acceptInvitation()` function to generate unique usernames
  - Username generation logic: firstName + lastName, lowercase, alphanumeric only
  - Automatic handling of duplicate usernames with numeric suffixes

### 4. Updated Database Schema
- **File**: `setupUserManagement.js` (modified)
- **Changes**: Added username column to initial Users table creation

### 5. Server Integration
- **File**: `Index.js` (modified)
- **Changes**: Added userAuth router to Express app

### 6. Testing and Verification
- **File**: `testUserAuth.js`
- **Purpose**: Comprehensive testing script for new authentication system

## Security Features

### Password Security
- **Bcrypt Hashing**: All passwords hashed with bcrypt (salt rounds: 12)
- **Minimum Length**: 8 characters minimum for new passwords
- **Current Password Verification**: Required for password changes

### Token Security
- **JWT Tokens**: 24-hour expiration for user sessions
- **HttpOnly Cookies**: Tokens stored in secure httpOnly cookies
- **Environment Variables**: JWT secret stored in environment variables
- **Secure Cookies**: Automatic secure flag in production environments

### Database Security
- **Unique Constraints**: Username and email both have unique constraints
- **Active User Check**: Authentication only works for active users (isActive = 1)
- **Transaction Safety**: Database operations use transactions where appropriate

## API Endpoints

### User Authentication

#### Login
```http
POST /api/user-login
Content-Type: application/json

{
  "username": "johnsmith",
  "password": "userpassword123"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "johnsmith",
    "email": "john.smith@example.com",
    "firstName": "John",
    "lastName": "Smith",
    "role": "Manager"
  }
}
```

#### Get User Profile
```http
GET /api/user-profile
Cookie: userAuthToken=<jwt_token>
```

#### Logout
```http
POST /api/user-logout
Cookie: userAuthToken=<jwt_token>
```

#### Change Password
```http
POST /api/user-change-password
Content-Type: application/json
Cookie: userAuthToken=<jwt_token>

{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

## Implementation Steps

### Step 1: Database Migration
1. **IMPORTANT**: Backup your database before running migration
2. Replace `[YourDatabaseName]` in `migrate_add_username.sql` with your actual database name
3. Execute the migration script in SQL Server Management Studio or similar tool
4. Verify migration success by checking the verification queries at the end

### Step 2: Server Updates
1. Restart your Node.js server to load the new modules
2. The new authentication endpoints will be automatically available
3. Test the system using `node testUserAuth.js`

### Step 3: Frontend Integration (if needed)
- Update login forms to use username instead of email
- Update API calls to use new endpoints (`/api/user-login` instead of admin endpoints)
- Handle new response structure with username field

## Username Generation Logic

When users accept invitations, usernames are automatically generated:

1. **Base Username**: `firstName + lastName` (lowercase, alphanumeric only)
   - Example: "John Smith" → "johnsmith"
   - Special characters and spaces are removed

2. **Duplicate Handling**: If username exists, append numbers
   - "johnsmith" → "johnsmith1" → "johnsmith2" etc.

3. **Safety Limits**: Maximum 1000 attempts to prevent infinite loops

## Migration Considerations

### Data Integrity
- Existing Users table data is preserved
- Email addresses remain in the system for communication
- All existing functionality continues to work

### Backward Compatibility
- Admin authentication (`adminAuth.js`) remains unchanged
- Existing admin login still uses the Admins table
- Two separate authentication systems coexist

### Performance
- Username column is indexed for fast lookups
- Unique constraints prevent duplicate usernames
- JWT tokens reduce database queries for authenticated requests

## Testing

Run the test script to verify your implementation:

```bash
node Server/testUserAuth.js
```

The test will verify:
- Database connection
- Username column existence
- Table structure
- User data integrity
- Password hashing functionality
- Constraints and indexes

## Troubleshooting

### Common Issues

1. **Username column doesn't exist**
   - Solution: Run the migration script `migrate_add_username.sql`

2. **Duplicate username errors**
   - The migration script handles this automatically
   - Manual resolution: Update duplicate usernames in the database

3. **Authentication fails**
   - Check if users have the `isActive = 1` flag set
   - Verify password hashing is working correctly
   - Check JWT_SECRET environment variable

4. **Cookie not set**
   - Verify cookie settings match your environment (secure flag for HTTPS)
   - Check browser developer tools for cookie storage

### Environment Variables Required

```env
SQL_SERVER=your_server
SQL_PORT=1433
SQL_DATABASE=your_database
SQL_USER=your_username
SQL_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development|production
```

## Best Practices

### Security
- Use strong JWT secrets in production
- Enable HTTPS in production for secure cookies
- Regularly rotate JWT secrets
- Monitor failed login attempts
- Implement rate limiting for login endpoints

### Database
- Regular backups before schema changes
- Monitor database performance with new indexes
- Clean up expired tokens/sessions periodically

### Code Maintenance
- Keep authentication logic centralized
- Use environment variables for all secrets
- Log authentication events for security monitoring
- Regular security audits of authentication code

## Future Enhancements

Potential improvements to consider:
- Password complexity requirements
- Account lockout after failed attempts
- Two-factor authentication (2FA)
- Session management and concurrent login limits
- Password reset via username
- Audit logging for authentication events