import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ManagerPasswordChangeModal.css';

// Configure axios defaults for credentials
axios.defaults.withCredentials = true;

const ManagerPasswordChangeModal = ({ isVisible, onClose }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedManager, setSelectedManager] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: select manager and password, 2: OTP verification
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchManagers();
    } else {
      // Reset form when modal closes
      resetForm();
    }
  }, [isVisible]);

  const fetchManagers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/users', {
        withCredentials: true
      });
      if (response.data.success) {
        // Filter only managers (non-admin users)
        const managers = response.data.users.filter(user => user.role !== 'admin');
        setUsers(managers);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedManager('');
    setNewPassword('');
    setConfirmPassword('');
    setOtp('');
    setStep(1);
    setError('');
    setSuccess('');
    setSubmitting(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      setSubmitting(false);
      return;
    }

    if (!selectedManager) {
      setError('Please select a manager');
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/manager/change-password/request', {
        managerEmail: selectedManager,
        newPassword: newPassword
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        setStep(2);
        setSuccess('Verification code sent to your email. Please check your inbox.');
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error requesting password change:', error);
      setError(error.response?.data?.message || 'Failed to request password change');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (!otp) {
      setError('Please enter the verification code');
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/manager/change-password/confirm', {
        managerEmail: selectedManager,
        otp: otp
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        setSuccess('Manager password changed successfully!');
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error confirming password change:', error);
      setError(error.response?.data?.message || 'Failed to verify code');
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    setStep(1);
    setOtp('');
    setError('');
    setSuccess('');
  };

  if (!isVisible) return null;

  const selectedManagerName = users.find(user => user.email === selectedManager);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="manager-password-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Change Manager Password</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-content">
          {error && (
            <div className="error-message">
              {error}
              <button onClick={() => setError('')}>×</button>
            </div>
          )}

          {success && (
            <div className="success-message">
              {success}
              <button onClick={() => setSuccess('')}>×</button>
            </div>
          )}

          {loading ? (
            <div className="loading">Loading managers...</div>
          ) : (
            <>
              {step === 1 && (
                <div className="step-1">
                  <h3>Select Manager and Set New Password</h3>
                  <form onSubmit={handlePasswordSubmit} className="password-form">
                    <div className="form-group">
                      <label>Select Manager</label>
                      <select
                        value={selectedManager}
                        onChange={(e) => setSelectedManager(e.target.value)}
                        required
                      >
                        <option value="">Choose a manager...</option>
                        {users.map(user => (
                          <option key={user.id} value={user.email}>
                            {user.firstName} {user.lastName} ({user.email})
                          </option>
                        ))}
                      </select>
                      {users.length === 0 && (
                        <p className="no-managers">No managers found. Send invitations to create manager accounts.</p>
                      )}
                    </div>

                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 8 characters)"
                        required
                        minLength="8"
                      />
                    </div>

                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        required
                        minLength="8"
                      />
                    </div>

                    <div className="form-actions">
                      <button type="button" className="cancel-btn" onClick={onClose}>
                        Cancel
                      </button>
                      <button type="submit" className="submit-btn" disabled={submitting || users.length === 0}>
                        {submitting ? 'Processing...' : 'Send Verification Code'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {step === 2 && (
                <div className="step-2">
                  <h3>Enter Verification Code</h3>
                  <div className="verification-info">
                    <p><strong>Manager:</strong> {selectedManagerName?.firstName} {selectedManagerName?.lastName}</p>
                    <p><strong>Email:</strong> {selectedManager}</p>
                    <p>A verification code has been sent to your admin email. Please enter it below to confirm the password change.</p>
                  </div>

                  <form onSubmit={handleOtpSubmit} className="otp-form">
                    <div className="form-group">
                      <label>Verification Code</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="Enter 6-digit code"
                        required
                        maxLength="6"
                        pattern="[0-9]{6}"
                        className="otp-input"
                      />
                    </div>

                    <div className="form-actions">
                      <button type="button" className="back-btn" onClick={goBack}>
                        Back
                      </button>
                      <button type="submit" className="submit-btn" disabled={submitting}>
                        {submitting ? 'Verifying...' : 'Change Password'}
                      </button>
                    </div>
                  </form>

                  <div className="security-note">
                    <p><small>🔒 The verification code expires in 5 minutes for security reasons.</small></p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagerPasswordChangeModal;