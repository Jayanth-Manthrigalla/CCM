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

async function checkAndUpdateAdmin() {
  try {
    const pool = await sql.connect(config);
    
    // First check current admin structure
    console.log('Current admin data:');
    const result = await pool.request().query('SELECT * FROM Admins');
    console.table(result.recordset);
    
    // Check if email column exists
    const columns = await pool.request().query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Admins'
    `);
    
    const hasEmailColumn = columns.recordset.some(col => col.COLUMN_NAME === 'email');
    console.log('Has email column:', hasEmailColumn);
    
    if (!hasEmailColumn) {
      console.log('Adding email column...');
      await pool.request().query('ALTER TABLE Admins ADD email NVARCHAR(255)');
      
      // Update the admin with a valid email
      await pool.request()
        .query("UPDATE Admins SET email = 'admin@chroniccarebridge.com' WHERE username = 'adminchroniccare'");
      
      console.log('Email column added and updated.');
    } else {
      // Just update the email if column exists
      await pool.request()
        .query("UPDATE Admins SET email = 'admin@chroniccarebridge.com' WHERE username = 'adminchroniccare'");
      console.log('Email updated.');
    }
    
    // Show final result
    console.log('\nFinal admin data:');
    const finalResult = await pool.request().query('SELECT * FROM Admins');
    console.table(finalResult.recordset);
    
    await pool.close();
  } catch (err) {
    console.error('Database error:', err);
  }
}

checkAndUpdateAdmin();