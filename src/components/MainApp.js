import React from 'react';
import { useAuth } from '../context/AuthContext';
import './MainApp.css';

const MainApp = () => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="main-app-container">
      <div className="main-app-header">
        <h1>Welcome, {user?.email}!</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
      
      <div className="main-app-content">
        <div className="info-card">
          <h2>Agent Dashboard</h2>
          <p>You are successfully logged in to the Chrome Extension.</p>
          
          <div className="user-info">
            <h3>User Information</h3>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Last Sign In:</strong> {user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainApp;