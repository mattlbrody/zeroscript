import React from 'react';
import './ObjectionsPanel.css';

const ObjectionsPanel = ({ onObjectionSelect, activeObjection }) => {
  const objections = [
    { id: 'price', label: 'Price', icon: '$' },
    { id: 'skepticism', label: 'Skepticism', icon: '?' },
    { id: 'timeline', label: 'Timeline', icon: '⏱' },
    { id: 'think', label: 'I need to think about it', icon: '💭' },
    { id: 'spouse', label: 'Talk to spouse', icon: '👥' },
    { id: 'research', label: 'Need to research', icon: '🔍' },
    { id: 'busy', label: 'Too busy', icon: '📅' },
    { id: 'notInterested', label: 'Not interested', icon: '✋' }
  ];

  return (
    <div className="objections-panel">
      <div className="objections-header">
        <h3>Quick Rebuttals</h3>
      </div>
      <div className="objections-list">
        {objections.map((objection) => (
          <button
            key={objection.id}
            className={`objection-button ${activeObjection === objection.id ? 'active' : ''}`}
            onClick={() => onObjectionSelect(objection.id)}
            title={`Handle ${objection.label} objection`}
          >
            <span className="objection-icon">{objection.icon}</span>
            <span className="objection-label">{objection.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ObjectionsPanel;