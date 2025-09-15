require('dotenv').config();
const sql = require('mssql');

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

async function updateAdminPassword() {
  try {
    const pool = await sql.connect(config);
    
    // First, let's see the current password (for debugging)
    const currentResult = await pool.request()
      .query("SELECT username, password FROM Admins WHERE username = 'adminchroniccare'");
    console.log('Current admin data:', currentResult.recordset[0]);
    
    // Update with hashed password (using "admin123" as the password)
    const hashedPassword = '$2b$10$O9ypXAsdMda9glcB/6zmEOvlbFKWImqTMxT7jxqhHuzlooeUT5Yq.';
    const updateResult = await pool.request()
      .input('hashedPassword', sql.VarChar(255), hashedPassword)
      .query("UPDATE Admins SET password = @hashedPassword WHERE username = 'adminchroniccare'");
    
    console.log('Password updated successfully!');
    console.log('Updated rows:', updateResult.rowsAffected[0]);
    console.log('New login credentials: adminchroniccare / admin123');
    
    await pool.close();
  } catch (err) {
    console.error('Database error:', err);
  }
}

updateAdminPassword();