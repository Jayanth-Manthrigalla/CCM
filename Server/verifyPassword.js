require('dotenv').config();
const sql = require('mssql');
const { verifyPasswordHash, isBcryptHash } = require('./hashPassword');

/**
 * Password Verification Utility
 * Industry-standard practices:
 * - Fetch user from database by username
 * - Accept password input from request (no hardcoded passwords)
 * - Handle both plaintext (legacy) and hashed passwords
 * - Secure comparison using bcrypt
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
 * Verify admin password against database
 * @param {string} username - Admin username to verify
 * @param {string} inputPassword - Password to verify
 * @returns {Promise<Object>} - Verification result with success status and details
 */
async function verifyAdminPassword(username, inputPassword) {
  let pool = null;
  
  try {
    // Validate inputs
    if (!username || typeof username !== 'string') {
      throw new Error('Username must be a non-empty string');
    }
    
    if (!inputPassword || typeof inputPassword !== 'string') {
      throw new Error('Password must be a non-empty string');
    }
    
    console.log(`🔍 Verifying password for admin: ${username}`);
    
    // Connect to database
    pool = await sql.connect(config);
    
    // Fetch admin from database
    const result = await pool.request()
      .input('username', sql.VarChar(100), username)
      .query('SELECT id, username, password, email FROM Admins WHERE username = @username');
    
    if (result.recordset.length === 0) {
      console.log(`❌ Admin not found: ${username}`);
      return {
        success: false,
        message: `Admin with username '${username}' not found`,
        verified: false
      };
    }
    
    const admin = result.recordset[0];
    console.log(`✅ Admin found: ${admin.username}`);
    
    const storedPassword = admin.password;
    const isHashed = isBcryptHash(storedPassword);
    
    console.log(`📋 Password type: ${isHashed ? 'Hashed (bcrypt)' : 'Legacy (plaintext)'}`);
    
    let isVerified = false;
    
    if (isHashed) {
      // Use bcrypt to compare with hashed password
      try {
        isVerified = await verifyPasswordHash(inputPassword, storedPassword);
        console.log(`🔐 Bcrypt verification: ${isVerified ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        console.error('❌ Error during bcrypt verification:', error.message);
        return {
          success: false,
          message: 'Error during password verification',
          verified: false
        };
      }
    } else {
      // Handle legacy plaintext passwords (not recommended for production)
      console.log('⚠️  WARNING: Comparing against plaintext password (legacy data)');
      isVerified = inputPassword === storedPassword;
      console.log(`📝 Plaintext comparison: ${isVerified ? 'SUCCESS' : 'FAILED'}`);
      
      if (isVerified) {
        console.log('💡 RECOMMENDATION: Update this password to use bcrypt hashing');
      }
    }
    
    return {
      success: true,
      message: isVerified ? 'Password verified successfully' : 'Invalid password',
      verified: isVerified,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email
      },
      passwordType: isHashed ? 'hashed' : 'plaintext'
    };
    
  } catch (error) {
    console.error('❌ Error verifying admin password:', error.message);
    return {
      success: false,
      message: error.message,
      verified: false
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
 * Authenticate admin (verify credentials and return admin info)
 * @param {string} username - Admin username
 * @param {string} password - Admin password
 * @returns {Promise<Object>} - Authentication result
 */
async function authenticateAdmin(username, password) {
  try {
    console.log(`🔐 Authenticating admin: ${username}`);
    
    const verificationResult = await verifyAdminPassword(username, password);
    
    if (!verificationResult.success) {
      return {
        success: false,
        message: verificationResult.message,
        authenticated: false
      };
    }
    
    if (!verificationResult.verified) {
      return {
        success: true,
        message: 'Invalid credentials',
        authenticated: false
      };
    }
    
    console.log('✅ Authentication successful');
    
    return {
      success: true,
      message: 'Authentication successful',
      authenticated: true,
      admin: verificationResult.admin,
      passwordType: verificationResult.passwordType
    };
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    return {
      success: false,
      message: 'Authentication error occurred',
      authenticated: false
    };
  }
}

/**
 * Get password status for an admin (diagnostic function)
 * @param {string} username - Admin username to check
 * @returns {Promise<Object>} - Password status information
 */
async function getPasswordStatus(username) {
  let pool = null;
  
  try {
    if (!username || typeof username !== 'string') {
      throw new Error('Username must be a non-empty string');
    }
    
    pool = await sql.connect(config);
    
    const result = await pool.request()
      .input('username', sql.VarChar(100), username)
      .query('SELECT username, password FROM Admins WHERE username = @username');
    
    if (result.recordset.length === 0) {
      return {
        success: false,
        message: `Admin '${username}' not found`
      };
    }
    
    const admin = result.recordset[0];
    const password = admin.password;
    const isHashed = isBcryptHash(password);
    
    return {
      success: true,
      username: admin.username,
      passwordType: isHashed ? 'hashed' : 'plaintext',
      isSecure: isHashed,
      recommendation: isHashed ? 'Password is properly hashed' : 'Consider updating to hashed password'
    };
    
  } catch (error) {
    console.error('❌ Error checking password status:', error.message);
    return {
      success: false,
      message: error.message
    };
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Export functions for use in other modules
module.exports = {
  verifyAdminPassword,
  authenticateAdmin,
  getPasswordStatus
};

// CLI usage (only run if this file is executed directly)
if (require.main === module) {
  async function runCLI() {
    try {
      const args = process.argv.slice(2);
      
      if (args.length === 0) {
        console.log('🔐 Password Verification Utility\n');
        console.log('Usage:');
        console.log('  Verify password: node verifyPassword.js <username> <password>');
        console.log('  Check status:    node verifyPassword.js <username>');
        console.log('\nExamples:');
        console.log('  node verifyPassword.js adminchroniccare myPassword123');
        console.log('  node verifyPassword.js adminchroniccare');
        process.exit(1);
      }
      
      const [username, password] = args;
      
      if (password) {
        // Verify password
        console.log('🔐 Password Verification Utility\n');
        const result = await verifyAdminPassword(username, password);
        
        console.log('\n📊 Verification Result:');
        console.log(`Success: ${result.success}`);
        console.log(`Verified: ${result.verified}`);
        console.log(`Message: ${result.message}`);
        
        if (result.success && result.verified) {
          console.log(`Admin: ${result.admin.username} (${result.admin.email})`);
          console.log(`Password Type: ${result.passwordType}`);
        }
        
        process.exit(result.verified ? 0 : 1);
      } else {
        // Check password status
        console.log('🔍 Password Status Check\n');
        const status = await getPasswordStatus(username);
        
        console.log('📊 Status Result:');
        console.log(`Success: ${status.success}`);
        
        if (status.success) {
          console.log(`Username: ${status.username}`);
          console.log(`Password Type: ${status.passwordType}`);
          console.log(`Is Secure: ${status.isSecure}`);
          console.log(`Recommendation: ${status.recommendation}`);
        } else {
          console.log(`Message: ${status.message}`);
        }
        
        process.exit(status.success ? 0 : 1);
      }
      
    } catch (error) {
      console.error('❌ CLI Error:', error.message);
      process.exit(1);
    }
  }
  
  runCLI();
}