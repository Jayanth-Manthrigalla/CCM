# Password Management System - Refactored

This directory contains refactored password management scripts that follow industry-standard security practices.

## Overview

The password management system has been completely refactored to eliminate hardcoded passwords, improve security, and follow best practices:

### ✅ What's Been Improved:
- **No hardcoded passwords** - All passwords come from user input or database
- **Secure hashing** - Uses bcrypt with configurable salt rounds (default: 12)
- **Proper error handling** - Comprehensive error handling and logging
- **Database security** - Proper connection management and SQL injection prevention  
- **Legacy support** - Handles both plaintext (legacy) and hashed passwords
- **Modular design** - Functions can be imported and used programmatically
- **CLI support** - Can be run from command line with arguments
- **No plaintext logging** - Never logs actual passwords

## Files Overview

### 🔐 hashPassword.js
**Purpose**: Pure utility for password hashing operations

**Key Functions**:
- `hashPassword(plainPassword, saltRounds)` - Hash a single password
- `hashPasswordBatch(passwords, saltRounds)` - Hash multiple passwords
- `verifyPasswordHash(plainPassword, hash)` - Verify password against hash
- `isBcryptHash(str)` - Check if string is a bcrypt hash

**CLI Usage**:
```bash
node hashPassword.js "myPassword123" "anotherPassword"
```

### 🔄 updateAdminPassword.js
**Purpose**: Update admin passwords in the database

**Key Functions**:
- `updateAdminPassword(username, newPassword)` - Update single admin password
- `updateMultipleAdminPasswords(updates)` - Batch update multiple passwords
- `getAdminInfo(username)` - Get admin info without password

**CLI Usage**:
```bash
node updateAdminPassword.js adminchroniccare newSecurePassword123
```

### 🔍 verifyPassword.js
**Purpose**: Verify admin credentials against database

**Key Functions**:
- `verifyAdminPassword(username, inputPassword)` - Verify credentials
- `authenticateAdmin(username, password)` - Full authentication flow
- `getPasswordStatus(username)` - Check password type and security status

**CLI Usage**:
```bash
# Verify password
node verifyPassword.js adminchroniccare myPassword123

# Check password status
node verifyPassword.js adminchroniccare
```

### 🧪 testPasswordManagement.js
**Purpose**: Comprehensive test suite for all password management functions

**Usage**:
```bash
node testPasswordManagement.js
```

## Security Features

### 🛡️ Password Hashing
- Uses bcrypt with salt rounds (default: 12, configurable)
- Automatically detects bcrypt vs plaintext passwords
- Secure comparison using `bcrypt.compare()`

### 🔒 Database Security
- All queries use parameterized statements (prevents SQL injection)
- Proper connection management with automatic cleanup
- Environment variables for database credentials
- No hardcoded database values

### 📋 Input Validation
- Validates all input parameters
- Minimum password length requirements
- Type checking for all inputs
- Proper error messages for validation failures

### 🚫 Security Best Practices
- Never logs plaintext passwords
- Handles both legacy (plaintext) and modern (hashed) passwords
- Proper error handling without exposing sensitive information
- Automatic database connection cleanup

## Migration Guide

### From Old Scripts to New Scripts:

#### ❌ OLD WAY (hashPassword.js):
```javascript
// Hardcoded passwords, manual SQL generation
const passwords = ['admin123', 'admin', 'password'];
console.log(`SQL: UPDATE Admins SET password = '${hashedPassword}'...`);
```

#### ✅ NEW WAY:
```javascript
// Clean utility function, no SQL operations
const { hashPassword } = require('./hashPassword');
const hashedPassword = await hashPassword(userProvidedPassword);
```

#### ❌ OLD WAY (updateAdminPassword.js):
```javascript
// Hardcoded password and username
const hashedPassword = '$2b$10$hardcodedHash...';
console.log('New login credentials: adminchroniccare / admin123');
```

#### ✅ NEW WAY:
```javascript
// Dynamic username and password from input
const result = await updateAdminPassword(username, newPassword);
```

#### ❌ OLD WAY (verifyPassword.js):
```javascript
// Hardcoded test password
const isMatch = await bcrypt.compare('admin123', admin.password);
```

#### ✅ NEW WAY:
```javascript
// Dynamic password verification
const result = await verifyAdminPassword(username, inputPassword);
```

## Usage Examples

### 1. Hash a New Password
```javascript
const { hashPassword } = require('./hashPassword');
const hashedPassword = await hashPassword('mySecurePassword123');
```

### 2. Update Admin Password
```javascript
const { updateAdminPassword } = require('./updateAdminPassword');
const result = await updateAdminPassword('adminuser', 'newPassword123');
if (result.success) {
    console.log('Password updated successfully!');
}
```

### 3. Verify Admin Credentials
```javascript
const { authenticateAdmin } = require('./verifyPassword');
const auth = await authenticateAdmin('adminuser', 'password123');
if (auth.authenticated) {
    console.log('Login successful!', auth.admin);
}
```

### 4. Check Password Security Status
```javascript
const { getPasswordStatus } = require('./verifyPassword');
const status = await getPasswordStatus('adminuser');
console.log(`Password type: ${status.passwordType}`);
console.log(`Is secure: ${status.isSecure}`);
```

## Command Line Usage

### Update a Password:
```bash
node updateAdminPassword.js adminchroniccare myNewSecurePassword123
```

### Verify a Password:
```bash
node verifyPassword.js adminchroniccare testPassword123
```

### Check Password Status:
```bash
node verifyPassword.js adminchroniccare
```

### Hash Passwords:
```bash
node hashPassword.js "password1" "password2" "password3"
```

### Run All Tests:
```bash
node testPasswordManagement.js
```

## Environment Variables Required

Make sure your `.env` file contains:
```env
SQL_SERVER=your_server_name
SQL_PORT=1433
SQL_DATABASE=your_database_name
SQL_USER=your_username
SQL_PASSWORD=your_password
```

## Migration Steps

1. **Backup your database** before making any changes
2. **Test the new scripts** with `node testPasswordManagement.js`
3. **Update passwords** using the new secure method:
   ```bash
   node updateAdminPassword.js adminchroniccare yourNewSecurePassword
   ```
4. **Verify the update** worked:
   ```bash
   node verifyPassword.js adminchroniccare yourNewSecurePassword
   ```
5. **Replace old script calls** in your application with the new modular functions

## Error Handling

All functions return structured error objects:
```javascript
{
  success: boolean,
  message: string,
  // Additional properties based on function
}
```

Example error handling:
```javascript
const result = await updateAdminPassword('user', 'pass');
if (!result.success) {
    console.error('Update failed:', result.message);
    return;
}
console.log('Success:', result.message);
```

## Integration with Existing Code

### Express.js Route Example:
```javascript
const { authenticateAdmin } = require('./verifyPassword');
const { updateAdminPassword } = require('./updateAdminPassword');

app.post('/api/admin-login', async (req, res) => {
    const { username, password } = req.body;
    
    const auth = await authenticateAdmin(username, password);
    
    if (auth.authenticated) {
        // Generate JWT token, etc.
        res.json({ success: true, admin: auth.admin });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

app.post('/api/admin-change-password', async (req, res) => {
    const { username, newPassword } = req.body;
    
    const result = await updateAdminPassword(username, newPassword);
    res.json(result);
});
```

## Security Considerations

1. **Password Requirements**: Implement minimum length, complexity requirements
2. **Rate Limiting**: Add rate limiting to prevent brute force attacks
3. **Audit Logging**: Log authentication attempts (without passwords)
4. **Regular Updates**: Regularly update bcrypt salt rounds as computing power increases
5. **Legacy Migration**: Gradually migrate plaintext passwords to hashed versions

## Testing

The test suite (`testPasswordManagement.js`) covers:
- Password hashing functionality
- Database connectivity
- Admin info retrieval
- Password verification
- Error handling
- Edge cases

Run tests regularly to ensure system integrity:
```bash
node testPasswordManagement.js
```

## Support

If you encounter issues:
1. Check your `.env` file has all required variables
2. Verify database connectivity
3. Run the test suite to identify specific problems
4. Check error logs for detailed error messages

---

**⚠️ Important Security Note**: Never commit plaintext passwords or database credentials to version control. Always use environment variables and keep your `.env` file in `.gitignore`.