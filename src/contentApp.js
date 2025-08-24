import React from 'react';
import ReactDOM from 'react-dom/client';
import FloatingWidgetContent from './components/FloatingWidgetContent.js';

console.log('Zeroscript content script initializing...');

// Function to inject the widget
function injectWidget() {
  // Check if widget already exists
  if (document.getElementById('zeroscript-extension-root')) {
    console.log('Zeroscript widget already exists on this page');
    return;
  }

  // Create a container div for our React app
  const app = document.createElement('div');
  app.id = 'zeroscript-extension-root';
  
  // Ensure the container doesn't interfere with page layout
  // Remove pointer-events: none to allow interaction with the widget
  
  // Inject the app container at the end of body
  document.body.appendChild(app);
  
  console.log('Zeroscript widget container created');

  // Render the React app
  const root = ReactDOM.createRoot(app);
  root.render(
    <React.StrictMode>
      <FloatingWidgetContent />
    </React.StrictMode>
  );
  
  console.log('Zeroscript FloatingWidget rendered');
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectWidget);
} else {
  // DOM is already loaded
  injectWidget();
}

// Keep the existing audio capture functionality
let mediaRecorder = null;
let audioChunks = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  switch (request.action) {
    case 'startCapture':
      startAudioCapture(sendResponse);
      break;
    case 'stopCapture':
      stopAudioCapture(sendResponse);
      break;
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true;
});

async function startAudioCapture(sendResponse) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100
      } 
    });
    
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      console.log('Audio recording complete, size:', audioBlob.size);
    };
    
    mediaRecorder.start(1000);
    console.log('Audio capture started');
    sendResponse({ success: true, message: 'Audio capture started' });
  } catch (error) {
    console.error('Error starting audio capture:', error);
    sendResponse({ success: false, error: error.message });
  }
}

function stopAudioCapture(sendResponse) {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    console.log('Audio capture stopped');
    sendResponse({ success: true, message: 'Audio capture stopped' });
  } else {
    sendResponse({ success: false, error: 'No active recording' });
  }
}

console.log('Zeroscript content script loaded on:', window.location.href);