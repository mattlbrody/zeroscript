import React from 'react';

const ConnectionStatus = ({ isConnected, service = 'System' }) => {
  return (
    <div className="status-indicator">
      <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
      <span className="status-text">
        {service}: {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
};

export default ConnectionStatus;