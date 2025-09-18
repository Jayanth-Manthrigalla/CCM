require('dotenv').config();
const axios = require('axios');

async function testEnhancedInvitationSystem() {
  try {
    console.log('🚀 Testing Enhanced Manager Invitation System\n');

    // First, login as manager (since we know those credentials work)
    console.log('1. Logging in as manager...');
    const loginResponse = await axios.post('http://localhost:5000/api/unified-login', {
      username: 'jayanthmanthri',
      password: 'manager123!'
    }, { withCredentials: true });

    if (!loginResponse.data.success) {
      console.log('❌ Login failed:', loginResponse.data.message);
      return;
    }
    console.log('✅ Admin login successful');

    // Get cookies for subsequent requests
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies[0].split(';')[0] : '';

    // Create test invitation
    console.log('\n2. Creating invitation for John Smith...');
    const inviteResponse = await axios.post('http://localhost:5000/api/invites', {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith.test@example.com',
      role: 'manager'
    }, {
      headers: {
        'Cookie': cookieHeader
      }
    });

    if (!inviteResponse.data.success) {
      console.log('❌ Invitation failed:', inviteResponse.data.message);
      return;
    }
    console.log('✅ Invitation created successfully');
    console.log('   Generated username:', inviteResponse.data.username || 'Username not returned');

    // Get pending invitations to see if username is displayed
    console.log('\n3. Fetching pending invitations...');
    const invitesResponse = await axios.get('http://localhost:5000/api/invites', {
      headers: {
        'Cookie': cookieHeader
      }
    });

    if (invitesResponse.data.success) {
      console.log('✅ Pending invitations retrieved');
      const testInvite = invitesResponse.data.invites.find(
        invite => invite.email === 'john.smith.test@example.com'
      );
      
      if (testInvite) {
        console.log('   Test invite found:');
        console.log('   - Name:', testInvite.firstName, testInvite.lastName);
        console.log('   - Username:', testInvite.username);
        console.log('   - Email:', testInvite.email);
        console.log('   - Status:', testInvite.status);
      } else {
        console.log('❌ Test invite not found in response');
      }
    } else {
      console.log('❌ Failed to retrieve invitations:', invitesResponse.data.message);
    }

    // Test duplicate prevention - try to create same invite again
    console.log('\n4. Testing duplicate prevention...');
    const duplicateResponse = await axios.post('http://localhost:5000/api/invites', {
      firstName: 'John',
      lastName: 'Smith', 
      email: 'john.smith.test@example.com',
      role: 'manager'
    }, {
      headers: {
        'Cookie': cookieHeader
      }
    });

    if (!duplicateResponse.data.success) {
      console.log('✅ Duplicate prevention working:', duplicateResponse.data.message);
    } else {
      console.log('❌ Duplicate prevention failed - invitation was created');
    }

    // Test username uniqueness by creating similar names
    console.log('\n5. Testing username uniqueness...');
    const similarResponse = await axios.post('http://localhost:5000/api/invites', {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith2.test@example.com', 
      role: 'manager'
    }, {
      headers: {
        'Cookie': cookieHeader
      }
    });

    if (similarResponse.data.success) {
      console.log('✅ Similar name invitation created');
      console.log('   New username:', similarResponse.data.username || 'Username not returned');
    } else {
      console.log('❌ Similar name invitation failed:', similarResponse.data.message);
    }

    console.log('\n🎉 Enhanced Invitation System Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testEnhancedInvitationSystem();