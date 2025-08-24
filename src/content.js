console.log('Zeroscript content script loaded on:', window.location.href);

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