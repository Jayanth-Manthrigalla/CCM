require('dotenv').config();
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

/**
 * Unified login system that checks both Admins and Users tables
 * Allows both admins and managers to access the dashboard with role-based permissions
 */
router.post('/api/unified-login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Unified login attempt:', { username, passwordLength: password?.length });
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Username and password are required' 
        });
    }

    let pool = null;
    
    try {
        pool = await sql.connect(config);
        
        // First, try to find user in Admins table
        console.log('Checking Admins table...');
        const adminResult = await pool.request()
            .input('username', sql.VarChar(100), username)
            .query('SELECT * FROM Admins WHERE username = @username');
        
        if (adminResult.recordset.length > 0) {
            const admin = adminResult.recordset[0];
            console.log('Admin found:', admin.username);
            
            const passwordMatch = await bcrypt.compare(password, admin.password);
            console.log('Admin password match:', passwordMatch);
            
            if (passwordMatch) {
                // Generate JWT token for admin
                const token = jwt.sign({ 
                    userId: admin.id,
                    username: admin.username, 
                    email: admin.email || admin.username,
                    role: 'admin',
                    source: 'admins' // Track which table the user came from
                }, JWT_SECRET, { expiresIn: '24h' });
                
                res.cookie('authToken', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Lax',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours
                });
                
                console.log('Admin login successful');
                return res.json({ 
                    success: true, 
                    role: 'admin',
                    user: {
                        username: admin.username,
                        email: admin.email || admin.username,
                        role: 'admin'
                    }
                });
            }
        }
        
        // If not found in Admins table, check Users table
        console.log('Checking Users table...');
        const userResult = await pool.request()
            .input('username', sql.NVarChar(255), username)
            .query('SELECT * FROM Users WHERE username = @username AND isActive = 1');
        
        if (userResult.recordset.length > 0) {
            const user = userResult.recordset[0];
            console.log('User found:', user.username, 'Role:', user.role);
            
            // Only allow managers and admins from Users table to access dashboard
            if (user.role.toLowerCase() !== 'manager' && user.role.toLowerCase() !== 'admin') {
                console.log('Access denied: User role not authorized for dashboard');
                return res.status(403).json({ 
                    success: false, 
                    message: 'Access denied: Insufficient permissions' 
                });
            }
            
            const passwordMatch = await bcrypt.compare(password, user.passwordHash);
            console.log('User password match:', passwordMatch);
            
            if (passwordMatch) {
                // Generate JWT token for user (manager)
                const token = jwt.sign({ 
                    userId: user.id,
                    username: user.username,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role.toLowerCase(), // Normalize role to lowercase
                    source: 'users' // Track which table the user came from
                }, JWT_SECRET, { expiresIn: '24h' });
                
                res.cookie('authToken', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'Lax',
                    maxAge: 24 * 60 * 60 * 1000 // 24 hours
                });
                
                console.log('User login successful');
                return res.json({ 
                    success: true, 
                    role: user.role.toLowerCase(),
                    user: {
                        username: user.username,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        role: user.role.toLowerCase()
                    }
                });
            }
        }
        
        // If we get here, either user wasn't found or password didn't match
        console.log('Login failed: Invalid credentials');
        res.status(401).json({ 
            success: false, 
            message: 'Invalid credentials' 
        });
        
    } catch (error) {
        console.error('Unified login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during authentication' 
        });
    } finally {
        if (pool) {
            try {
                await pool.close();
            } catch (closeError) {
                console.error('Error closing database connection:', closeError);
            }
        }
    }
});

/**
 * Enhanced auth middleware that supports role-based access control
 */
function requireAuth(req, res, next) {
    const token = req.cookies.authToken;
    
    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: 'No authentication token provided' 
        });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Store user info in request
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ 
            success: false, 
            message: 'Invalid or expired authentication token' 
        });
    }
}

/**
 * Middleware to require admin role specifically
 */
function requireAdminRole(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin access required' 
        });
    }
    
    next();
}

/**
 * Middleware to require admin or manager role
 */
function requireAdminOrManager(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }
    
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ 
            success: false, 
            message: 'Admin or Manager access required' 
        });
    }
    
    next();
}

// Get current user info
router.get('/api/current-user', requireAuth, (req, res) => {
    res.json({ 
        success: true, 
        user: {
            userId: req.user.userId,
            username: req.user.username,
            email: req.user.email,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            role: req.user.role,
            source: req.user.source
        }
    });
});

// Logout route
router.post('/api/logout', (req, res) => {
    res.clearCookie('authToken', { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax' 
    });
    res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
module.exports.requireAuth = requireAuth;
module.exports.requireAdminRole = requireAdminRole;
module.exports.requireAdminOrManager = requireAdminOrManager;