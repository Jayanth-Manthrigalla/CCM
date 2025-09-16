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

async function setupDatabase() {
  try {
    const pool = await sql.connect(config);
    
    console.log('Setting up database schema for Manager Invitation System...\n');
    
    // 1. Create Users table (for admins + managers)
    console.log('Creating Users table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' AND xtype='U')
      CREATE TABLE Users (
        id INT IDENTITY(1,1) PRIMARY KEY,
        firstName NVARCHAR(100) NOT NULL,
        lastName NVARCHAR(100) NOT NULL,
        email NVARCHAR(255) UNIQUE NOT NULL,
        role NVARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Manager')),
        passwordHash NVARCHAR(255) NOT NULL,
        isActive BIT DEFAULT 1,
        createdAt DATETIME2 DEFAULT GETDATE(),
        updatedAt DATETIME2 DEFAULT GETDATE()
      )
    `);
    
    // 2. Create Invites table
    console.log('Creating Invites table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Invites' AND xtype='U')
      CREATE TABLE Invites (
        id INT IDENTITY(1,1) PRIMARY KEY,
        email NVARCHAR(255) NOT NULL,
        firstName NVARCHAR(100) NOT NULL,
        lastName NVARCHAR(100) NOT NULL,
        role NVARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Manager')),
        tokenHash NVARCHAR(255) UNIQUE NOT NULL,
        expiresAt DATETIME2 NOT NULL,
        used BIT DEFAULT 0,
        invitedBy NVARCHAR(255) NOT NULL,
        createdAt DATETIME2 DEFAULT GETDATE()
      )
    `);
    
    // 3. Create OTP Records table
    console.log('Creating OtpRecords table...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='OtpRecords' AND xtype='U')
      CREATE TABLE OtpRecords (
        id INT IDENTITY(1,1) PRIMARY KEY,
        adminEmail NVARCHAR(255) NOT NULL,
        managerEmail NVARCHAR(255),
        otpHash NVARCHAR(255) NOT NULL,
        newPasswordHash NVARCHAR(255),
        expiresAt DATETIME2 NOT NULL,
        used BIT DEFAULT 0,
        operationType NVARCHAR(50) NOT NULL, -- 'admin_password_change', 'manager_password_change'
        createdAt DATETIME2 DEFAULT GETDATE()
      )
    `);
    
    // 4. Migrate existing admin to Users table
    console.log('Migrating existing admin to Users table...');
    
    // Check if admin already exists in Users table
    const existingUser = await pool.request()
      .query("SELECT * FROM Users WHERE email = 'admin@chroniccarebridge.com'");
    
    if (existingUser.recordset.length === 0) {
      // Get admin from Admins table
      const admin = await pool.request()
        .query("SELECT * FROM Admins WHERE username = 'adminchroniccare'");
      
      if (admin.recordset.length > 0) {
        const adminData = admin.recordset[0];
        await pool.request()
          .input('firstName', sql.NVarChar(100), 'Admin')
          .input('lastName', sql.NVarChar(100), 'User')
          .input('email', sql.NVarChar(255), adminData.email || 'admin@chroniccarebridge.com')
          .input('role', sql.NVarChar(50), 'Admin')
          .input('passwordHash', sql.NVarChar(255), adminData.password)
          .query(`
            INSERT INTO Users (firstName, lastName, email, role, passwordHash, isActive)
            VALUES (@firstName, @lastName, @email, @role, @passwordHash, 1)
          `);
        console.log('Admin migrated successfully!');
      }
    } else {
      console.log('Admin already exists in Users table.');
    }
    
    // 5. Display current table contents
    console.log('\n=== Current Tables Content ===\n');
    
    console.log('Users:');
    const users = await pool.request().query('SELECT id, firstName, lastName, email, role, isActive FROM Users');
    console.table(users.recordset);
    
    console.log('\nInvites:');
    const invites = await pool.request().query('SELECT TOP 5 * FROM Invites ORDER BY createdAt DESC');
    console.table(invites.recordset);
    
    console.log('\nOtpRecords:');
    const otps = await pool.request().query('SELECT TOP 5 * FROM OtpRecords ORDER BY createdAt DESC');
    console.table(otps.recordset);
    
    await pool.close();
    console.log('\n✅ Database schema setup completed successfully!');
    
  } catch (err) {
    console.error('❌ Database setup error:', err);
  }
}

setupDatabase();