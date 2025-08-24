import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import FloatingWidgetContent from './components/FloatingWidgetContent.js';

console.log('Zeroscript content script initializing...');

let root = null;
let appContainer = null;

// Function to check authentication status
async function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['user'], (result) => {
      resolve(!!result.user);
    });
  });
}

// Function to inject the widget
async function injectWidget() {
  const isAuthenticated = await checkAuthStatus();
  
  if (!isAuthenticated) {
    console.log('User not authenticated, widget will not be shown');
    removeWidget();
    return;
  }

  // Check if widget already exists
  if (document.getElementById('zeroscript-extension-root')) {
    console.log('Zeroscript widget already exists on this page');
    return;
  }

  // Create a container div for our React app
  appContainer = document.createElement('div');
  appContainer.id = 'zeroscript-extension-root';
  
  // Ensure container doesn't interfere with positioning
  appContainer.style.position = 'fixed';
  appContainer.style.top = '0';
  appContainer.style.left = '0';
  appContainer.style.width = '0';
  appContainer.style.height = '0';
  appContainer.style.zIndex = '2147483647';
  
  // Inject the app container at the end of body
  document.body.appendChild(appContainer);
  
  console.log('Zeroscript widget container created');

  // Render the React app
  root = ReactDOM.createRoot(appContainer);
  root.render(
    <React.StrictMode>
      <FloatingWidgetContent />
    </React.StrictMode>
  );
  
  console.log('Zeroscript FloatingWidget rendered');
}

// Function to remove the widget
function removeWidget() {
  if (root) {
    root.unmount();
    root = null;
  }
  if (appContainer && appContainer.parentNode) {
    appContainer.parentNode.removeChild(appContainer);
    appContainer = null;
  }
  console.log('Zeroscript widget removed');
}

// Listen for auth state changes from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  switch (request.action) {
    case 'authStateChanged':
      if (request.isAuthenticated) {
        injectWidget();
      } else {
        removeWidget();
      }
      sendResponse({ success: true });
      break;
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

// Listen for storage changes (login/logout)
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.user) {
    if (changes.user.newValue) {
      console.log('User logged in, showing widget');
      injectWidget();
    } else {
      console.log('User logged out, hiding widget');
      removeWidget();
    }
  }
});

// Wait for DOM to be ready and check initial auth state
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectWidget);
} else {
  // DOM is already loaded
  injectWidget();
}

// Keep the existing audio capture functionality
let mediaRecorder = null;
let audioChunks = [];

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