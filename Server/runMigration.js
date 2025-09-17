require('dotenv').config();
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const config = {
  server: process.env.SQL_SERVER,
  port: parseInt(process.env.SQL_PORT),
  database: 'chroniccarebridge', // Using the database name from your migration script
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...\n');
    
    // Read the migration script
    const migrationPath = path.join(__dirname, 'migrate_add_username.sql');
    const migrationScript = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration script loaded successfully');
    console.log('🔗 Connecting to SQL Server...');
    
    // Connect to SQL Server
    const pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server successfully\n');
    
    // Split the script into individual statements (simple approach)
    // Note: This is a simplified approach - for complex scripts, you might need a more sophisticated parser
    const statements = migrationScript
      .split('GO')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Found ${statements.length} statement(s) to execute\n`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`⚡ Executing statement ${i + 1}...`);
        try {
          const result = await pool.request().query(statement);
          console.log(`✅ Statement ${i + 1} executed successfully`);
          
          // Log any messages from SQL Server
          if (result.output) {
            console.log(`   Output: ${result.output}`);
          }
        } catch (error) {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          throw error;
        }
      }
    }
    
    await pool.close();
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();