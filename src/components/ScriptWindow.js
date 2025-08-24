import React from 'react';
import './ScriptWindow.css';

function ScriptWindow({ scriptText }) {
  const hasScript = scriptText && scriptText.trim().length > 0;

  return (
    <div className="script-window">
      <div className={`script-text ${!hasScript ? 'placeholder' : ''}`}>
        {hasScript ? scriptText : 'Listening...'}
      </div>
    </div>
  );
}

export default ScriptWindow;