import React from 'react';
import './IntentAlert.css';

const IntentAlert = ({ intentName, scriptText, isVisible, onDismiss }) => {
  if (!isVisible || !intentName || !scriptText) {
    return null;
  }

  return (
    <div className="intent-alert-overlay">
      <div className="intent-alert-box">
        <button className="intent-alert-dismiss" onClick={onDismiss} aria-label="Dismiss alert">
          ×
        </button>
        <div className="intent-alert-header">
          <h3 className="intent-alert-title">{intentName}</h3>
        </div>
        <div className="intent-alert-content">
          <p className="intent-alert-script">{scriptText}</p>
        </div>
      </div>
    </div>
  );
};

export default IntentAlert;