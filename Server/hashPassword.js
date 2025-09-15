const bcrypt = require('bcryptjs');

async function hashPassword() {
  const passwords = ['admin123', 'admin', 'password', 'adminchroniccare'];
  
  console.log('Generating hashed passwords for common passwords:\n');
  
  for (const plainPassword of passwords) {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    console.log(`Password: "${plainPassword}"`);
    console.log(`Hashed: ${hashedPassword}`);
    console.log(`SQL: UPDATE Admins SET password = '${hashedPassword}' WHERE username = 'adminchroniccare';\n`);
  }
}

hashPassword();