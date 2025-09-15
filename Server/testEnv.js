require('dotenv').config();

console.log('Environment variables:');
console.log('AAD_TENANT_ID:', process.env.AAD_TENANT_ID);
console.log('AAD_CLIENT_ID:', process.env.AAD_CLIENT_ID);
console.log('AAD_CLIENT_SECRET:', process.env.AAD_CLIENT_SECRET ? '***exists***' : 'missing');
console.log('USER_ID:', process.env.USER_ID);