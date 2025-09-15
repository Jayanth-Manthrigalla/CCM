require('dotenv').config();
const sql = require('mssql');
const bcrypt = require('bcryptjs');

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

async function verifyAdminPassword() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .query("SELECT username, password FROM Admins WHERE username = 'adminchroniccare'");
    
    if (result.recordset.length > 0) {
      const admin = result.recordset[0];
      console.log('Admin found:', admin.username);
      console.log('Stored password hash:', admin.password);
      
      // Test bcrypt comparison with 'admin123'
      const isMatch = await bcrypt.compare('admin123', admin.password);
      console.log('Password "admin123" matches:', isMatch);
      
      // Check if it's still plain text
      const isPlainText = admin.password === 'admin123';
      console.log('Is plain text:', isPlainText);
      
      // Check if it's a bcrypt hash
      const isBcryptHash = admin.password.startsWith('$2b$');
      console.log('Is bcrypt hash:', isBcryptHash);
    } else {
      console.log('No admin found with username: adminchroniccare');
    }
    
    await pool.close();
  } catch (err) {
    console.error('Database error:', err);
  }
}

verifyAdminPassword();