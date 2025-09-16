import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './UserAccountManagement.css';

const UserAccountManagement = () => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  // Change Password states
  const [passwordStep, setPasswordStep] = useState(1);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
    otp: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  // User Management states
  const [userManagementTab, setUserManagementTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [userManagementLoading, setUserManagementLoading] = useState(false);
  const [userManagementError, setUserManagementError] = useState('');
  const [userManagementSuccess, setUserManagementSuccess] = useState('');
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'manager'
  });
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Manager Password Change states
  const [managers, setManagers] = useState([]);
  const [selectedManager, setSelectedManager] = useState('');
  const [managerNewPassword, setManagerNewPassword] = useState('');
  const [managerConfirmPassword, setManagerConfirmPassword] = useState('');
  const [managerOtp, setManagerOtp] = useState('');
  const [managerPasswordStep, setManagerPasswordStep] = useState(1);
  const [managerPasswordError, setManagerPasswordError] = useState('');
  const [managerPasswordSuccess, setManagerPasswordSuccess] = useState('');
  const [managerPasswordLoading, setManagerPasswordLoading] = useState(false);

  const navigate = useNavigate();

  // Logout function
  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:5000/api/admin-logout', {}, { withCredentials: true });
    } catch (err) {}
    navigate('/admin');
  };

  // Change Password Functions
  const handleChangePasswordRequest = async (e) => {
    e.preventDefault();
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    setPasswordError(''); setPasswordSuccess(''); setPasswordLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/admin-change-password-request', 
        { 
          currentPassword: passwordForm.oldPassword,
          newPassword: passwordForm.newPassword,
          confirmPassword: passwordForm.confirmPassword
        }, 
        { withCredentials: true }
      );
      if (res.data.success) {
        setPasswordStep(2);
        setPasswordSuccess('Verification code sent to your email. Please check your inbox.');
      } else {
        setPasswordError(res.data.message || 'Failed to send verification code');
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to send verification code');
    }
    setPasswordLoading(false);
  };

  const handleChangePasswordConfirm = async (e) => {
    e.preventDefault();
    
    if (!passwordForm.otp) {
      setPasswordError('Verification code is required');
      return;
    }
    
    setPasswordError(''); setPasswordSuccess(''); setPasswordLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/admin-change-password-confirm', 
        { otp: passwordForm.otp }, 
        { withCredentials: true }
      );
      if (res.data.success) {
        setPasswordSuccess('Password changed successfully!');
        setTimeout(() => {
          setPasswordStep(1);
          setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '', otp: '' });
          setPasswordError(''); setPasswordSuccess('');
          setShowProfileDropdown(false);
        }, 2000);
      } else {
        setPasswordError(res.data.message || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    }
    setPasswordLoading(false);
  };

  const handlePasswordFormChange = (field, value) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
  };

  // Section navigation
  const scrollToSection = (sectionId) => {
    setShowProfileDropdown(false);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // User Management Functions
  const fetchUsers = async () => {
    setUserManagementLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/users', { withCredentials: true });
      if (response.data.success) {
        setUsers(response.data.users);
        setUserManagementError('');
      } else {
        setUserManagementError(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        setUserManagementError('Authentication failed. Please try logging in again.');
      } else {
        setUserManagementError(error.response?.data?.message || 'Failed to fetch users');
      }
    } finally {
      setUserManagementLoading(false);
    }
  };

  const fetchInvites = async () => {
    setUserManagementLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/invites', { withCredentials: true });
      if (response.data.success) {
        setInvites(response.data.invites);
      } else {
        setUserManagementError(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
      setUserManagementError('Failed to fetch invites');
    } finally {
      setUserManagementLoading(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setSubmittingInvite(true);
    setUserManagementError('');
    setUserManagementSuccess('');

    try {
      const response = await axios.post('http://localhost:5000/api/invites', inviteForm, { withCredentials: true });
      
      if (response.data.success) {
        setUserManagementSuccess('Invitation sent successfully!');
        setInviteForm({ email: '', firstName: '', lastName: '', role: 'manager' });
        if (userManagementTab === 'invites') {
          fetchInvites();
        }
      } else {
        setUserManagementError(response.data.message);
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      setUserManagementError(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/invites/${inviteId}/resend`, {}, { withCredentials: true });
      
      if (response.data.success) {
        setUserManagementSuccess('Invitation resent successfully!');
        fetchInvites();
      } else {
        setUserManagementError(response.data.message);
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      setUserManagementError(error.response?.data?.message || 'Failed to resend invitation');
    }
  };

  // Manager Password Change Functions
  const fetchManagers = async () => {
    setManagerPasswordLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/users', { withCredentials: true });
      if (response.data.success) {
        const managerUsers = response.data.users.filter(user => user.role !== 'admin');
        setManagers(managerUsers);
      } else {
        setManagerPasswordError(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setManagerPasswordError('Failed to fetch users');
    } finally {
      setManagerPasswordLoading(false);
    }
  };

  const handleManagerPasswordSubmit = async (e) => {
    e.preventDefault();
    setManagerPasswordError('');
    setManagerPasswordLoading(true);

    if (managerNewPassword !== managerConfirmPassword) {
      setManagerPasswordError('Passwords do not match');
      setManagerPasswordLoading(false);
      return;
    }

    if (managerNewPassword.length < 8) {
      setManagerPasswordError('Password must be at least 8 characters long');
      setManagerPasswordLoading(false);
      return;
    }

    if (!selectedManager) {
      setManagerPasswordError('Please select a manager');
      setManagerPasswordLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/manager/change-password/request', {
        managerEmail: selectedManager,
        newPassword: managerNewPassword
      }, { withCredentials: true });

      if (response.data.success) {
        setManagerPasswordStep(2);
        setManagerPasswordSuccess('Verification code sent to your email. Please check your inbox.');
      } else {
        setManagerPasswordError(response.data.message);
      }
    } catch (error) {
      console.error('Error requesting password change:', error);
      setManagerPasswordError(error.response?.data?.message || 'Failed to request password change');
    } finally {
      setManagerPasswordLoading(false);
    }
  };

  const handleManagerOtpSubmit = async (e) => {
    e.preventDefault();
    setManagerPasswordError('');
    setManagerPasswordLoading(true);

    if (!managerOtp) {
      setManagerPasswordError('Please enter the verification code');
      setManagerPasswordLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/manager/change-password/confirm', {
        managerEmail: selectedManager,
        otp: managerOtp
      }, { withCredentials: true });

      if (response.data.success) {
        setManagerPasswordSuccess('Manager password changed successfully!');
        setTimeout(() => {
          setManagerPasswordStep(1);
          setSelectedManager('');
          setManagerNewPassword('');
          setManagerConfirmPassword('');
          setManagerOtp('');
          setManagerPasswordError('');
          setManagerPasswordSuccess('');
        }, 2000);
      } else {
        setManagerPasswordError(response.data.message);
      }
    } catch (error) {
      console.error('Error confirming password change:', error);
      setManagerPasswordError(error.response?.data?.message || 'Failed to verify code');
    } finally {
      setManagerPasswordLoading(false);
    }
  };

  const resetManagerPasswordForm = () => {
    setManagerPasswordStep(1);
    setManagerOtp('');
    setManagerPasswordError('');
    setManagerPasswordSuccess('');
  };

  // Load data when switching tabs
  useEffect(() => {
    if (userManagementTab === 'users') {
      fetchUsers();
    } else if (userManagementTab === 'invites') {
      fetchInvites();
    }
  }, [userManagementTab]);

  // Load managers on component mount
  useEffect(() => {
    fetchManagers();
    fetchUsers(); // Load users by default
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfileDropdown && !event.target.closest('.profile-dropdown')) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileDropdown]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="user-account-management-container">
      {/* Header */}
      <div className="management-header">
        <div className="header-content">
          <div className="header-left">
            <button 
              className="back-to-dashboard-btn"
              onClick={() => navigate('/admin-dashboard')}
            >
              ← Back to Dashboard
            </button>
            <h1 className="page-title">User & Account Management</h1>
          </div>
          <div className="profile-dropdown">
            <button 
              type="button" 
              className="profile-btn"
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            >
              Admin ▼
            </button>
            {showProfileDropdown && (
              <div className="dropdown-menu">
                <div className="dropdown-item" onClick={() => scrollToSection('user-management')}>
                  User Management
                </div>
                <div className="dropdown-item" onClick={() => scrollToSection('manage-account')}>
                  Change Password
                </div>
                <div className="dropdown-item" onClick={handleLogout}>
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Management Section */}
      <div id="user-management" className="management-section">
        <div className="section-header">
          <h2>User Management</h2>
          <p>Manage users, send invites, and handle pending invitations</p>
        </div>

        <div className="management-tabs">
          <button 
            className={`tab-btn ${userManagementTab === 'users' ? 'active' : ''}`}
            onClick={() => setUserManagementTab('users')}
          >
            Users ({users.length})
          </button>
          <button 
            className={`tab-btn ${userManagementTab === 'invite' ? 'active' : ''}`}
            onClick={() => setUserManagementTab('invite')}
          >
            Send Invite
          </button>
          <button 
            className={`tab-btn ${userManagementTab === 'invites' ? 'active' : ''}`}
            onClick={() => setUserManagementTab('invites')}
          >
            Pending Invites ({invites.length})
          </button>
        </div>

        <div className="management-content">
          {userManagementError && (
            <div className="error-message">
              {userManagementError}
              <button onClick={() => setUserManagementError('')}>×</button>
            </div>
          )}

          {userManagementSuccess && (
            <div className="success-message">
              {userManagementSuccess}
              <button onClick={() => setUserManagementSuccess('')}>×</button>
            </div>
          )}

          {userManagementTab === 'users' && (
            <div className="users-section">
              <h3>All Users</h3>
              {userManagementLoading ? (
                <div className="loading">Loading users...</div>
              ) : (
                <div className="users-table-wrapper">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td>{user.firstName} {user.lastName}</td>
                          <td>{user.email}</td>
                          <td><span className="role-badge">{user.role}</span></td>
                          <td>
                            <span className={`status-badge ${user.isActive ? 'active' : 'inactive'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>{formatDate(user.createdAt)}</td>
                        </tr>
                      ))}
                      {users.length === 0 && (
                        <tr>
                          <td colSpan="5" className="no-data">No users found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {userManagementTab === 'invite' && (
            <div className="invite-section">
              <h3>Send Manager Invitation</h3>
              <form onSubmit={handleInviteSubmit} className="invite-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={inviteForm.firstName}
                      onChange={(e) => setInviteForm({...inviteForm, firstName: e.target.value})}
                      required
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={inviteForm.lastName}
                      onChange={(e) => setInviteForm({...inviteForm, lastName: e.target.value})}
                      required
                      placeholder="Enter last name"
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({...inviteForm, email: e.target.value})}
                    required
                    placeholder="Enter email address"
                  />
                </div>
                
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={inviteForm.role}
                    onChange={(e) => setInviteForm({...inviteForm, role: e.target.value})}
                    required
                  >
                    <option value="manager">Manager</option>
                  </select>
                </div>

                <button type="submit" className="invite-btn" disabled={submittingInvite}>
                  {submittingInvite ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          )}

          {userManagementTab === 'invites' && (
            <div className="invites-section">
              <h3>Pending Invitations</h3>
              {userManagementLoading ? (
                <div className="loading">Loading invitations...</div>
              ) : (
                <div className="invites-table-wrapper">
                  <table className="management-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Invited By</th>
                        <th>Expires At</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map(invite => (
                        <tr key={invite.id}>
                          <td>{invite.firstName} {invite.lastName}</td>
                          <td>{invite.email}</td>
                          <td><span className="role-badge">{invite.role}</span></td>
                          <td>
                            <span className={`status-badge ${invite.status}`}>
                              {invite.status}
                            </span>
                          </td>
                          <td>{invite.invitedBy}</td>
                          <td>{formatDate(invite.expiresAt)}</td>
                          <td>
                            {invite.status === 'active' && (
                              <button 
                                className="resend-btn"
                                onClick={() => handleResendInvite(invite.id)}
                              >
                                Resend
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {invites.length === 0 && (
                        <tr>
                          <td colSpan="7" className="no-data">No pending invitations</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manage Account Section */}
      <div id="manage-account" className="management-section">
        <div className="section-header">
          <h2>Manage Account</h2>
          <p>Change your password and manage manager passwords</p>
        </div>

        <div className="account-content">
          <div className="account-section">
            <h3>Change Your Password</h3>
            <div className="change-password-form">
              {passwordStep === 1 ? (
                <form onSubmit={handleChangePasswordRequest}>
                  <div className="form-group">
                    <label>Current Password:</label>
                    <input
                      type="password"
                      value={passwordForm.oldPassword}
                      onChange={(e) => handlePasswordFormChange('oldPassword', e.target.value)}
                      required
                      placeholder="Enter your current password"
                    />
                  </div>
                  <div className="form-group">
                    <label>New Password:</label>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => handlePasswordFormChange('newPassword', e.target.value)}
                      required
                      placeholder="Enter new password (min 6 characters)"
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm New Password:</label>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => handlePasswordFormChange('confirmPassword', e.target.value)}
                      required
                      placeholder="Re-enter new password"
                    />
                  </div>
                  {passwordError && <div className="error-message">{passwordError}</div>}
                  {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
                  <button type="submit" disabled={passwordLoading} className="submit-btn">
                    {passwordLoading ? 'Validating & Sending Code...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleChangePasswordConfirm}>
                  <p style={{ marginBottom: '16px', color: '#666', fontSize: '14px' }}>
                    We've sent a verification code to your email. Please enter it below to complete the password change.
                  </p>
                  <div className="form-group">
                    <label>Verification Code:</label>
                    <input
                      type="text"
                      value={passwordForm.otp}
                      onChange={(e) => handlePasswordFormChange('otp', e.target.value)}
                      required
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                    />
                  </div>
                  {passwordError && <div className="error-message">{passwordError}</div>}
                  {passwordSuccess && <div className="success-message">{passwordSuccess}</div>}
                  <div className="form-actions">
                    <button type="submit" disabled={passwordLoading} className="submit-btn">
                      {passwordLoading ? 'Changing Password...' : 'Confirm Password Change'}
                    </button>
                    <button type="button" onClick={() => setPasswordStep(1)} className="back-btn">
                      Back
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="account-section">
            <h3>Change Manager Password</h3>
            <div className="manager-password-form">
              {managerPasswordStep === 1 ? (
                <form onSubmit={handleManagerPasswordSubmit}>
                  <div className="form-group">
                    <label>Select Manager</label>
                    <select
                      value={selectedManager}
                      onChange={(e) => setSelectedManager(e.target.value)}
                      required
                    >
                      <option value="">Choose a manager...</option>
                      {managers.map(user => (
                        <option key={user.id} value={user.email}>
                          {user.firstName} {user.lastName} ({user.email})
                        </option>
                      ))}
                    </select>
                    {managers.length === 0 && (
                      <p className="no-managers">No managers found. Send invitations to create manager accounts.</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label>New Password</label>
                    <input
                      type="password"
                      value={managerNewPassword}
                      onChange={(e) => setManagerNewPassword(e.target.value)}
                      placeholder="Enter new password (min 8 characters)"
                      required
                      minLength="8"
                    />
                  </div>

                  <div className="form-group">
                    <label>Confirm New Password</label>
                    <input
                      type="password"
                      value={managerConfirmPassword}
                      onChange={(e) => setManagerConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                      minLength="8"
                    />
                  </div>

                  {managerPasswordError && <div className="error-message">{managerPasswordError}</div>}
                  {managerPasswordSuccess && <div className="success-message">{managerPasswordSuccess}</div>}

                  <button type="submit" disabled={managerPasswordLoading || managers.length === 0} className="submit-btn">
                    {managerPasswordLoading ? 'Processing...' : 'Send Verification Code'}
                  </button>
                </form>
              ) : (
                <div>
                  <h4>Enter Verification Code</h4>
                  <div className="verification-info">
                    <p><strong>Manager:</strong> {managers.find(u => u.email === selectedManager)?.firstName} {managers.find(u => u.email === selectedManager)?.lastName}</p>
                    <p><strong>Email:</strong> {selectedManager}</p>
                    <p>A verification code has been sent to your admin email. Please enter it below to confirm the password change.</p>
                  </div>

                  <form onSubmit={handleManagerOtpSubmit}>
                    <div className="form-group">
                      <label>Verification Code</label>
                      <input
                        type="text"
                        value={managerOtp}
                        onChange={(e) => setManagerOtp(e.target.value)}
                        placeholder="Enter 6-digit code"
                        required
                        maxLength="6"
                        pattern="[0-9]{6}"
                      />
                    </div>

                    {managerPasswordError && <div className="error-message">{managerPasswordError}</div>}
                    {managerPasswordSuccess && <div className="success-message">{managerPasswordSuccess}</div>}

                    <div className="form-actions">
                      <button type="submit" disabled={managerPasswordLoading} className="submit-btn">
                        {managerPasswordLoading ? 'Verifying...' : 'Change Password'}
                      </button>
                      <button type="button" onClick={resetManagerPasswordForm} className="back-btn">
                        Back
                      </button>
                    </div>
                  </form>

                  <div className="security-note">
                    <p><small>🔒 The verification code expires in 5 minutes for security reasons.</small></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAccountManagement;