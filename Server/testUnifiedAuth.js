require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testUnifiedAuth() {
  console.log('🧪 Testing Unified Authentication System\n');
  
  try {
    // Test 1: Login with manager credentials from Users table
    console.log('📋 Test 1: Manager Login from Users Table');
    console.log('==========================================');
    
    const managerLoginResponse = await axios.post(`${BASE_URL}/api/unified-login`, {
      username: 'jayanthmanthri', // This should be the username from Users table
      password: 'manager123!' // Password we just set for the manager
    }, {
      withCredentials: true,
      validateStatus: () => true // Don't throw errors for non-2xx status codes
    });
    
    console.log('Manager login response:', managerLoginResponse.status, managerLoginResponse.data);
    
    if (managerLoginResponse.status === 200) {
      console.log('✅ Manager login successful');
      console.log(`   Role: ${managerLoginResponse.data.role}`);
      console.log(`   User: ${managerLoginResponse.data.user.username}`);
      
      // Test accessing submissions (should work)
      console.log('\n📋 Test 2: Manager Accessing Submissions');
      console.log('========================================');
      
      const submissionsResponse = await axios.get(`${BASE_URL}/api/submissions`, {
        headers: {
          Cookie: managerLoginResponse.headers['set-cookie']
        },
        validateStatus: () => true
      });
      
      console.log('Submissions access:', submissionsResponse.status);
      if (submissionsResponse.status === 200) {
        console.log('✅ Manager can access submissions');
      } else {
        console.log('❌ Manager cannot access submissions:', submissionsResponse.data);
      }
      
      // Test accessing user management (should fail)
      console.log('\n📋 Test 3: Manager Accessing User Management');
      console.log('===========================================');
      
      const usersResponse = await axios.get(`${BASE_URL}/api/users`, {
        headers: {
          Cookie: managerLoginResponse.headers['set-cookie']
        },
        validateStatus: () => true
      });
      
      console.log('User management access:', usersResponse.status);
      if (usersResponse.status === 403) {
        console.log('✅ Manager correctly denied access to user management');
      } else {
        console.log('❌ Manager unexpectedly has access to user management');
      }
      
    } else {
      console.log('❌ Manager login failed');
      if (managerLoginResponse.data.message) {
        console.log(`   Reason: ${managerLoginResponse.data.message}`);
      }
    }
    
    // Test 4: Admin login from Admins table
    console.log('\n📋 Test 4: Admin Login from Admins Table');
    console.log('========================================');
    
    const adminLoginResponse = await axios.post(`${BASE_URL}/api/unified-login`, {
      username: 'adminchroniccare',
      password: 'newSecurePassword123!'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log('Admin login response:', adminLoginResponse.status, adminLoginResponse.data);
    
    if (adminLoginResponse.status === 200) {
      console.log('✅ Admin login successful');
      console.log(`   Role: ${adminLoginResponse.data.role}`);
      console.log(`   User: ${adminLoginResponse.data.user.username}`);
      
      // Test admin accessing user management (should work)
      console.log('\n📋 Test 5: Admin Accessing User Management');
      console.log('=========================================');
      
      const adminUsersResponse = await axios.get(`${BASE_URL}/api/users`, {
        headers: {
          Cookie: adminLoginResponse.headers['set-cookie']
        },
        validateStatus: () => true
      });
      
      console.log('Admin user management access:', adminUsersResponse.status);
      if (adminUsersResponse.status === 200) {
        console.log('✅ Admin can access user management');
      } else {
        console.log('❌ Admin cannot access user management:', adminUsersResponse.data);
      }
      
    } else {
      console.log('❌ Admin login failed');
    }
    
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log('The unified authentication system allows:');
    console.log('✅ Admins: Full access (submissions + user management)');
    console.log('✅ Managers: Limited access (submissions only)');
    console.log('❌ Other roles: No dashboard access');
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server. Make sure the server is running on http://localhost:5000');
    } else {
      console.error('❌ Test failed:', error.message);
    }
  }
}

// Run the test
if (require.main === module) {
  testUnifiedAuth();
}