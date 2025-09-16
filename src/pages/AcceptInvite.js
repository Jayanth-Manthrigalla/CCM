import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/AcceptInvite.css';

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [invite, setInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setLoading(false);
      return;
    }

    const validateToken = async () => {
      try {
        const response = await axios.get(`http://localhost:5000/api/validate-invite?token=${token}`);
        if (response.data.success) {
          setInvite(response.data.invite);
        } else {
          setError(response.data.message);
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setError('Invalid or expired invitation link');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Validate passwords
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setSubmitting(false);
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setSubmitting(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:5000/api/accept-invite', {
        token: token,
        password: formData.password
      });

      if (response.data.success) {
        // Show success message and redirect to login
        alert('Account created successfully! You can now log in with your credentials.');
        navigate('/admin/login');
      } else {
        setError(response.data.message);
      }
    } catch (error) {
      console.error('Accept invitation error:', error);
      setError(error.response?.data?.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="accept-invite-container">
        <div className="accept-invite-card">
          <div className="loading-spinner"></div>
          <p>Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="accept-invite-container">
        <div className="accept-invite-card error">
          <div className="error-icon">⚠️</div>
          <h2>Invalid Invitation</h2>
          <p>{error}</p>
          <button 
            className="btn-primary"
            onClick={() => navigate('/')}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="accept-invite-container">
      <div className="accept-invite-card">
        <div className="header">
          <h1>Accept Invitation</h1>
          <p>Complete your account setup</p>
        </div>

        {invite && (
          <div className="invite-details">
            <p><strong>Name:</strong> {invite.firstName} {invite.lastName}</p>
            <p><strong>Email:</strong> {invite.email}</p>
            <p><strong>Role:</strong> {invite.role}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="accept-invite-form">
          <div className="form-group">
            <label htmlFor="password">Create Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password (min 8 characters)"
              required
              minLength="8"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              minLength="8"
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="security-note">
          <p><small>🔒 This invitation link expires in 5 minutes for security reasons.</small></p>
        </div>
      </div>
    </div>
  );
};

export default AcceptInvite;