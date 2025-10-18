import React from 'react';
import './DynamicStatusBar.css';

const DynamicStatusBar = ({ status }) => {
  if (!status || !status.type) {
    return (
      <div className="dynamic-status-bar status-idle">
        <span className="status-icon">[ ● ]</span>
        <span className="status-text">Listening...</span>
      </div>
    );
  }

  const renderStatusContent = () => {
    switch (status.type) {
      case 'phase':
        return (
          <div className="dynamic-status-bar status-phase">
            <span className="status-icon">[ {status.data?.current || 1}/{status.data?.total || 6} ]</span>
            <span className="status-text">
              {status.data?.name || 'Unknown Phase'}
            </span>
          </div>
        );
      
      case 'stage':
        return (
          <div className="dynamic-status-bar status-stage">
            <span className="status-icon">[ {status.data?.number || 1}/9 ]</span>
            <span className="status-text">
              {status.data?.name || 'Unknown'}: {status.data?.description || ''}
            </span>
          </div>
        );

      case 'question':
        return (
          <div className="dynamic-status-bar status-question">
            <span className="status-icon">[ ? ]</span>
            <span className="status-text">
              Customer Question: {status.data?.topic || 'Unknown'}
            </span>
          </div>
        );

      case 'objection':
        return (
          <div className="dynamic-status-bar status-objection">
            <span className="status-icon">[ ! ]</span>
            <span className="status-text">
              Customer Objection: {status.data?.topic || 'Unknown'}
            </span>
          </div>
        );

      case 'diagnosis':
        return (
          <div className="dynamic-status-bar status-diagnosis">
            <span className="status-icon">
              [ {status.data?.currentStep || 1} / {status.data?.totalSteps || 7} ]
            </span>
            <span className="status-text">Guided Diagnosis</span>
          </div>
        );

      case 'connecting':
        return (
          <div className="dynamic-status-bar status-connecting">
            <span className="status-icon">[ ⟳ ]</span>
            <span className="status-text">
              {status.data?.message || 'Connecting...'}
            </span>
          </div>
        );

      case 'listening':
        return (
          <div className="dynamic-status-bar status-listening">
            <span className="status-icon">[ ● ]</span>
            <span className="status-text">
              {status.data?.message || 'Listening to call...'}
            </span>
          </div>
        );

      case 'idle':
      default:
        return (
          <div className="dynamic-status-bar status-idle">
            <span className="status-icon">[ ○ ]</span>
            <span className="status-text">Ready</span>
          </div>
        );
    }
  };

  return renderStatusContent();
};

export default DynamicStatusBar;