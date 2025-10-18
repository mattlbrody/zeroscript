import React from 'react';
import './ScriptWindow.css';

function ScriptWindow({ scriptText, mode = 'script', onDiagnosisAnswer }) {
  const renderContent = () => {
    // In diagnosis mode, just show the question text without buttons
    // (buttons are now in the widget controls area)
    if (mode === 'diagnosis') {
      return (
        <div className="script-text diagnosis-question">
          {scriptText}
        </div>
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