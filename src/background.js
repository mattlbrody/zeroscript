console.log('Zeroscript background service worker loaded');

chrome.runtime.onInstalled.addListener(() => {
  console.log('Zeroscript extension installed');
  
  chrome.storage.local.set({
    isRecording: false,
    transcriptHistory: [],
    settings: {
      autoRecord: false,
      language: 'en-US'
    }
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background received message:', request);
  
  switch (request.action) {
    case 'startRecording':
      handleStartRecording(sendResponse);
      break;
    case 'stopRecording':
      handleStopRecording(sendResponse);
      break;
    case 'getStatus':
      handleGetStatus(sendResponse);
      break;
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
  
  return true;
});

function handleStartRecording(sendResponse) {
  chrome.storage.local.set({ isRecording: true }, () => {
    console.log('Recording started');
    sendResponse({ success: true, message: 'Recording started' });
  });
}

function handleStopRecording(sendResponse) {
  chrome.storage.local.set({ isRecording: false }, () => {
    console.log('Recording stopped');
    sendResponse({ success: true, message: 'Recording stopped' });
  });
}

function handleGetStatus(sendResponse) {
  chrome.storage.local.get(['isRecording'], (result) => {
    sendResponse({ 
      success: true, 
      isRecording: result.isRecording || false 
    });
  });
}