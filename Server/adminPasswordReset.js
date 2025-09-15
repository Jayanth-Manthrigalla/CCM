// adminPasswordReset.js
// In-memory store for OTPs
const otps = {};
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const crypto = require('crypto');
// const { sendEmail } = require('./adminAuth'); // Assuming sendEmail is exported here

function generateOTP() {
  return (Math.floor(100000 + Math.random() * 900000)).toString();
}

function setOTP(email, otp) {
  if (otps[email] && otps[email].timeout) clearTimeout(otps[email].timeout);
  otps[email] = {
    otp,
    expires: Date.now() + OTP_EXPIRY_MS,
    timeout: setTimeout(() => { delete otps[email]; }, OTP_EXPIRY_MS)
  };
}

function setOTPWithPassword(email, otp, newPasswordHash) {
  if (otps[email] && otps[email].timeout) clearTimeout(otps[email].timeout);
  otps[email] = {
    otp,
    newPasswordHash, // Store the new password hash temporarily
    expires: Date.now() + OTP_EXPIRY_MS,
    timeout: setTimeout(() => { delete otps[email]; }, OTP_EXPIRY_MS)
  };
}

function verifyOTP(email, otp) {
  const entry = otps[email];
  if (!entry) return { valid: false, reason: 'No OTP requested or expired.' };
  if (Date.now() > entry.expires) {
    delete otps[email];
    return { valid: false, reason: 'OTP expired.' };
  }
  if (entry.otp !== otp) return { valid: false, reason: 'Invalid OTP.' };
  return { valid: true, newPasswordHash: entry.newPasswordHash };
}

function clearOTP(email) {
  if (otps[email] && otps[email].timeout) clearTimeout(otps[email].timeout);
  delete otps[email];
}

module.exports = {
  generateOTP,
  setOTP,
  setOTPWithPassword,
  verifyOTP,
  clearOTP,
  otps,
  OTP_EXPIRY_MS,
};
