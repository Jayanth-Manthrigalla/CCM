require('dotenv').config();
const sql = require('mssql');

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

async function runMigrationDirect() {
  try {
    console.log('🚀 Starting username migration...\n');
    
    console.log('🔗 Connecting to SQL Server...');
    const pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server successfully\n');
    
    // Step 1: Check if username column exists
    console.log('1. Checking if username column exists...');
    const columnCheck = await pool.request().query(`
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'username'
    `);
    
    if (columnCheck.recordset.length > 0) {
      console.log('✅ Username column already exists in Users table');
    } else {
      console.log('➕ Adding username column to Users table...');
      await pool.request().query('ALTER TABLE Users ADD username NVARCHAR(255)');
      console.log('✅ Username column added successfully');
    }
    
    // Step 2: Check current user data
    console.log('\n2. Checking current user data...');
    const userCount = await pool.request().query('SELECT COUNT(*) as count FROM Users');
    console.log(`Total users: ${userCount.recordset[0].count}`);
    
    // Step 3: Populate username column
    console.log('\n3. Populating username column...');
    const updateResult = await pool.request().query(`
      UPDATE Users 
      SET username = LOWER(REPLACE(TRIM(firstName) + TRIM(lastName), ' ', ''))
      WHERE username IS NULL
    `);
    console.log(`✅ Updated ${updateResult.rowsAffected[0]} user records with usernames`);
    
    // Step 4: Handle duplicates
    console.log('\n4. Checking for duplicate usernames...');
    const duplicates = await pool.request().query(`
      SELECT username, COUNT(*) as count 
      FROM Users 
      WHERE username IS NOT NULL 
      GROUP BY username 
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.recordset.length > 0) {
      console.log(`Found ${duplicates.recordset.length} duplicate username(s), resolving...`);
      
      for (const dup of duplicates.recordset) {
        console.log(`Resolving duplicate: ${dup.username} (${dup.count} occurrences)`);
        
        const duplicateUsers = await pool.request()
          .input('username', sql.NVarChar, dup.username)
          .query(`
            SELECT id, username 
            FROM Users 
            WHERE username = @username 
            ORDER BY id
          `);
        
        // Update all but the first user with numbered usernames
        for (let i = 1; i < duplicateUsers.recordset.length; i++) {
          const newUsername = `${dup.username}${i}`;
          await pool.request()
            .input('id', sql.Int, duplicateUsers.recordset[i].id)
            .input('newUsername', sql.NVarChar, newUsername)
            .query('UPDATE Users SET username = @newUsername WHERE id = @id');
          console.log(`  Updated user ID ${duplicateUsers.recordset[i].id} to username: ${newUsername}`);
        }
      }
    } else {
      console.log('✅ No duplicate usernames found');
    }
    
    // Step 5: Make username NOT NULL
    console.log('\n5. Setting username column constraints...');
    try {
      await pool.request().query('ALTER TABLE Users ALTER COLUMN username NVARCHAR(255) NOT NULL');
      console.log('✅ Username column set to NOT NULL');
    } catch (error) {
      if (error.message.includes('cannot be modified to be NOT NULL')) {
        console.log('⚠️  Some users still have NULL usernames, fixing...');
        // Handle any remaining NULL values
        await pool.request().query(`
          UPDATE Users 
          SET username = 'user' + CAST(id AS NVARCHAR(10))
          WHERE username IS NULL
        `);
        await pool.request().query('ALTER TABLE Users ALTER COLUMN username NVARCHAR(255) NOT NULL');
        console.log('✅ Fixed NULL usernames and set NOT NULL constraint');
      } else {
        throw error;
      }
    }
    
    // Step 6: Add unique constraint
    console.log('\n6. Adding unique constraint on username...');
    try {
      await pool.request().query('ALTER TABLE Users ADD CONSTRAINT UQ_Users_Username UNIQUE (username)');
      console.log('✅ Unique constraint added successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Unique constraint already exists');
      } else {
        throw error;
      }
    }
    
    // Step 7: Create index
    console.log('\n7. Creating index on username...');
    try {
      await pool.request().query('CREATE INDEX IX_Users_Username ON Users (username)');
      console.log('✅ Index created successfully');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('✅ Index already exists');
      } else {
        throw error;
      }
    }
    
    // Step 8: Display results
    console.log('\n8. Final verification...');
    const finalResult = await pool.request().query(`
      SELECT TOP 5 
        id, 
        firstName, 
        lastName, 
        username, 
        email, 
        role 
      FROM Users
      ORDER BY id
    `);
    
    console.log('\nSample of updated Users table:');
    finalResult.recordset.forEach(user => {
      console.log(`  ID: ${user.id}, Name: ${user.firstName} ${user.lastName}, Username: ${user.username}, Role: ${user.role}`);
    });
    
    const totalUsers = await pool.request().query('SELECT COUNT(*) as count FROM Users');
    const usersWithUsernames = await pool.request().query('SELECT COUNT(*) as count FROM Users WHERE username IS NOT NULL');
    const uniqueUsernames = await pool.request().query('SELECT COUNT(DISTINCT username) as count FROM Users WHERE username IS NOT NULL');
    
    console.log('\n📊 Migration Summary:');
    console.log(`Total users: ${totalUsers.recordset[0].count}`);
    console.log(`Users with usernames: ${usersWithUsernames.recordset[0].count}`);
    console.log(`Unique usernames: ${uniqueUsernames.recordset[0].count}`);
    
    await pool.close();
    console.log('\n🎉 Username migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the migration
runMigrationDirect();