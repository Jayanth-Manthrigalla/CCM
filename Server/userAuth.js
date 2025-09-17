const express = require('express');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const router = express.Router();

const config = {
  server: process.env.SQL_SERVER,
  port: parseInt(process.env.SQL_PORT),
  database: process.env.SQL_DATABASE,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

// JWT secret (should be in .env in production)
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Add cookie parser middleware
router.use(cookieParser());

// User login route for Users table (username-based authentication)
router.post('/api/user-login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log('User login attempt:', { username, passwordLength: password?.length });
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }

    try {
        const pool = await sql.connect(config);
        
        // Query Users table by username
        const result = await pool.request()
            .input('username', sql.NVarChar(255), username)
            .query('SELECT * FROM Users WHERE username = @username AND isActive = 1');
        
        const user = result.recordset[0];
        console.log('User found:', user ? 'Yes' : 'No');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.passwordHash);
        console.log('Password match:', passwordMatch);
        
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Generate JWT token with user information
        const token = jwt.sign({ 
            userId: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
        }, JWT_SECRET, { expiresIn: '24h' });
        
        console.log('Setting user auth cookie');
        
        // Set httpOnly cookie for security
        res.cookie('userAuthToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // Use secure in production
            sameSite: 'Lax',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
        
        console.log('Sending success response');
        
        res.json({ 
            success: true,
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('User auth error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during authentication' 
        });
    }
});

// User authentication middleware
function requireUserAuth(req, res, next) {
    const token = req.cookies.userAuthToken;
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired token' 
        });
    }
}

// Get current user info (protected route)
router.get('/api/user-profile', requireUserAuth, (req, res) => {
    res.json({ 
        success: true, 
        user: {
            id: req.user.userId,
            username: req.user.username,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.user.role
        }
    });
});

// User logout route
router.post('/api/user-logout', (req, res) => {
    res.clearCookie('userAuthToken', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax' 
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

// Change password route (for authenticated users)
router.post('/api/user-change-password', requireUserAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
            success: false, 
            message: 'Current password and new password are required' 
        });
    }
    
    if (newPassword.length < 8) {
        return res.status(400).json({ 
            success: false, 
            message: 'New password must be at least 8 characters long' 
        });
    }
    
    try {
        const pool = await sql.connect(config);
        
        // Get current user data
        const userResult = await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .query('SELECT * FROM Users WHERE id = @userId AND isActive = 1');
        
        const user = userResult.recordset[0];
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Verify current password
        const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                message: 'Current password is incorrect' 
            });
        }
        
        // Hash new password
        const newPasswordHash = await bcrypt.hash(newPassword, 12);
        
        // Update password in database
        await pool.request()
            .input('userId', sql.Int, req.user.userId)
            .input('passwordHash', sql.NVarChar(255), newPasswordHash)
            .query('UPDATE Users SET passwordHash = @passwordHash WHERE id = @userId');
        
        res.json({ 
            success: true, 
            message: 'Password changed successfully' 
        });
        
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during password change' 
        });
    }
});

module.exports = router;
module.exports.requireUserAuth = requireUserAuth;