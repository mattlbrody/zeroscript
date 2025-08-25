import React from 'react';
import './ScriptWindow.css';

function ScriptWindow({ scriptText, mode = 'script', onDiagnosisAnswer }) {
  const renderContent = () => {
    if (mode === 'diagnosis') {
      return (
        <>
          <div className="script-text diagnosis-question">
            {scriptText}
          </div>
          <div className="diagnosis-buttons-container">
            <button 
              className="diagnosis-button diagnosis-yes"
              onClick={() => onDiagnosisAnswer(true)}
            >
              [ Yes ]
            </button>
            <button 
              className="diagnosis-button diagnosis-no"
              onClick={() => onDiagnosisAnswer(false)}
            >
              [ No ]
            </button>
          </div>
        </>
      );
    }
    
    // Default script mode
    const hasScript = scriptText && scriptText.trim().length > 0;
    return (
      <div className={`script-text ${!hasScript ? 'placeholder' : ''}`}>
        {hasScript ? scriptText : 'Listening...'}
      </div>
    );
  };

  return (
    <div className="script-window">
      {renderContent()}
    </div>
  );
}

export default ScriptWindow;