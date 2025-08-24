import React from 'react';

const RecordButton = ({ isRecording, onToggle }) => {
  return (
    <button 
      className={`record-btn ${isRecording ? 'recording' : ''}`}
      onClick={onToggle}
      aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
    >
      <span className="record-icon">
        {isRecording ? '⏹' : '🎙️'}
      </span>
      <span className="record-text">
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </span>
    </button>
  );
};

export default RecordButton;