import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/UserManagementModal.css';

// Configure axios defaults for credentials
axios.defaults.withCredentials = true;

const UserManagementModal = ({ isVisible, onClose }) => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'manager'
  });
  const [submitting, setSubmitting] = useState(false);
  const [previewUsername, setPreviewUsername] = useState('');
  const [previewingUsername, setPreviewingUsername] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Debug: Test authentication first
      const testAuth = async () => {
        try {
          const debugResponse = await axios.get('http://localhost:5000/api/debug-auth', {
            withCredentials: true
          });
          console.log('Debug auth response:', debugResponse.data);
        } catch (error) {
          console.error('Debug auth error:', error);
        }
      };
      
      testAuth();
      
      if (activeTab === 'users') {
        fetchUsers();
      } else if (activeTab === 'invites') {
        fetchInvites();
      }
    }
  }, [isVisible, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/users', {
        withCredentials: true
      });
      if (response.data.success) {
        setUsers(response.data.users);
        setError(''); // Clear any previous errors
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      if (error.response?.status === 401) {
        setError('Authentication failed. Please try logging in again.');
      } else {
        setError(error.response?.data?.message || 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchInvites = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/invites', {
        withCredentials: true
      });
      if (response.data.success) {
        setInvites(response.data.invites);
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching invites:', error);
      setError('Failed to fetch invites');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewUsername = async () => {
    if (!inviteForm.firstName.trim() || !inviteForm.lastName.trim()) {
      setError('First name and last name are required to preview username');
      return;
    }

    setPreviewingUsername(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:5000/api/generate-username', {
        firstName: inviteForm.firstName,
        lastName: inviteForm.lastName
      }, {
        withCredentials: true
      });

      if (response.data.success) {
        setPreviewUsername(response.data.username);
      } else {
        setError(response.data.message || 'Failed to generate username preview');
      }
    } catch (error) {
      console.error('Error previewing username:', error);
      setError(error.response?.data?.message || 'Failed to preview username');
    } finally {
      setPreviewingUsername(false);
    }
  };

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('http://localhost:5000/api/invites', inviteForm, {
        withCredentials: true
      });
      
      if (response.data.success) {
        const username = response.data.username;
        setSuccess(`Invitation sent successfully! Username generated: ${username}`);
        setInviteForm({ email: '', firstName: '', lastName: '', role: 'manager' });
        setPreviewUsername(''); // Clear preview
        // Refresh invites if on that tab
        if (activeTab === 'invites') {
          fetchInvites();
        }
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      setError(error.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (inviteId) => {
    try {
      const response = await axios.post(`http://localhost:5000/api/invites/${inviteId}/resend`, {}, {
        withCredentials: true
      });
      
      if (response.data.success) {
        setSuccess('Invitation resent successfully!');
        fetchInvites(); // Refresh invites
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Error resending invite:', error);
      setError(error.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (!isVisible) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="user-management-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>User Management</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            Users ({users.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'invite' ? 'active' : ''}`}
            onClick={() => setActiveTab('invite')}
          >
            Send Invite
          </button>
          <button 
            className={`tab-btn ${activeTab === 'invites' ? 'active' : ''}`}
            onClick={() => setActiveTab('invites')}
          >
            Pending Invites ({invites.length})
          </button>
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

          {activeTab === 'users' && (
            <div className="users-tab">
              <h3>All Users</h3>
              {loading ? (
                <div className="loading">Loading users...</div>
              ) : (
                <div className="users-table-wrapper">
                  <table className="users-table">
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
                          <td className="role-badge">{user.role}</td>
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

          {activeTab === 'invite' && (
            <div className="invite-tab">
              <h3>Send Manager Invitation</h3>
              <form onSubmit={handleInviteSubmit} className="invite-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      value={inviteForm.firstName}
                      onChange={(e) => {
                        setInviteForm({...inviteForm, firstName: e.target.value});
                        setPreviewUsername(''); // Clear preview when name changes
                      }}
                      required
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      value={inviteForm.lastName}
                      onChange={(e) => {
                        setInviteForm({...inviteForm, lastName: e.target.value});
                        setPreviewUsername(''); // Clear preview when name changes
                      }}
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

                <div className="form-group">
                  <label>Username Preview</label>
                  <div className="username-preview-section">
                    <button 
                      type="button" 
                      className="preview-btn" 
                      onClick={handlePreviewUsername}
                      disabled={previewingUsername || !inviteForm.firstName.trim() || !inviteForm.lastName.trim()}
                    >
                      {previewingUsername ? 'Generating...' : 'Preview Username'}
                    </button>
                    {previewUsername && (
                      <div className="username-preview">
                        <span className="username-text">Username: <strong>{previewUsername}</strong></span>
                        <small className="username-note">This username will be assigned when the invite is sent.</small>
                      </div>
                    )}
                  </div>
                </div>

                <button type="submit" className="invite-btn" disabled={submitting}>
                  {submitting ? 'Sending Invite...' : 'Send Invitation'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'invites' && (
            <div className="invites-tab">
              <h3>Pending Invitations</h3>
              {loading ? (
                <div className="loading">Loading invitations...</div>
              ) : (
                <div className="invites-table-wrapper">
                  <table className="invites-table">
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
                          <td className="role-badge">{invite.role}</td>
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
    </div>
  );
};

export default UserManagementModal;