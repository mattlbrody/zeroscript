import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { supabase } from '../supabaseClient.js';
import './Auth.css';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const { signIn, error: authError } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    if (!email || !password) {
      setLoginError('Please enter both email and password');
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    
    if (error) {
      setLoginError(error);
    }
    
    setIsLoading(false);
  };

  // Check if Supabase is configured
  if (!supabase) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h2 className="auth-title">Configuration Error</h2>
          <div className="error-message" style={{ marginTop: '20px' }}>
            <p>Supabase is not configured. Please ensure you have:</p>
            <ol style={{ textAlign: 'left', marginTop: '10px' }}>
              <li>Created a .env.local file in the project root</li>
              <li>Added REACT_APP_SUPABASE_URL=your_supabase_url</li>
              <li>Added REACT_APP_SUPABASE_ANON_KEY=your_anon_key</li>
              <li>Rebuilt the extension (npm run build)</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">Agent Login</h2>
        {authError && (
          <div className="error-message" style={{ marginBottom: '15px' }}>
            {authError}
          </div>
        )}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="form-input"
              disabled={isLoading}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="form-input"
              disabled={isLoading}
              required
            />
          </div>

          {loginError && (
            <div className="error-message">
              {loginError}
            </div>
          )}

          <button 
            type="submit" 
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;