import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './AdminLogin.css';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: email, 2: otp, 3: reset
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/unified-login', { username, password }, { withCredentials: true });
      if (res.data.success) {
        console.log('Login successful');
        console.log('User role:', res.data.role);
        console.log('User info:', res.data.user);
        // No localStorage/sessionStorage for auth! Cookie is set by backend
        navigate('/admin-dashboard');
      } else {
        alert('Incorrect Username or Password');
      }
    } catch (err) {
      alert('Login failed');
    }
  };

  // Forgot Password Handlers
  const handleForgotRequest = async (e) => {
    e.preventDefault();
    setForgotError(''); setForgotSuccess(''); setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/admin-forgot-password', {});
      if (res.data.success) {
        setForgotStep(2);
        setForgotSuccess('OTP sent to your email.');
      } else {
        setForgotError(res.data.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to send OTP.');
    }
    setLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setForgotError(''); setForgotSuccess(''); setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/admin-verify-otp', { otp });
      if (res.data.success) {
        setForgotStep(3);
        setForgotSuccess('OTP verified. Please enter your new password.');
      } else {
        setForgotError(res.data.message || 'Invalid OTP.');
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Invalid OTP.');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotError(''); setForgotSuccess(''); setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/admin-reset-password', { otp, newPassword });
      if (res.data.success) {
        setForgotSuccess('Password reset successful! You can now log in.');
        setTimeout(() => {
          setShowForgot(false);
          setForgotStep(1);
          setOtp('');
          setNewPassword('');
          setForgotError('');
          setForgotSuccess('');
        }, 2000);
      } else {
        setForgotError(res.data.message || 'Failed to reset password.');
      }
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Failed to reset password.');
    }
    setLoading(false);
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-disclaimer">
        <strong>Disclaimer:</strong> This portal is for authorized administrators only. Unauthorized access is prohibited.
      </div>
      <div className="admin-login-box">
        <h2>Admin Portal</h2>
        {!showForgot ? (
          <>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                placeholder="Enter Admin Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
              <input
                type="password"
                placeholder="Enter Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button type="submit">Login</button>
            </form>
            <div style={{ marginTop: '1rem' }}>
              <button type="button" className="forgot-link" style={{ background: 'none', border: 'none', color: '#3c94e1', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem' }} onClick={() => setShowForgot(true)}>
                Forgot Password?
              </button>
            </div>
          </>
        ) : (
          <div className="forgot-password-flow">
            {forgotStep === 1 && (
              <form onSubmit={handleForgotRequest}>
                <button type="submit" disabled={loading}>{loading ? 'Sending...' : 'Send OTP to Admin Email'}</button>
                <button type="button" style={{ marginTop: 8 }} onClick={() => { setShowForgot(false); setForgotStep(1); setForgotError(''); setForgotSuccess(''); }}>Back to Login</button>
              </form>
            )}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp}>
                <input
                  type="text"
                  placeholder="Enter the 6-digit code"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  pattern="[0-9]{6}"
                  autoComplete="one-time-code"
                />
                <button type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify Code'}</button>
                <button type="button" style={{ marginTop: 8 }} onClick={() => { setShowForgot(false); setForgotStep(1); setOtp(''); setForgotError(''); setForgotSuccess(''); }}>Back to Login</button>
              </form>
            )}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword}>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button type="submit" disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
                <button type="button" style={{ marginTop: 8 }} onClick={() => { setShowForgot(false); setForgotStep(1); setOtp(''); setNewPassword(''); setForgotError(''); setForgotSuccess(''); }}>Back to Login</button>
              </form>
            )}
            {(forgotError || forgotSuccess) && (
              <div style={{ marginTop: 12, color: forgotError ? 'red' : 'green', fontWeight: 500 }}>
                {forgotError || forgotSuccess}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
