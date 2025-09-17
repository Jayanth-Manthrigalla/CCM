require('dotenv').config();
const sql = require('mssql');
const { hashPassword, isBcryptHash } = require('./hashPassword');

/**
 * Admin Password Update Utility
 * Industry-standard practices:
 * - Fetch user from database by username
 * - Hash new passwords before storing
 * - Accept password input from request/CLI (no hardcoded passwords)
 * - Proper error handling and connection management
 * - Never log plaintext passwords
 */

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

/**
 * Update admin password in database
 * @param {string} username - Admin username to update
 * @param {string} newPassword - New plaintext password
 * @returns {Promise<Object>} - Result object with success status and message
 */
async function updateAdminPassword(username, newPassword) {
  let pool = null;
  
  try {
    // Validate inputs
    if (!username || typeof username !== 'string') {
      throw new Error('Username must be a non-empty string');
    }
    
    if (!newPassword || typeof newPassword !== 'string') {
      throw new Error('New password must be a non-empty string');
    }
    
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    console.log(`🔄 Updating password for admin: ${username}`);
    
    // Connect to database
    pool = await sql.connect(config);
    
    // Check if admin exists
    const adminResult = await pool.request()
      .input('username', sql.VarChar(100), username)
      .query('SELECT id, username, password FROM Admins WHERE username = @username');
    
    if (adminResult.recordset.length === 0) {
      throw new Error(`Admin with username '${username}' not found`);
    }
    
    const admin = adminResult.recordset[0];
    console.log(`✅ Admin found: ${admin.username}`);
    
    // Check current password status
    const isCurrentlyHashed = isBcryptHash(admin.password);
    console.log(`📋 Current password is ${isCurrentlyHashed ? 'hashed' : 'plaintext'}`);
    
    // Hash the new password
    console.log('🔐 Hashing new password...');
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password in database
    const updateResult = await pool.request()
      .input('username', sql.VarChar(100), username)
      .input('hashedPassword', sql.VarChar(255), hashedPassword)
      .query('UPDATE Admins SET password = @hashedPassword WHERE username = @username');
    
    if (updateResult.rowsAffected[0] === 0) {
      throw new Error('Failed to update password - no rows affected');
    }
    
    console.log('✅ Password updated successfully!');
    console.log(`📊 Updated rows: ${updateResult.rowsAffected[0]}`);
    
    return {
      success: true,
      message: `Password updated successfully for ${username}`,
      username: username,
      rowsAffected: updateResult.rowsAffected[0]
    };
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error.message);
    return {
      success: false,
      message: error.message,
      username: username || 'unknown'
    };
  } finally {
    // Always close the database connection
    if (pool) {
      try {
        await pool.close();
        console.log('🔌 Database connection closed');
      } catch (closeError) {
        console.error('❌ Error closing database connection:', closeError.message);
      }
    }
  }
}

/**
 * Update multiple admin passwords
 * @param {Array<{username: string, newPassword: string}>} updates - Array of username/password pairs
 * @returns {Promise<Array<Object>>} - Array of result objects
 */
async function updateMultipleAdminPasswords(updates) {
  if (!Array.isArray(updates)) {
    throw new Error('Updates must be an array');
  }
  
  console.log(`🔄 Updating ${updates.length} admin password(s)...`);
  
  const results = [];
  
  for (const update of updates) {
    const result = await updateAdminPassword(update.username, update.newPassword);
    results.push(result);
    
    // Small delay between updates to avoid overwhelming the database
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`\n📊 Batch Update Summary:`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  
  return results;
}

/**
 * Get admin info without showing password
 * @param {string} username - Admin username to lookup
 * @returns {Promise<Object>} - Admin info (without password)
 */
async function getAdminInfo(username) {
  let pool = null;
  
  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Username must be a non-empty string');
    }
    
    pool = await sql.connect(config);
    
    const result = await pool.request()
      .input('username', sql.VarChar(100), username)
      .query('SELECT id, username, email FROM Admins WHERE username = @username');
    
    if (result.recordset.length === 0) {
      return { success: false, message: `Admin '${username}' not found` };
    }
    
    return {
      success: true,
      admin: result.recordset[0]
    };
    
  } catch (error) {
    console.error('❌ Error getting admin info:', error.message);
    return { success: false, message: error.message };
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Export functions for use in other modules
module.exports = {
  updateAdminPassword,
  updateMultipleAdminPasswords,
  getAdminInfo
};

// CLI usage (only run if this file is executed directly)
if (require.main === module) {
  async function runCLI() {
    try {
      const args = process.argv.slice(2);
      
      if (args.length !== 2) {
        console.log('Usage: node updateAdminPassword.js <username> <newPassword>');
        console.log('Example: node updateAdminPassword.js adminchroniccare myNewSecurePassword123');
        process.exit(1);
      }
      
      const [username, newPassword] = args;
      
      console.log('🔐 Admin Password Update Utility\n');
      
      const result = await updateAdminPassword(username, newPassword);
      
      if (result.success) {
        console.log('\n🎉 Password update completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Password update failed!');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ CLI Error:', error.message);
      process.exit(1);
    }
  }
  
  runCLI();
}