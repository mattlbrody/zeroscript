import { createClient } from '@deepgram/sdk';

const deepgramApiKey = process.env.REACT_APP_DEEPGRAM_API_KEY || '';

let deepgram = null;
let liveTranscription = null;

export const initializeDeepgram = () => {
  if (!deepgramApiKey) {
    console.error('Deepgram API key is not configured');
    return null;
  }
  
  deepgram = createClient(deepgramApiKey);
  return deepgram;
};

export const startLiveTranscription = async (onTranscript, onError) => {
  try {
    if (!deepgram) {
      deepgram = initializeDeepgram();
    }
    
    const connection = deepgram.listen.live({
      language: 'en-US',
      punctuate: true,
      smart_format: true,
      model: 'nova-2',
      interim_results: true,
      endpointing: 300,
    });
    
    connection.on('open', () => {
      console.log('Deepgram connection opened');
    });
    
    connection.on('transcript', (data) => {
      const transcript = data.channel.alternatives[0].transcript;
      if (transcript && onTranscript) {
        onTranscript(transcript, data.is_final);
      }
    });
    
    connection.on('error', (error) => {
      console.error('Deepgram error:', error);
      if (onError) onError(error);
    });
    
    connection.on('close', () => {
      console.log('Deepgram connection closed');
    });
    
    liveTranscription = connection;
    return connection;
  } catch (error) {
    console.error('Error starting live transcription:', error);
    if (onError) onError(error);
    return null;
  }
};

export const stopLiveTranscription = () => {
  if (liveTranscription) {
    liveTranscription.finish();
    liveTranscription = null;
    console.log('Live transcription stopped');
  }
};

export const sendAudioToDeepgram = (audioData) => {
  if (liveTranscription && liveTranscription.getReadyState() === 1) {
    liveTranscription.send(audioData);
  }
};