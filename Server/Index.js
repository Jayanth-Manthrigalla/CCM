require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const adminAuthRouter = require('./adminAuth');
const userAuthRouter = require('./userAuth');
const unifiedAuthRouter = require('./unifiedAuth');
const { requireAuth, requireAdminRole, requireAdminOrManager } = require('./unifiedAuth');
const adminPasswordReset = require('./adminPasswordReset');
const userManagement = require('./userManagement');

// Initialize email utils with error handling
let sendEmail = null;
let getAccessToken = null;

try {
  const emailUtils = require('./emailUtils');
  sendEmail = emailUtils.sendEmail;
  getAccessToken = emailUtils.getAccessToken;
  console.log('Email services initialized successfully');
} catch (error) {
  console.warn('Email services not available:', error.message);
  console.log('Server will run without email functionality');
  
  // Create fallback functions
  sendEmail = async (accessToken, mailOptions) => {
    console.log(`Email service not available - would have sent email to ${mailOptions?.to} with subject: ${mailOptions?.subject}`);
    return Promise.resolve();
  };
  getAccessToken = async () => {
    console.log('Email service not available - returning dummy token');
    return Promise.resolve('dummy-token');
  };
}

const app = express();
app.use(cors({
  origin: 'http://localhost:3000', // your Netlify site URL
  methods: ['POST', 'GET', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use(cookieParser());
app.use(express.json());

// Azure MSSQL config
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



// POST: insert form data
app.post('/api/contact', async (req, res) => {
  const { name, email, phone, organization, message } = req.body;
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('name', sql.VarChar(100), name)
      .input('email', sql.VarChar(100), email)
      .input('phone', sql.VarChar(20), phone)
      .input('organization', sql.VarChar(100), organization)
      .input('message', sql.Text, message)
      .query(`
        INSERT INTO Demo (name, email, phone, organization, message)
        VALUES (@name, @email, @phone, @organization, @message)
      `);

    // Send email to admin and user
    const accessToken = await getAccessToken();
    // Email to admin
    await sendEmail(accessToken, {
      to: 'noreply@chroniccarebridge.com',
      subject: 'New Demo Request Submitted',
      body: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <img src="https://ccmwebsite.netlify.app/images/Logo.png" alt="Company Logo" style="max-width: 180px; margin-bottom: 20px;" />
          <h2 style="color:#004080;">New Demo Request</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Organization:</strong> ${organization}</p>
          <p><strong>Message:</strong> ${message || 'No additional message provided.'}</p>
          <hr style="margin:20px 0; border:none; border-top:1px solid #ddd;" />
          <p style="font-size:12px; color:#888;">This is an automated notification from Chronic Care Bridge.</p>
        </div>
      `
    });


      // Email to user
    // await sendEmail(accessToken, {
    //   to: email,
    //   subject: 'Thank You for Scheduling a Demo with Chronic Care Bridge',
    //   body: `
    //   <div style="max-width:600px;margin:auto;font-family:Arial,sans-serif;color:#333;border:1px solid #eee;border-radius:8px;overflow:hidden;">
      
    //   <!-- Header -->
    //   <div style="background:rgb(255,255,255);padding:20px;text-align:center;">
    //   <img src="https://ccmwebsite.netlify.app/images/Logo.png" alt="Chronic Care Bridge" style="max-width:260px;">
    //   </div>
      
    //   <!-- Body -->
    //   <div style="padding:30px;">
    //   <h2 style="color:rgb(0,38,119);margin-top:0;">Thank You, ${name}!</h2>
    //   <p style="font-size:16px;line-height:1.6;">
    //   We’ve received your request to schedule a demo with 
    //   <strong>Chronic Care Bridge</strong>.  
    //   </p>
    //     <p style="font-size:16px;line-height:1.6;">
    //     Our team will review your request and contact you shortly.  
    //     In the meantime, feel free to explore our solutions on our website.
    //     </p>
      
    //   <!-- CTA -->
    //   <div style="margin:25px 0;text-align:center;">
    //   <a href="https://ccmwebsite.netlify.app/#/" 
    //   style="background:rgb(0,38,119);color:#fff;padding:12px 24px;text-decoration:none;
    //   border-radius:6px;font-weight:bold;display:inline-block;">
    //   Visit Our Website
    //   </a>
    //   </div>

    //   <p style="font-size:14px;color:#555;">
    //   Please do not reply to this email. If your request is urgent or requires immediate attention, please call us at <a href="tel:(832)617-6222" style="color:#002677;text-decoration:none;">(832) 617-6222</a>.
    //   </p>

    //   <p style="margin-top:30px;">Best regards,</p>
    //   <p style="font-weight:bold;">The Chronic Care Bridge Team</p>
    //   </div>
      
    //   <!-- Footer -->
    //   <div style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#777;">
    //   <p>© ${new Date().getFullYear()} Chronic Care Bridge. All rights reserved.</p>
    //   <p>
    //   <a href="https://www.linkedin.com/company/" style="color:rgb(0,38,119);text-decoration:none;">LinkedIn</a> | 
    //   <a href="https://twitter.com/" style="color:rgb(0,38,119);text-decoration:none;">Twitter</a> | 
    //   <a href="https://www.chroniccarebridge.com" style="color:rgb(0,38,119);text-decoration:none;">Website</a>
    //   </p>
    //   </div>
    //   </div>
    //   `
    // });
    await sendEmail(accessToken, {
      to: email,
      subject: 'Thank You for Scheduling a Demo with Chronic Care Bridge',
      body: `
      <div style="background:#ffffff;padding:20px 0;">
        <center>
          <table width="100%" border="0" cellspacing="0" cellpadding="0" 
                style="max-width:600px;background:#ffffff;
                font-family:Arial,sans-serif;color:#333;
                border:1px solid #eee;border-radius:8px;overflow:hidden;">
            
            <!-- Header -->
            <tr>
              <td style="background:#ffffff;padding:20px;text-align:center;">
                <img src="https://ccmwebsite.netlify.app/images/Logo.png" alt="Chronic Care Bridge" 
                    style="max-width:260px;width:100%;height:auto;">
              </td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding:30px;">
                <h2 style="color:rgb(0,38,119);margin-top:0;">Thank You, ${name}!</h2>
                <p style="font-size:16px;line-height:1.6;">
                  We’ve received your request to schedule a demo with 
                  <strong>Chronic Care Bridge</strong>.
                </p>
                <p style="font-size:16px;line-height:1.6;">
                  Our team will review your request and contact you shortly.  
                  In the meantime, feel free to explore our solutions on our website.
                </p>

                <!-- CTA -->
                <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin:25px auto;">
                  <tr>
                    <td bgcolor="#002677" style="border-radius:6px;">
                      <a href="https://ccmwebsite.netlify.app/#/" 
                        style="display:inline-block;padding:12px 24px;
                        color:#ffffff;text-decoration:none;font-weight:bold;">
                        Visit Our Website
                      </a>
                    </td>
                  </tr>
                </table>

                <p style="font-size:14px;color:#555;">
                  Please do not reply to this email. If your request is urgent or requires immediate attention, please call us at 
                  <a href="tel:(832)617-6222" style="color:#002677;text-decoration:none;">(832) 617-6222</a>.
                </p>

                <p style="margin-top:30px;">Best regards,</p>
                <p style="font-weight:bold;">The Chronic Care Bridge Team</p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background:#f9f9f9;padding:20px;text-align:center;font-size:12px;color:#777;">
                <p>© ${new Date().getFullYear()} Chronic Care Bridge. All rights reserved.</p>
                <p>
                  <a href="https://www.linkedin.com/company/" style="color:rgb(0,38,119);text-decoration:none;">LinkedIn</a> | 
                  <a href="https://twitter.com/" style="color:rgb(0,38,119);text-decoration:none;">Twitter</a> | 
                  <a href="https://www.chroniccarebridge.com" style="color:rgb(0,38,119);text-decoration:none;">Website</a>
                </p>
              </td>
            </tr>

          </table>
        </center>
      </div>
      `
    });



    res.status(200).send('Form submitted');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error saving form');
  }
});


// GET: fetch submissions with optional status filter (Admin and Manager access)
// /api/submissions?status=active|deleted|archived|all
app.get('/api/submissions', requireAuth, requireAdminOrManager, async (req, res) => {
  const { status } = req.query;
  let query = 'SELECT * FROM Demo';
  if (status && status !== 'all') {
    query += ' WHERE status = @status';
  }
  query += ' ORDER BY submitted_at DESC';
  try {
    const pool = sql.connect(config);
    const request = (await pool).request();
    if (status && status !== 'all') request.input('status', sql.VarChar(20), status);
    const result = await request.query(query);
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving submissions');
  }
});

// PATCH: update status (delete, restore, archive, unarchive) - Admin and Manager access
app.patch('/api/submissions/:id/status', requireAuth, requireAdminOrManager, async (req, res) => {
  const { id } = req.params;
  console.log("Entering status update");
  const { status } = req.body;
  if (!['active', 'deleted', 'archived'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }
  try {
    const pool = sql.connect(config);
    await (await pool).request()
      .input('id', sql.Int, id)
      .input('status', sql.VarChar(20), status)
      .query('UPDATE Demo SET status = @status WHERE id = @id');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// PATCH: mark as read/unread (now using status_read column)
app.patch('/api/submissions/:id/read', requireAuth, requireAdminOrManager, async (req, res) => {
  const { id } = req.params;
  const { read } = req.body;
  if (typeof read !== 'boolean') {
    return res.status(400).json({ success: false, message: 'Invalid read value' });
  }
  try {
    const pool = sql.connect(config);
    await (await pool).request()
      .input('id', sql.Int, id)
      .input('status_read', sql.Bit, read ? 1 : 0)
      .query('UPDATE Demo SET status_read = @status_read WHERE id = @id');
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update read status' });
  }
});

// Admin login route


// Admin authentication route

// Forgot Password: Request OTP
// Hardcoded admin email for password reset
const ADMIN_EMAIL = 'NoReply@chroniccarebridge.com'; // Change as needed
app.post('/api/admin-forgot-password', async (req, res) => {
  // Ignore req.body.email, always use ADMIN_EMAIL
  const email = ADMIN_EMAIL;
  // Generate OTP
  const otp = adminPasswordReset.generateOTP();
  adminPasswordReset.setOTP(email, otp);
  try {
    const accessToken = await getAccessToken();
    await sendEmail(accessToken, {
      to: email,
      subject: 'Your CCM Admin Password Reset Code',
      body: `<p>Your password reset code is: <b>${otp}</b></p><p>This code will expire in 10 minutes.</p>`
    });
    res.json({ success: true, message: 'OTP sent to email.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
});

// Verify OTP
app.post('/api/admin-verify-otp', (req, res) => {
  const { otp } = req.body;
  const email = ADMIN_EMAIL;
  if (!otp) return res.status(400).json({ success: false, message: 'OTP required.' });
  const result = adminPasswordReset.verifyOTP(email, otp);
  if (result.valid) {
    res.json({ success: true });
  } else {
    res.status(400).json({ success: false, message: result.reason });
  }
});

// Reset Password
app.post('/api/admin-reset-password', async (req, res) => {
  const { otp, newPassword } = req.body;
  const email = ADMIN_EMAIL;
  if (!otp || !newPassword) return res.status(400).json({ success: false, message: 'OTP and new password required.' });
  const result = adminPasswordReset.verifyOTP(email, otp);
  if (!result.valid) return res.status(400).json({ success: false, message: result.reason });
  try {
    const pool = await sql.connect(config);
    await pool.request()
      .input('email', sql.VarChar(100), email)
      .input('password', sql.VarChar(100), newPassword)
      .query('UPDATE Admins SET password = @password WHERE username = @email');
    adminPasswordReset.clearOTP(email);
    res.json({ success: true, message: 'Password reset successful.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reset password.' });
  }
});

// Change Password: Step 1 - Validate current password & new passwords, then send OTP
app.post('/api/admin-change-password-request', async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  const token = req.cookies.authToken;
  
  console.log('Change password request:', { currentPassword: '***', newPassword: '***', confirmPassword: '***' });
  
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'All fields are required' });
  }
  
  // Frontend validation check (redundant but safe)
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'New passwords do not match' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    const pool = await sql.connect(config);
    
    // Verify current password
    const result = await pool.request()
      .input('username', sql.VarChar(100), decoded.username)
      .query('SELECT * FROM Admins WHERE username = @username');
    
    const admin = result.recordset[0];
    if (!admin) {
      return res.status(400).json({ success: false, message: 'Admin not found' });
    }
    
    if (!admin.email) {
      return res.status(400).json({ success: false, message: 'Admin email not configured' });
    }
    
    // Compare current password with bcrypt
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    console.log('Current password valid:', isCurrentPasswordValid);
    
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    
    // Temporarily store the new password hash for later use (when OTP is verified)
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    
    // Generate OTP and store it with the new password hash
    const otp = adminPasswordReset.generateOTP();
    adminPasswordReset.setOTPWithPassword(decoded.username, otp, newPasswordHash);
    
    console.log('Generated OTP for user:', decoded.username);
    
    // Send OTP via email
    const accessToken = await getAccessToken();
    await sendEmail(accessToken, {
      to: admin.email,
      subject: 'Password Change Verification Code',
      body: `<p>You have requested to change your password.</p><p>Your verification code is: <b>${otp}</b></p><p>This code will expire in 5 minutes.</p><p>If you did not request this change, please ignore this email.</p>`
    });
    
    console.log('OTP email sent successfully');
    res.json({ success: true, message: 'Verification code sent to your email' });
  } catch (err) {
    console.error('Change password request error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Change Password: Step 2 - Verify OTP and update password
app.post('/api/admin-change-password-confirm', async (req, res) => {
  const { otp } = req.body;
  const token = req.cookies.authToken;
  
  console.log('Change password confirm request:', { otp: otp ? 'provided' : 'missing' });
  
  if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' });
  if (!otp) {
    return res.status(400).json({ success: false, message: 'Verification code is required' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
    
    // Verify OTP and get the stored password hash
    const otpResult = adminPasswordReset.verifyOTP(decoded.username, otp);
    if (!otpResult.valid) {
      return res.status(400).json({ success: false, message: otpResult.reason });
    }
    
    // Use the pre-hashed password that was stored with the OTP
    const newPasswordHash = otpResult.newPasswordHash;
    if (!newPasswordHash) {
      return res.status(400).json({ success: false, message: 'Invalid session. Please restart password change process.' });
    }
    
    console.log('Updating password in database');
    
    // Update password in database
    const pool = await sql.connect(config);
    const updateResult = await pool.request()
      .input('username', sql.VarChar(100), decoded.username)
      .input('password', sql.VarChar(255), newPasswordHash)
      .query('UPDATE Admins SET password = @password WHERE username = @username');
    
    console.log('Password updated, rows affected:', updateResult.rowsAffected[0]);
    
    // Clear OTP
    adminPasswordReset.clearOTP(decoded.username);
    
    // Get admin email for confirmation
    const adminResult = await pool.request()
      .input('username', sql.VarChar(100), decoded.username)
      .query('SELECT email FROM Admins WHERE username = @username');
    
    const adminEmail = adminResult.recordset[0]?.email;
    
    // Send confirmation email
    const accessToken = await getAccessToken();
    await sendEmail(accessToken, {
      to: adminEmail,
      subject: 'Password Successfully Changed',
      body: `<p>Your password has been successfully changed on ${new Date().toLocaleString()}.</p><p>If you did not make this change, please contact support immediately.</p>`
    });
    
    console.log('Password change confirmation email sent');
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    console.error('Change password confirm error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// User Management API Endpoints

// Debug endpoint to check cookies
app.get('/api/debug-auth', (req, res) => {
  console.log('Cookies received:', req.cookies);
  console.log('Token present:', !!req.cookies.authToken);
  if (req.cookies.authToken) {
    try {
      const decoded = jwt.verify(req.cookies.authToken, process.env.JWT_SECRET || 'supersecretkey');
      console.log('Token decoded successfully:', decoded);
      res.json({ 
        success: true, 
        hasToken: true, 
        tokenValid: true,
        user: { email: decoded.email, role: decoded.role }
      });
    } catch (error) {
      console.log('Token verification failed:', error.message);
      res.json({ 
        success: false, 
        hasToken: true, 
        tokenValid: false,
        error: error.message
      });
    }
  } else {
    res.json({ 
      success: false, 
      hasToken: false, 
      cookies: req.cookies 
    });
  }
});

// Get all users (Admin only - managers cannot access user management)
app.get('/api/users', requireAuth, requireAdminRole, async (req, res) => {
  try {

    const result = await userManagement.getAllUsers();
    if (result.success) {
      res.json({ success: true, users: result.users });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create invitation (Admin only - managers cannot invite users)
app.post('/api/invites', requireAuth, requireAdminRole, async (req, res) => {
  try {
    const adminEmail = req.user.email;

    const { email, firstName, lastName, role } = req.body;
    
    // Validate input
    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    
    if (!['manager'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified' });
    }

    const result = await userManagement.createInvite(
      { email, firstName, lastName, role },
      adminEmail
    );

    if (result.success) {
      // Send invitation email
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/accept-invite?token=${result.token}`;
      const emailContent = `
        <h2>You're Invited to Join CCM Website</h2>
        <p>Dear ${firstName} ${lastName},</p>
        <p>You have been invited by ${adminEmail} to join the CCM Website as a ${role}.</p>
        <p><strong>Click the link below to accept your invitation and set up your password:</strong></p>
        <p><a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
        <p>This invitation will expire in 5 minutes for security reasons.</p>
        <p>If you can't click the link, copy and paste this URL into your browser:</p>
        <p>${inviteLink}</p>
        <br>
        <p>Best regards,<br>CCM Website Team</p>
      `;

      try {
        const accessToken = await getAccessToken();
        await sendEmail(accessToken, {
          to: email,
          subject: 'Invitation to Join CCM Website',
          body: emailContent
        });
        res.json({ 
          success: true, 
          message: 'Invitation sent successfully',
          inviteId: result.inviteId
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        res.status(500).json({ 
          success: false, 
          message: 'Invitation created but email sending failed' 
        });
      }
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error creating invitation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get pending invitations (Admin only)
app.get('/api/invites', async (req, res) => {
  try {
    console.log('=== GET /api/invites Request ===');
    console.log('Cookies received:', req.cookies);
    console.log('Headers:', req.headers.cookie);
    
    // Verify admin authentication
    const token = req.cookies.authToken;
    console.log('AuthToken present:', !!token);
    if (!token) {
      console.log('No token provided - sending 401');
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
      console.log('Token decoded successfully:', decoded);
      if (decoded.role !== 'admin') {
        console.log('User is not admin - sending 403');
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
    } catch (jwtError) {
      console.log('JWT verification failed:', jwtError.message);
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const result = await userManagement.getPendingInvites();
    if (result.success) {
      res.json({ success: true, invites: result.invites });
    } else {
      res.status(500).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error getting invites:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Resend invitation (Admin only)
app.post('/api/invites/:id/resend', async (req, res) => {
  try {
    // Verify admin authentication
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    let adminEmail;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
      if (decoded.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
      adminEmail = decoded.email;
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const inviteId = parseInt(req.params.id);
    const result = await userManagement.resendInvite(inviteId, adminEmail);

    if (result.success) {
      // Send new invitation email
      const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#/accept-invite?token=${result.token}`;
      const emailContent = `
        <h2>Invitation Reminder - Join CCM Website</h2>
        <p>Dear ${result.invite.firstName} ${result.invite.lastName},</p>
        <p>This is a reminder of your invitation to join the CCM Website as a ${result.invite.role}.</p>
        <p><strong>Click the link below to accept your invitation and set up your password:</strong></p>
        <p><a href="${inviteLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
        <p>This invitation will expire in 5 minutes for security reasons.</p>
        <p>If you can't click the link, copy and paste this URL into your browser:</p>
        <p>${inviteLink}</p>
        <br>
        <p>Best regards,<br>CCM Website Team</p>
      `;

      try {
        const accessToken = await getAccessToken();
        await sendEmail(accessToken, {
          to: result.invite.email,
          subject: 'Invitation Reminder - Join CCM Website',
          body: emailContent
        });
        res.json({ success: true, message: 'Invitation resent successfully' });
      } catch (emailError) {
        console.error('Failed to resend invitation email:', emailError);
        res.status(500).json({ 
          success: false, 
          message: 'Invitation updated but email sending failed' 
        });
      }
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Public endpoint to validate invitation token
app.get('/api/validate-invite', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const result = await userManagement.validateInviteToken(token);
    if (result.success) {
      res.json({ 
        success: true, 
        invite: {
          email: result.invite.email,
          firstName: result.invite.firstName,
          lastName: result.invite.lastName,
          role: result.invite.role
        }
      });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error validating invitation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Public endpoint to accept invitation
app.post('/api/accept-invite', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ success: false, message: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long' 
      });
    }

    const result = await userManagement.acceptInvitation(token, password);
    if (result.success) {
      res.json({ 
        success: true, 
        message: 'Account created successfully',
        user: result.user
      });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Manager Password Change API Endpoints

// Request manager password change (Admin only)
app.post('/api/manager/change-password/request', async (req, res) => {
  try {
    // Verify admin authentication
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    let adminEmail;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
      if (decoded.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
      adminEmail = decoded.email;
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { managerEmail, newPassword } = req.body;
    
    if (!managerEmail || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Manager email and new password are required' 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long' 
      });
    }

    // Hash the new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Create OTP for verification
    const result = await userManagement.createManagerPasswordChangeOTP(
      adminEmail, 
      managerEmail, 
      newPasswordHash
    );

    if (result.success) {
      // Send OTP email to admin
      const emailContent = `
        <h2>Manager Password Change Verification</h2>
        <p>Dear Admin,</p>
        <p>You have requested to change the password for manager: <strong>${managerEmail}</strong></p>
        <p><strong>Your verification code is: ${result.otp}</strong></p>
        <p>This code will expire in 5 minutes for security reasons.</p>
        <p>Enter this code in the admin dashboard to confirm the password change.</p>
        <br>
        <p>If you did not request this change, please ignore this email.</p>
        <br>
        <p>Best regards,<br>CCM Website Security Team</p>
      `;

      try {
        const accessToken = await getAccessToken();
        await sendEmail(accessToken, {
          to: adminEmail,
          subject: 'Manager Password Change - Verification Required',
          body: emailContent
        });
        res.json({ 
          success: true, 
          message: 'Verification code sent to your email',
          expiresAt: result.expiresAt
        });
      } catch (emailError) {
        console.error('Failed to send OTP email:', emailError);
        res.status(500).json({ 
          success: false, 
          message: 'OTP created but email sending failed' 
        });
      }
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error requesting manager password change:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Confirm manager password change (Admin only)
app.post('/api/manager/change-password/confirm', async (req, res) => {
  try {
    // Verify admin authentication
    const token = req.cookies.authToken;
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    let adminEmail;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretkey');
      if (decoded.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Admin access required' });
      }
      adminEmail = decoded.email;
    } catch (jwtError) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const { managerEmail, otp } = req.body;
    
    if (!managerEmail || !otp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Manager email and OTP are required' 
      });
    }

    const result = await userManagement.verifyManagerPasswordChangeOTP(
      adminEmail, 
      managerEmail, 
      otp
    );

    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error confirming manager password change:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

app.use(adminAuthRouter);
app.use(userAuthRouter);
app.use(unifiedAuthRouter);

app.get("/", (req, res) => {
  res.send("Welcome to the CCM Website API");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
