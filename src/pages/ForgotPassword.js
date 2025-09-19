import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [formData, setFormData] = useState({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userType, setUserType] = useState('');

  // Step 1: Send OTP to email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('http://localhost:5000/api/forgot-password', {
        email: formData.email
      });

      if (response.data.success) {
        setUserType(response.data.userType);
        setSuccess(response.data.message);
        setStep(2);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      setError(error.response?.data?.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('http://localhost:5000/api/verify-reset-otp', {
        email: formData.email,
        otp: formData.otp
      });

      if (response.data.success) {
        setSuccess('OTP verified successfully');
        setStep(3);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/reset-password', {
        email: formData.email,
        newPassword: formData.newPassword,
        confirmPassword: formData.confirmPassword,
        userType: userType
      });

      if (response.data.success) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/admin-login');
        }, 2000);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setError(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    setSuccess('');
  };

  const handleBackToLogin = () => {
    navigate('/admin-login');
  };

  const handleResendOtp = () => {
    setStep(1);
    setFormData(prev => ({ ...prev, otp: '' }));
    setError('');
    setSuccess('Click "Send Reset Code" to receive a new OTP');
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <div className="forgot-password-header">
          <h1>Reset Your Password</h1>
          <div className="progress-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className="step-line"></div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className="step-line"></div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
          </div>
        </div>

        <div className="forgot-password-content">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}

          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="reset-form">
              <h2>Enter Your Email Address</h2>
              <p>We'll send you a verification code to reset your password.</p>
              
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter your email address"
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="reset-btn primary"
                disabled={loading || !formData.email.trim()}
              >
                {loading ? 'Sending...' : 'Send Reset Code'}
              </button>

              <button 
                type="button" 
                className="reset-btn secondary"
                onClick={handleBackToLogin}
              >
                Back to Login
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleOtpSubmit} className="reset-form">
              <h2>Enter Verification Code</h2>
              <p>We sent a 6-digit code to <strong>{formData.email}</strong></p>
              
              <div className="form-group">
                <label htmlFor="otp">Verification Code</label>
                <input
                  type="text"
                  id="otp"
                  name="otp"
                  value={formData.otp}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  disabled={loading}
                  className="otp-input"
                />
              </div>

              <button 
                type="submit" 
                className="reset-btn primary"
                disabled={loading || formData.otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>

              <button 
                type="button" 
                className="reset-btn secondary"
                onClick={handleResendOtp}
              >
                Didn't receive code? Send new one
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handlePasswordReset} className="reset-form">
              <h2>Create New Password</h2>
              <p>Your password must be at least 8 characters long.</p>
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter new password"
                  minLength="8"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  placeholder="Confirm new password"
                  minLength="8"
                  disabled={loading}
                />
              </div>

              <button 
                type="submit" 
                className="reset-btn primary"
                disabled={loading || !formData.newPassword || !formData.confirmPassword}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;