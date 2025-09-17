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

async function testUserAuth() {
  try {
    console.log('Testing SQL Server connection and username authentication...\n');
    
    const pool = await sql.connect(config);
    
    // Test 1: Check if username column exists
    console.log('1. Checking if username column exists...');
    try {
      const columnCheck = await pool.request().query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'username'
      `);
      
      if (columnCheck.recordset.length > 0) {
        console.log('✅ Username column exists in Users table');
      } else {
        console.log('❌ Username column does NOT exist in Users table');
        console.log('Please run the migration script first: migrate_add_username.sql');
        return;
      }
    } catch (error) {
      console.log('❌ Error checking username column:', error.message);
      return;
    }
    
    // Test 2: Check Users table structure
    console.log('\n2. Checking Users table structure...');
    const tableStructure = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Users table columns:');
    tableStructure.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });
    
    // Test 3: Check if there are any users
    console.log('\n3. Checking existing users...');
    const userCount = await pool.request().query('SELECT COUNT(*) as count FROM Users');
    console.log(`Total users in database: ${userCount.recordset[0].count}`);
    
    if (userCount.recordset[0].count > 0) {
      const sampleUsers = await pool.request().query(`
        SELECT TOP 3 id, firstName, lastName, username, email, role, isActive 
        FROM Users 
        ORDER BY id
      `);
      
      console.log('Sample users:');
      sampleUsers.recordset.forEach(user => {
        console.log(`  - ID: ${user.id}, Username: ${user.username || 'NULL'}, Email: ${user.email}, Role: ${user.role}`);
      });
    }
    
    // Test 4: Test username uniqueness constraint
    console.log('\n4. Testing username constraints...');
    try {
      const constraintCheck = await pool.request().query(`
        SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
        WHERE TABLE_NAME = 'Users' AND CONSTRAINT_TYPE = 'UNIQUE'
      `);
      
      console.log('Unique constraints on Users table:');
      constraintCheck.recordset.forEach(constraint => {
        console.log(`  - ${constraint.CONSTRAINT_NAME} (${constraint.CONSTRAINT_TYPE})`);
      });
    } catch (error) {
      console.log('Error checking constraints:', error.message);
    }
    
    // Test 5: Test password hashing
    console.log('\n5. Testing password hashing...');
    const testPassword = 'TestPassword123!';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    const isValid = await bcrypt.compare(testPassword, hashedPassword);
    console.log(`Password hashing test: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
    
    await pool.close();
    console.log('\n✅ All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUserAuth();