require('dotenv').config();
const sql = require('mssql');
const bcrypt = require('bcryptjs');

const config = {
  server: process.env.SQL_SERVER,
  port: parseInt(process.env.SQL_PORT),
  database: 'chroniccarebridge',
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function setManagerPassword() {
  try {
    const pool = await sql.connect(config);
    
    // Check current manager
    const userResult = await pool.request()
      .input('username', sql.NVarChar(255), 'jayanthmanthri')
      .query('SELECT username, role, passwordHash FROM Users WHERE username = @username');
    
    if (userResult.recordset.length === 0) {
      console.log('❌ Manager user not found');
      return;
    }
    
    const user = userResult.recordset[0];
    console.log('📋 Current user info:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Has password: ${!!user.passwordHash}`);
    
    // Set a new password for testing
    const newPassword = 'manager123!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    const updateResult = await pool.request()
      .input('username', sql.NVarChar(255), 'jayanthmanthri')
      .input('passwordHash', sql.NVarChar(255), hashedPassword)
      .query('UPDATE Users SET passwordHash = @passwordHash WHERE username = @username');
    
    console.log(`✅ Password updated for manager: ${user.username}`);
    console.log(`   New password: ${newPassword}`);
    console.log(`   Updated rows: ${updateResult.rowsAffected[0]}`);
    
    await pool.close();
    
  } catch (error) {
    console.error('❌ Error setting manager password:', error.message);
  }
}

setManagerPassword();