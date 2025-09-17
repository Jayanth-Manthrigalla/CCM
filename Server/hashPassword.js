const bcrypt = require('bcryptjs');

/**
 * Password hashing utility functions
 * Industry-standard practices:
 * - No hardcoded passwords
 * - No SQL operations (utility only)
 * - Proper error handling
 * - Never log plaintext passwords
 */

/**
 * Hash a single password using bcrypt
 * @param {string} plainPassword - The plaintext password to hash
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string>} - The hashed password
 */
async function hashPassword(plainPassword, saltRounds = 12) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  if (plainPassword.length < 1) {
    throw new Error('Password cannot be empty');
  }

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, saltRounds);
    console.log('✅ Password hashed successfully');
    return hashedPassword;
  } catch (error) {
    console.error('❌ Error hashing password:', error.message);
    throw new Error('Failed to hash password');
  }
}

/**
 * Hash multiple passwords in batch
 * @param {string[]} passwords - Array of plaintext passwords
 * @param {number} saltRounds - Number of salt rounds (default: 12)
 * @returns {Promise<string[]>} - Array of hashed passwords
 */
async function hashPasswordBatch(passwords, saltRounds = 12) {
  if (!Array.isArray(passwords)) {
    throw new Error('Passwords must be an array');
  }

  if (passwords.length === 0) {
    return [];
  }

  console.log(`🔐 Hashing ${passwords.length} password(s)...`);
  
  try {
    const hashedPasswords = await Promise.all(
      passwords.map(async (password, index) => {
        if (!password || typeof password !== 'string') {
          throw new Error(`Password at index ${index} must be a non-empty string`);
        }
        return await bcrypt.hash(password, saltRounds);
      })
    );
    
    console.log('✅ All passwords hashed successfully');
    return hashedPasswords;
  } catch (error) {
    console.error('❌ Error hashing passwords:', error.message);
    throw new Error('Failed to hash one or more passwords');
  }
}

/**
 * Verify if a password matches a hash
 * @param {string} plainPassword - The plaintext password to verify
 * @param {string} hash - The hash to compare against
 * @returns {Promise<boolean>} - True if password matches
 */
async function verifyPasswordHash(plainPassword, hash) {
  if (!plainPassword || typeof plainPassword !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  try {
    const isMatch = await bcrypt.compare(plainPassword, hash);
    return isMatch;
  } catch (error) {
    console.error('❌ Error verifying password:', error.message);
    throw new Error('Failed to verify password');
  }
}

/**
 * Check if a string is a bcrypt hash
 * @param {string} str - String to check
 * @returns {boolean} - True if it's a bcrypt hash
 */
function isBcryptHash(str) {
  if (!str || typeof str !== 'string') {
    return false;
  }
  
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost and salt
  return /^\$2[aby]\$\d{2}\$/.test(str);
}

// Export functions for use in other modules
module.exports = {
  hashPassword,
  hashPasswordBatch,
  verifyPasswordHash,
  isBcryptHash
};

// CLI usage example (only run if this file is executed directly)
if (require.main === module) {
  async function runExample() {
    try {
      console.log('🔐 Password Hashing Utility\n');
      
      // Example usage - replace with your actual passwords
      const examplePasswords = process.argv.slice(2);
      
      if (examplePasswords.length === 0) {
        console.log('Usage: node hashPassword.js <password1> [password2] ...');
        console.log('Example: node hashPassword.js "myNewPassword" "anotherPassword"');
        return;
      }
      
      console.log(`Hashing ${examplePasswords.length} password(s)...`);
      
      const hashedPasswords = await hashPasswordBatch(examplePasswords);
      
      console.log('\n📋 Results:');
      hashedPasswords.forEach((hash, index) => {
        console.log(`Password ${index + 1}: ${hash}`);
      });
      
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
  
  runExample();
}