const express = require('express');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const router = express.Router();
const { sendEmail, getAccessToken } = require('./emailUtils');

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

// Add cookie parser middleware (should be in main app, but safe here)
router.use(cookieParser());

// Admin login route (sets httpOnly cookie)
router.post('/api/admin-login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', { username, passwordLength: password?.length });
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('username', sql.VarChar(100), username)
            .query('SELECT * FROM Admins WHERE username = @username');
        const admin = result.recordset[0];
        console.log('Admin found:', admin ? 'Yes' : 'No');
        if (admin) {
            const passwordMatch = await bcrypt.compare(password, admin.password);
            console.log('Password match:', passwordMatch);
            if (passwordMatch) {
                // Generate JWT token
                const token = jwt.sign({ 
                  username: admin.username, 
                  email: admin.email || admin.username, // Use email if available, fallback to username
                  role: 'admin' 
                }, JWT_SECRET, { expiresIn: '1h' });
                console.log('Setting cookie with token:', token.substring(0, 20) + '...');
                res.cookie('authToken', token, {
                    httpOnly: true,
                    secure: false, // Set to true in production with HTTPS
                    sameSite: 'Lax',
                    maxAge: 3600000 // 1 hour
                });
                console.log('Sending success response');
                res.json({ success: true }); // Do NOT send token in body
            } else {
                res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
        } else {
            res.status(401).json({ success: false, message: 'Admin not found' });
        }
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Auth middleware (protect routes)
function requireAuth(req, res, next) {
    const token = req.cookies.authToken;
    if (!token) return res.status(401).json({ success: false, message: 'No auth token' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }
}

// Example protected route
router.get('/api/admin-protected', requireAuth, (req, res) => {
    res.json({ success: true, message: 'You are authenticated', admin: req.admin });
});

// Logout route (clears cookie)
router.post('/api/admin-logout', (req, res) => {
    res.clearCookie('authToken', { httpOnly: true, secure: true, sameSite: 'Strict' });
    res.json({ success: true });
});

module.exports = router;
// Export sendEmail and getAccessToken for password reset
module.exports.sendEmail = sendEmail;
module.exports.getAccessToken = getAccessToken;
