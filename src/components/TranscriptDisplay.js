import React from 'react';

const TranscriptDisplay = ({ transcript, isLoading }) => {
  return (
    <div className="transcript-section">
      <h3>Live Transcript</h3>
      <div className="transcript-box">
        {isLoading && <div className="loading-indicator">Processing audio...</div>}
        {!isLoading && !transcript && (
          <p className="placeholder-text">
            Transcript will appear here when recording starts...
          </p>
        )}
        {!isLoading && transcript && (
          <div className="transcript-content">{transcript}</div>
        )}
      </div>
    </div>
  );
};

export default TranscriptDisplay;