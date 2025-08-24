import React from 'react';

const CoachingInsights = ({ insights = [] }) => {
  return (
    <div className="coaching-section">
      <h3>Coaching Insights</h3>
      <div className="insights-box">
        {insights.length === 0 ? (
          <p className="placeholder-text">
            Real-time coaching feedback will appear here...
          </p>
        ) : (
          <ul className="insights-list">
            {insights.map((insight, index) => (
              <li key={index} className={`insight-item ${insight.type}`}>
                <span className="insight-icon">
                  {insight.type === 'tip' && '💡'}
                  {insight.type === 'warning' && '⚠️'}
                  {insight.type === 'success' && '✅'}
                </span>
                <span className="insight-text">{insight.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CoachingInsights;