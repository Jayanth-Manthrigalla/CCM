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

async function checkAdmin() {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query('SELECT username FROM Admins');
    console.log('Current admin usernames:', result.recordset);
    await pool.close();
  } catch (err) {
    console.error('Database error:', err);
  }
}

checkAdmin();