// userManagement.js - User management utility functions
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const sql = require('mssql');

// Database configuration
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

// Constants
const INVITE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Generate secure token
function generateSecureToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate 6-digit OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash token/OTP securely
function hashToken(token) {
  return bcrypt.hashSync(token, 10);
}

// Verify token/OTP
function verifyToken(token, hash) {
  return bcrypt.compareSync(token, hash);
}

// User Management Functions

// Get all users
async function getAllUsers() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id, firstName, lastName, email, role, isActive, createdAt
      FROM Users 
      ORDER BY createdAt DESC
    `);
    await pool.close();
    return { success: true, users: result.recordset };
  } catch (error) {
    console.error('Error getting users:', error);
    return { success: false, message: 'Failed to retrieve users' };
  }
}

// Create invitation
async function createInvite(inviteData, invitedBy) {
  try {
    const { email, firstName, lastName, role } = inviteData;
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
    
    const pool = await sql.connect(config);
    
    // Check if user already exists
    const existingUser = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('SELECT id FROM Users WHERE email = @email');
    
    if (existingUser.recordset.length > 0) {
      await pool.close();
      return { success: false, message: 'User with this email already exists' };
    }
    
    // Check if there's already a pending invite
    const existingInvite = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .query('SELECT id FROM Invites WHERE email = @email AND used = 0 AND expiresAt > GETDATE()');
    
    if (existingInvite.recordset.length > 0) {
      await pool.close();
      return { success: false, message: 'Pending invitation already exists for this email' };
    }
    
    // Create new invite
    const result = await pool.request()
      .input('email', sql.NVarChar(255), email)
      .input('firstName', sql.NVarChar(100), firstName)
      .input('lastName', sql.NVarChar(100), lastName)
      .input('role', sql.NVarChar(50), role)
      .input('tokenHash', sql.NVarChar(255), tokenHash)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .input('invitedBy', sql.NVarChar(255), invitedBy)
      .query(`
        INSERT INTO Invites (email, firstName, lastName, role, tokenHash, expiresAt, invitedBy)
        OUTPUT INSERTED.id
        VALUES (@email, @firstName, @lastName, @role, @tokenHash, @expiresAt, @invitedBy)
      `);
    
    await pool.close();
    
    return { 
      success: true, 
      inviteId: result.recordset[0].id,
      token: token,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('Error creating invite:', error);
    return { success: false, message: 'Failed to create invitation' };
  }
}

// Validate invite token
async function validateInviteToken(token) {
  try {
    const pool = await sql.connect(config);
    
    // Get all non-expired, unused invites
    const result = await pool.request()
      .query(`
        SELECT id, email, firstName, lastName, role, tokenHash, expiresAt
        FROM Invites 
        WHERE used = 0 AND expiresAt > GETDATE()
      `);
    
    // Check each invite's token hash
    for (const invite of result.recordset) {
      if (verifyToken(token, invite.tokenHash)) {
        await pool.close();
        return { 
          success: true, 
          invite: {
            id: invite.id,
            email: invite.email,
            firstName: invite.firstName,
            lastName: invite.lastName,
            role: invite.role
          }
        };
      }
    }
    
    await pool.close();
    return { success: false, message: 'Invalid or expired invitation token' };
  } catch (error) {
    console.error('Error validating invite token:', error);
    return { success: false, message: 'Failed to validate invitation' };
  }
}

// Accept invitation (create user)
async function acceptInvitation(token, password) {
  try {
    const validation = await validateInviteToken(token);
    if (!validation.success) {
      return validation;
    }
    
    const { invite } = validation;
    const passwordHash = await bcrypt.hash(password, 10);
    
    const pool = await sql.connect(config);
    
    // Start transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // Create user
      await transaction.request()
        .input('firstName', sql.NVarChar(100), invite.firstName)
        .input('lastName', sql.NVarChar(100), invite.lastName)
        .input('email', sql.NVarChar(255), invite.email)
        .input('role', sql.NVarChar(50), invite.role)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .query(`
          INSERT INTO Users (firstName, lastName, email, role, passwordHash, isActive)
          VALUES (@firstName, @lastName, @email, @role, @passwordHash, 1)
        `);
      
      // Mark invite as used
      await transaction.request()
        .input('id', sql.Int, invite.id)
        .query('UPDATE Invites SET used = 1 WHERE id = @id');
      
      await transaction.commit();
      await pool.close();
      
      return { success: true, user: invite };
    } catch (error) {
      await transaction.rollback();
      await pool.close();
      throw error;
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return { success: false, message: 'Failed to accept invitation' };
  }
}

// Get pending invites
async function getPendingInvites() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query(`
      SELECT id, email, firstName, lastName, role, expiresAt, invitedBy, createdAt,
             CASE WHEN expiresAt < GETDATE() THEN 'expired' 
                  WHEN used = 1 THEN 'used'
                  ELSE 'active' END as status
      FROM Invites 
      ORDER BY createdAt DESC
    `);
    await pool.close();
    return { success: true, invites: result.recordset };
  } catch (error) {
    console.error('Error getting invites:', error);
    return { success: false, message: 'Failed to retrieve invites' };
  }
}

// Resend invite (create new token for existing invite)
async function resendInvite(inviteId, invitedBy) {
  try {
    const pool = await sql.connect(config);
    
    // Get invite details
    const invite = await pool.request()
      .input('id', sql.Int, inviteId)
      .query('SELECT * FROM Invites WHERE id = @id AND used = 0');
    
    if (invite.recordset.length === 0) {
      await pool.close();
      return { success: false, message: 'Invite not found or already used' };
    }
    
    // Generate new token and expiry
    const token = generateSecureToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + INVITE_EXPIRY_MS);
    
    // Update invite with new token
    await pool.request()
      .input('id', sql.Int, inviteId)
      .input('tokenHash', sql.NVarChar(255), tokenHash)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .query('UPDATE Invites SET tokenHash = @tokenHash, expiresAt = @expiresAt WHERE id = @id');
    
    await pool.close();
    
    return { 
      success: true, 
      token: token,
      invite: invite.recordset[0],
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('Error resending invite:', error);
    return { success: false, message: 'Failed to resend invitation' };
  }
}

// OTP Management for Manager Password Changes

// Create OTP record for manager password change
async function createManagerPasswordChangeOTP(adminEmail, managerEmail, newPasswordHash) {
  try {
    const otp = generateOTP();
    const otpHash = hashToken(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
    
    const pool = await sql.connect(config);
    
    // Clean up any existing OTPs for this operation
    await pool.request()
      .input('adminEmail', sql.NVarChar(255), adminEmail)
      .input('managerEmail', sql.NVarChar(255), managerEmail)
      .query(`
        UPDATE OtpRecords 
        SET used = 1 
        WHERE adminEmail = @adminEmail AND managerEmail = @managerEmail 
        AND operationType = 'manager_password_change' AND used = 0
      `);
    
    // Create new OTP record
    const result = await pool.request()
      .input('adminEmail', sql.NVarChar(255), adminEmail)
      .input('managerEmail', sql.NVarChar(255), managerEmail)
      .input('otpHash', sql.NVarChar(255), otpHash)
      .input('newPasswordHash', sql.NVarChar(255), newPasswordHash)
      .input('expiresAt', sql.DateTime2, expiresAt)
      .input('operationType', sql.NVarChar(50), 'manager_password_change')
      .query(`
        INSERT INTO OtpRecords (adminEmail, managerEmail, otpHash, newPasswordHash, expiresAt, operationType)
        OUTPUT INSERTED.id
        VALUES (@adminEmail, @managerEmail, @otpHash, @newPasswordHash, @expiresAt, @operationType)
      `);
    
    await pool.close();
    
    return { 
      success: true, 
      otp: otp,
      otpId: result.recordset[0].id,
      expiresAt: expiresAt
    };
  } catch (error) {
    console.error('Error creating manager password change OTP:', error);
    return { success: false, message: 'Failed to create OTP' };
  }
}

// Verify OTP and update manager password
async function verifyManagerPasswordChangeOTP(adminEmail, managerEmail, otp) {
  try {
    const pool = await sql.connect(config);
    
    // Get active OTP records
    const result = await pool.request()
      .input('adminEmail', sql.NVarChar(255), adminEmail)
      .input('managerEmail', sql.NVarChar(255), managerEmail)
      .query(`
        SELECT id, otpHash, newPasswordHash
        FROM OtpRecords 
        WHERE adminEmail = @adminEmail AND managerEmail = @managerEmail 
        AND operationType = 'manager_password_change' 
        AND used = 0 AND expiresAt > GETDATE()
      `);
    
    // Check each OTP hash
    for (const record of result.recordset) {
      if (verifyToken(otp, record.otpHash)) {
        // Start transaction to update password and mark OTP as used
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
          // Update manager password
          await transaction.request()
            .input('email', sql.NVarChar(255), managerEmail)
            .input('passwordHash', sql.NVarChar(255), record.newPasswordHash)
            .query('UPDATE Users SET passwordHash = @passwordHash WHERE email = @email');
          
          // Mark OTP as used
          await transaction.request()
            .input('id', sql.Int, record.id)
            .query('UPDATE OtpRecords SET used = 1 WHERE id = @id');
          
          await transaction.commit();
          await pool.close();
          
          return { success: true, message: 'Password updated successfully' };
        } catch (error) {
          await transaction.rollback();
          throw error;
        }
      }
    }
    
    await pool.close();
    return { success: false, message: 'Invalid or expired OTP' };
  } catch (error) {
    console.error('Error verifying manager password change OTP:', error);
    return { success: false, message: 'Failed to verify OTP' };
  }
}

module.exports = {
  // User management
  getAllUsers,
  createInvite,
  validateInviteToken,
  acceptInvitation,
  getPendingInvites,
  resendInvite,
  
  // Manager password management
  createManagerPasswordChangeOTP,
  verifyManagerPasswordChangeOTP,
  
  // Utilities
  generateSecureToken,
  generateOTP,
  hashToken,
  verifyToken,
  
  // Constants
  INVITE_EXPIRY_MS,
  OTP_EXPIRY_MS
};