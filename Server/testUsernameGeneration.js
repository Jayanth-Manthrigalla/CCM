require('dotenv').config();
const userManagement = require('./userManagement');

async function testUsernameGeneration() {
  try {
    console.log('🧪 Testing Username Generation Logic\n');

    // Test 1: Basic username generation
    console.log('1. Testing basic username generation...');
    
    // Mock invite data
    const testInviteData = {
      firstName: 'John',
      lastName: 'Smith', 
      email: 'john.smith.test1@example.com',
      role: 'manager'
    };

    const result1 = await userManagement.createInvite(testInviteData, 'test@admin.com');
    
    if (result1.success) {
      console.log('✅ Basic username generation successful');
      console.log('   Generated username:', result1.username);
    } else {
      console.log('❌ Basic username generation failed:', result1.message);
      return;
    }

    // Test 2: Duplicate name handling
    console.log('\n2. Testing duplicate name handling...');
    
    const testInviteData2 = {
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith.test2@example.com', 
      role: 'manager'
    };

    const result2 = await userManagement.createInvite(testInviteData2, 'test@admin.com');
    
    if (result2.success) {
      console.log('✅ Duplicate name handling successful');
      console.log('   Generated username:', result2.username);
      console.log('   Should be different from first:', result1.username !== result2.username);
    } else {
      console.log('❌ Duplicate name handling failed:', result2.message);
    }

    // Test 3: Special characters handling
    console.log('\n3. Testing special characters handling...');
    
    const testInviteData3 = {
      firstName: 'María',
      lastName: 'García-López',
      email: 'maria.garcia@example.com',
      role: 'manager'
    };

    const result3 = await userManagement.createInvite(testInviteData3, 'test@admin.com');
    
    if (result3.success) {
      console.log('✅ Special characters handling successful');
      console.log('   Generated username:', result3.username);
      console.log('   Should be alphanumeric only:', /^[a-z0-9]+$/.test(result3.username));
    } else {
      console.log('❌ Special characters handling failed:', result3.message);
    }

    // Test 4: Get pending invites to verify usernames are stored
    console.log('\n4. Verifying usernames are stored in invites...');
    
    const invitesResult = await userManagement.getPendingInvites();
    
    if (invitesResult.success) {
      console.log('✅ Pending invites retrieved');
      const testInvites = invitesResult.invites.filter(invite => 
        invite.email.includes('test') || invite.email.includes('maria.garcia')
      );
      console.log('   Test invites found:', testInvites.length);
      testInvites.forEach(invite => {
        console.log(`   - ${invite.firstName} ${invite.lastName}: ${invite.username} (${invite.email})`);
      });
    } else {
      console.log('❌ Failed to retrieve invites:', invitesResult.message);
    }

    console.log('\n🎉 Username Generation Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

testUsernameGeneration();