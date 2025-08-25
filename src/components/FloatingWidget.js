import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FloatingWidget.css';
import ScriptWindow from './ScriptWindow.js';
import DynamicStatusBar from './DynamicStatusBar.js';
import { createClient } from '@deepgram/sdk';
import { supabase } from '../supabaseClient.js';

const FloatingWidget = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: window.innerHeight - 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSampleScript, setShowSampleScript] = useState(true);
  const [currentScript, setCurrentScript] = useState("");
  const [currentStatus, setCurrentStatus] = useState({ type: 'idle', data: {} });
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagnosisStep, setDiagnosisStep] = useState(0);
  const [diagnosisAnswers, setDiagnosisAnswers] = useState([]);
  const [showingResponse, setShowingResponse] = useState(false);
  
  // Real-time call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [deepgramConnection, setDeepgramConnection] = useState(null);
  const [deepgramToken, setDeepgramToken] = useState(null);
  const [transcriptBuffer, setTranscriptBuffer] = useState('');
  const [isProcessingScript, setIsProcessingScript] = useState(false);
  const [error, setError] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  
  const widgetRef = useRef(null);
  const transcriptTimeoutRef = useRef(null);
  const [sessionToken, setSessionToken] = useState(null);

  // Diagnosis questions
  const DIAGNOSIS_QUESTIONS = [
    "Are there any incorrectly spelled names?",
    "Are there any old or incorrect addresses?",
    "Are there any late payments?",
    "Are there any charge-offs?",
    "Are there any collections?",
    "Are there any hard inquiries?",
    "Is there a bankruptcy?"
  ];

  // Scripted responses for Yes answers
  const DIAGNOSIS_RESPONSES = [
    "I see there are incorrect name spellings on your report. This is actually great news - these are often the easiest items to dispute and have removed. We'll send letters to the bureaus requesting verification of the correct spelling.",
    "Old or incorrect addresses can impact your credit. We'll dispute these with all three bureaus to ensure your report only shows current, accurate information.",
    "Late payments significantly impact your score. We'll work to verify these were reported accurately and dispute any that can't be properly validated by the creditor.",
    "Charge-offs are serious but not permanent. We'll request full verification from the original creditor and dispute any inaccuracies in how they're reported.",
    "Collection accounts can be removed if the collector can't validate the debt. We'll demand full verification and dispute aggressively on your behalf.",
    "Hard inquiries should only appear when you authorized them. We'll identify and dispute any unauthorized inquiries to clean up this section of your report.",
    "Bankruptcy is serious, but we can still help ensure it's reported accurately and work on rebuilding your credit profile around it."
  ];

  // Helper function to check if session is expired
  const isSessionExpired = (session) => {
    if (!session || !session.expires_at) return true;
    
    // Check if session expires in less than 5 minutes
    const expiresAt = new Date(session.expires_at * 1000);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;
    
    return (expiresAt - now) < fiveMinutes;
  };

  // Get session from Supabase or Chrome storage with automatic refresh
  const getSession = async (forceRefresh = false) => {
    try {
      // First try to get from Supabase directly
      if (supabase) {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        // If we have a session but it might be expired, try to refresh it
        if (session && (forceRefresh || isSessionExpired(session))) {
          console.log('Session might be expired, attempting refresh...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Failed to refresh session:', refreshError);
            // Clear invalid session from storage
            if (chrome?.storage?.local) {
              chrome.storage.local.remove(['user', 'session']);
            }
            return null;
          }
          
          if (refreshedSession) {
            // Update Chrome storage with refreshed session
            if (chrome?.storage?.local) {
              chrome.storage.local.set({ 
                session: refreshedSession,
                user: refreshedSession.user 
              });
            }
            return refreshedSession;
          }
        }
        
        if (session) {
          return session;
        }
      }
      
      // If not available, try Chrome storage (for content script)
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get(['session'], (result) => {
            if (result.session) {
              // Check if stored session is expired
              if (isSessionExpired(result.session)) {
                console.log('Stored session is expired');
                chrome.storage.local.remove(['user', 'session']);
                resolve(null);
              } else {
                resolve(result.session);
              }
            } else {
              resolve(null);
            }
          });
        });
      }
      
      return null;
    } catch (err) {
      console.error('Error getting session:', err);
      return null;
    }
  };

  // Load saved position from localStorage on mount and set up session refresh
  useEffect(() => {
    const savedPosition = localStorage.getItem('zeroscript-widget-position');
    if (savedPosition) {
      try {
        const parsed = JSON.parse(savedPosition);
        setPosition(parsed);
      } catch (e) {
        console.error('Failed to parse saved widget position:', e);
      }
    }
    
    // Check for session on mount
    getSession().then(session => {
      if (session) {
        setSessionToken(session.access_token);
      }
    });
    
    // Set up periodic session refresh every 30 minutes to prevent expiration
    const refreshInterval = setInterval(async () => {
      const session = await getSession();
      if (session && isSessionExpired(session)) {
        console.log('Proactively refreshing session to prevent expiration...');
        const refreshedSession = await getSession(true);
        if (refreshedSession) {
          setSessionToken(refreshedSession.access_token);
        }
      }
    }, 30 * 60 * 1000); // 30 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  // Save position to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('zeroscript-widget-position', JSON.stringify(position));
  }, [position]);

  // Handle mouse down on drag handle
  const handleMouseDown = (e) => {
    if (e.target.closest('.widget-header')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
      e.preventDefault();
    }
  };

  // Handle mouse move while dragging
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Get widget dimensions
        const widgetWidth = isCollapsed ? 280 : 400;
        const widgetHeight = isCollapsed ? 40 : 500;
        
        // Keep widget within viewport boundaries
        const boundedX = Math.max(0, Math.min(window.innerWidth - widgetWidth, newX));
        const boundedY = Math.max(0, Math.min(window.innerHeight - widgetHeight, newY));
        
        setPosition({ x: boundedX, y: boundedY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, isCollapsed]);

  // Toggle collapsed/expanded state
  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
    
    // Adjust position if widget would go off-screen when expanding
    if (!isCollapsed) return; // If collapsing, no adjustment needed
    
    const expandedWidth = 400;
    const expandedHeight = 500;
    
    setPosition(prev => ({
      x: Math.min(prev.x, window.innerWidth - expandedWidth),
      y: Math.min(prev.y, window.innerHeight - expandedHeight)
    }));
  };

  // Handle script update from diagnosis
  const handleScriptUpdate = (script) => {
    setCurrentScript(script);
    setShowSampleScript(false);
  };

  // Start diagnosis
  const handleStartDiagnosis = () => {
    setIsDiagnosing(true);
    setDiagnosisStep(0);
    setDiagnosisAnswers([]);
    setShowingResponse(false);
    setCurrentScript(DIAGNOSIS_QUESTIONS[0]);
    setShowSampleScript(false);
    setCurrentStatus({
      type: 'diagnosis',
      data: { 
        currentStep: 1,
        totalSteps: DIAGNOSIS_QUESTIONS.length,
        question: DIAGNOSIS_QUESTIONS[0]
      }
    });
  };

  // Handle Yes/No answers during diagnosis
  const handleDiagnosisAnswer = (answer) => {
    if (showingResponse) {
      // If we're showing a response, clicking either button moves to next question
      moveToNextQuestion();
      return;
    }

    const newAnswers = [...diagnosisAnswers, { question: diagnosisStep, answer }];
    setDiagnosisAnswers(newAnswers);
    
    if (answer) {
      // User clicked Yes - show the scripted response
      setCurrentScript(DIAGNOSIS_RESPONSES[diagnosisStep]);
      setShowingResponse(true);
    } else {
      // User clicked No - move to next question immediately
      moveToNextQuestion();
    }
  };

  // Move to the next question or complete diagnosis
  const moveToNextQuestion = () => {
    setShowingResponse(false);
    
    if (diagnosisStep < DIAGNOSIS_QUESTIONS.length - 1) {
      // Move to next question
      const nextStep = diagnosisStep + 1;
      setDiagnosisStep(nextStep);
      setCurrentScript(DIAGNOSIS_QUESTIONS[nextStep]);
      setCurrentStatus({
        type: 'diagnosis',
        data: { 
          currentStep: nextStep + 1,
          totalSteps: DIAGNOSIS_QUESTIONS.length,
          question: DIAGNOSIS_QUESTIONS[nextStep]
        }
      });
    } else {
      // Diagnosis complete - generate final script based on answers
      const script = generateDiagnosisScript(diagnosisAnswers);
      setCurrentScript(script);
      setShowSampleScript(false);
      setIsDiagnosing(false);
      setCurrentStatus({ type: 'idle', data: {} });
    }
  };

  // Get Deepgram token from Edge Function with retry logic
  const getDeepgramToken = async (retryCount = 0) => {
    try {
      // Try to get session, refreshing if necessary
      let session = await getSession(retryCount > 0);
      
      if (!session) {
        throw new Error('No active session. Please log in through the extension popup.');
      }

      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/deepgram-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      // If we get a 401, try to refresh the session once
      if (response.status === 401 && retryCount === 0) {
        console.log('Got 401, attempting to refresh session and retry...');
        session = await getSession(true); // Force refresh
        
        if (session) {
          // Retry with refreshed token
          return getDeepgramToken(1);
        } else {
          throw new Error('Session expired. Please log in again through the extension popup.');
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to get Deepgram token: ${response.statusText}`);
      }

      const data = await response.json();
      // The API returns 'key' not 'token'
      return data.key || data.token;
    } catch (err) {
      console.error('Error getting Deepgram token:', err);
      setError(err.message);
      throw err;
    }
  };

  // Connect to Deepgram and start streaming
  const connectToDeepgram = async (token) => {
    try {
      console.log('[DEBUG] Requesting microphone access...');
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        } 
      });
      console.log('[DEBUG] Microphone access granted, stream:', stream);
      console.log('[DEBUG] Audio tracks:', stream.getAudioTracks());
      setAudioStream(stream);

      // Create Deepgram client
      console.log('[DEBUG] Creating Deepgram client with token:', token ? 'Token present' : 'No token');
      const deepgram = createClient(token);
      
      // Create live transcription connection with encoding specified
      console.log('[DEBUG] Creating live transcription connection...');
      const connection = deepgram.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        punctuate: true,
        encoding: 'webm-opus',  // Specify encoding for webm
        sample_rate: 16000,     // Match our getUserMedia sample rate
      });

      // Handle connection open
      connection.on('open', () => {
        console.log('[DEBUG] Deepgram WebSocket connection opened');
        console.log('[DEBUG] Connection ready state:', connection.getReadyState());
      });

      // Handle transcripts
      connection.on('transcript', (message) => {
        console.log('[DEBUG] Transcript received:', message);
        handleTranscript(message);
      });
      
      // Handle metadata
      connection.on('metadata', (metadata) => {
        console.log('[DEBUG] Deepgram metadata received:', metadata);
      });

      // Handle errors
      connection.on('error', (err) => {
        console.error('[DEBUG] Deepgram error:', err);
        setError('Transcription error occurred');
      });

      // Handle connection close
      connection.on('close', (code, reason) => {
        console.log('[DEBUG] Deepgram connection closed. Code:', code, 'Reason:', reason);
        // Stop the MediaRecorder if connection closes
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
          console.log('[DEBUG] Stopping MediaRecorder due to connection close');
          mediaRecorder.stop();
          setMediaRecorder(null);
        }
        // Clear keepalive
        if (connection.keepAliveInterval) {
          clearInterval(connection.keepAliveInterval);
        }
      });

      // Start media recorder to capture audio
      console.log('[DEBUG] Setting up MediaRecorder...');
      
      // Check for supported MIME types
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/ogg;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            console.warn('[DEBUG] No optimal MIME type supported, using default');
            mimeType = undefined; // Let browser choose
          }
        }
      }
      console.log('[DEBUG] Using MIME type:', mimeType || 'browser default');
      
      const recorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, recorderOptions);

      let chunkCount = 0;
      recorder.ondataavailable = async (event) => {
        chunkCount++;
        console.log(`[DEBUG] Audio chunk #${chunkCount} - Size: ${event.data.size} bytes, Ready state: ${connection.getReadyState()}`);
        if (event.data.size > 0 && connection.getReadyState() === 1) {
          // Send the blob directly - the SDK should handle it
          try {
            // The Deepgram SDK expects the blob/data directly
            connection.send(event.data);
            console.log(`[DEBUG] Sent audio chunk #${chunkCount} to Deepgram (${event.data.size} bytes as Blob)`);
          } catch (err) {
            console.error(`[DEBUG] Error sending chunk #${chunkCount}:`, err);
          }
        } else if (connection.getReadyState() !== 1) {
          console.warn(`[DEBUG] Cannot send audio - WebSocket not ready. State: ${connection.getReadyState()}`);
          // Stop recording if connection is closed
          if (connection.getReadyState() === 3 && recorder.state !== 'inactive') {
            console.log('[DEBUG] Stopping recorder - connection closed');
            recorder.stop();
          }
        }
      };

      recorder.onerror = (error) => {
        console.error('[DEBUG] MediaRecorder error:', error);
      };

      recorder.onstart = () => {
        console.log('[DEBUG] MediaRecorder started');
      };

      recorder.onstop = () => {
        console.log('[DEBUG] MediaRecorder stopped');
      };

      console.log('[DEBUG] Starting MediaRecorder with 250ms chunks...');
      recorder.start(250); // Send audio chunks every 250ms
      setMediaRecorder(recorder);
      setDeepgramConnection(connection);

      // Set up keepalive to prevent connection timeout
      const keepAliveInterval = setInterval(() => {
        if (connection.getReadyState() === 1) {
          // Send a keep-alive message (empty buffer)
          const keepAlive = new ArrayBuffer(0);
          connection.send(keepAlive);
          console.log('[DEBUG] Sent keepalive to Deepgram');
        } else {
          console.log('[DEBUG] Stopping keepalive - connection not ready');
          clearInterval(keepAliveInterval);
        }
      }, 5000); // Send keepalive every 5 seconds

      // Store interval ID for cleanup
      connection.keepAliveInterval = keepAliveInterval;

      return connection;
    } catch (err) {
      console.error('[DEBUG] Error connecting to Deepgram:', err);
      setError(err.message);
      throw err;
    }
  };

  // Process accumulated transcript and get script
  const processTranscript = async () => {
    const currentBuffer = transcriptBuffer.trim();
    console.log('[DEBUG] processTranscript called. Buffer:', currentBuffer);
    console.log('[DEBUG] Is already processing?:', isProcessingScript);
    
    if (currentBuffer && !isProcessingScript) {
      console.log('[DEBUG] Processing transcript, calling getGoldenScript...');
      setIsProcessingScript(true);
      try {
        const script = await getGoldenScript(currentBuffer);
        console.log('[DEBUG] Received script from getGoldenScript:', script);
        if (script) {
          console.log('[DEBUG] Setting current script:', script);
          setCurrentScript(script);
          setShowSampleScript(false);
        } else {
          console.log('[DEBUG] No script returned from getGoldenScript');
        }
        setTranscriptBuffer(''); // Clear buffer after processing
        console.log('[DEBUG] Cleared transcript buffer');
      } catch (err) {
        console.error('[DEBUG] Error processing transcript:', err);
      } finally {
        setIsProcessingScript(false);
        console.log('[DEBUG] Processing complete');
      }
    } else if (!currentBuffer) {
      console.log('[DEBUG] No transcript buffer to process');
    }
  };

  // Handle incoming transcripts from Deepgram
  const handleTranscript = (message) => {
    console.log('[DEBUG] handleTranscript called with message:', JSON.stringify(message, null, 2));
    
    const transcript = message.channel?.alternatives?.[0];
    console.log('[DEBUG] Extracted transcript:', transcript);
    console.log('[DEBUG] Is final?:', message.is_final);
    console.log('[DEBUG] Transcript text:', transcript?.transcript);
    
    if (transcript && transcript.transcript) {
      if (message.is_final) {
        console.log('[DEBUG] Final transcript received:', transcript.transcript);
        setTranscriptBuffer(prev => {
          const newBuffer = prev + ' ' + transcript.transcript;
          console.log('[DEBUG] Updated transcript buffer:', newBuffer);
          return newBuffer;
        });
        
        // Clear existing timeout
        if (transcriptTimeoutRef.current) {
          clearTimeout(transcriptTimeoutRef.current);
          console.log('[DEBUG] Cleared existing transcript timeout');
        }
        
        // Set new timeout to process transcript after 500ms of silence
        console.log('[DEBUG] Setting new timeout to process transcript in 500ms');
        transcriptTimeoutRef.current = setTimeout(() => {
          console.log('[DEBUG] Timeout triggered, processing transcript...');
          processTranscript();
        }, 500);
      } else {
        console.log('[DEBUG] Interim transcript (not final):', transcript.transcript);
      }
    } else {
      console.log('[DEBUG] No transcript text in message');
    }
  };

  // Get Golden Script from Edge Function
  const getGoldenScript = async (transcript) => {
    console.log('[DEBUG] getGoldenScript called with transcript:', transcript);
    try {
      const session = await getSession();
      console.log('[DEBUG] Session obtained:', session ? 'Yes' : 'No');
      if (!session) {
        throw new Error('No active session. Please log in through the extension popup.');
      }

      const requestBody = { text: transcript };
      console.log('[DEBUG] Sending request to get-script with body:', requestBody);
      
      const response = await fetch(`${process.env.REACT_APP_SUPABASE_URL}/functions/v1/get-script`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        // The API expects 'text' not 'transcript'
        body: JSON.stringify(requestBody),
      });

      console.log('[DEBUG] get-script response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DEBUG] get-script error response:', errorText);
        throw new Error(`Failed to get script: ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('[DEBUG] get-script response data:', responseData);
      const { script } = responseData;
      console.log('[DEBUG] Extracted script from response:', script);
      return script;
    } catch (err) {
      console.error('[DEBUG] Error getting golden script:', err);
      setError(err.message);
      return null;
    }
  };

  // Start call with improved error handling
  const startCall = async () => {
    // Prevent duplicate connections
    if (isCallActive || deepgramConnection) {
      console.log('[DEBUG] Call already active, ignoring start request');
      return;
    }
    
    try {
      setError(null);
      setIsCallActive(true);
      setCurrentStatus({ 
        type: 'connecting', 
        data: { message: 'Getting Deepgram token...' } 
      });

      // Get Deepgram token with retry logic
      const token = await getDeepgramToken();
      setDeepgramToken(token);
      
      setCurrentStatus({ 
        type: 'connecting', 
        data: { message: 'Connecting to transcription service...' } 
      });

      // Connect to Deepgram
      await connectToDeepgram(token);
      
      setCurrentStatus({ 
        type: 'listening', 
        data: { message: 'Listening to call...' } 
      });
    } catch (err) {
      console.error('Error starting call:', err);
      
      // Provide more helpful error messages
      let errorMessage = err.message;
      if (err.message.includes('401') || err.message.includes('expired')) {
        errorMessage = 'Session expired. Please refresh the page and try again.';
      } else if (err.message.includes('microphone')) {
        errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
      }
      
      setError(errorMessage);
      setIsCallActive(false);
      setCurrentStatus({ 
        type: 'error', 
        data: { message: errorMessage } 
      });
    }
  };

  // End call
  const endCall = () => {
    try {
      // Stop media recorder
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      
      // Close Deepgram connection and clean up keepalive
      if (deepgramConnection) {
        // Clear keepalive interval if it exists
        if (deepgramConnection.keepAliveInterval) {
          clearInterval(deepgramConnection.keepAliveInterval);
          console.log('[DEBUG] Cleared keepalive interval');
        }
        deepgramConnection.finish();
      }
      
      // Stop audio stream
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      
      // Clear timeouts
      if (transcriptTimeoutRef.current) {
        clearTimeout(transcriptTimeoutRef.current);
      }
      
      // Reset state
      setIsCallActive(false);
      setDeepgramConnection(null);
      setDeepgramToken(null);
      setMediaRecorder(null);
      setAudioStream(null);
      setTranscriptBuffer('');
      setIsProcessingScript(false);
      setCurrentStatus({ type: 'idle', data: {} });
      setError(null);
    } catch (err) {
      console.error('Error ending call:', err);
      setError(err.message);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isCallActive) {
        endCall();
      }
    };
  }, [isCallActive]);

  // Generate script based on diagnosis answers
  const generateDiagnosisScript = (answers) => {
    const issues = [];
    
    if (answers[0]?.answer) issues.push("incorrect name spellings");
    if (answers[1]?.answer) issues.push("outdated addresses");
    if (answers[2]?.answer) issues.push("late payments");
    if (answers[3]?.answer) issues.push("charge-offs");
    if (answers[4]?.answer) issues.push("collections");
    if (answers[5]?.answer) issues.push("hard inquiries");
    if (answers[6]?.answer) issues.push("bankruptcy");
    
    if (issues.length === 0) {
      return "Great news! Your credit report appears to be in good standing. To maintain your excellent credit, continue making payments on time and keep your credit utilization low.";
    } else if (issues.length === 1) {
      return `I can see you have an issue with ${issues[0]} on your credit report. This is definitely something we can help you address. Let me explain the dispute process for this specific item...`;
    } else {
      return `I've identified ${issues.length} items on your credit report that need attention: ${issues.join(", ")}. Don't worry - we have a systematic approach to address each of these issues. Let's start with the most impactful one...`;
    }
  };

  return (
    <div
      ref={widgetRef}
      className={`floating-widget ${isCollapsed ? 'collapsed' : 'expanded'} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
      onMouseDown={handleMouseDown}
    >
      {isCollapsed ? (
        // Collapsed View
        <div className="widget-collapsed" onClick={toggleCollapsed}>
          <div className="widget-header collapsed-header">
            <div className="widget-logo">Zeroscript</div>
            <div className="widget-status">
              <span className="status-dot"></span>
              <span className="status-text">Listening</span>
            </div>
            <div className="expand-chevron">
              <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                <path d="M2 2L6 6L2 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      ) : (
        // Expanded View  
        <div className="widget-expanded">
          <div className="widget-header expanded-header">
            <div className="widget-logo">Zeroscript</div>
            <button className="minimize-button" onClick={toggleCollapsed} title="Minimize">
              <span className="minimize-icon">−</span>
            </button>
          </div>
          <DynamicStatusBar status={currentStatus} />
          <div className="widget-body">
            <div className="widget-content-wrapper">
              <ScriptWindow 
                scriptText={currentScript || (showSampleScript ? "Hello! Thank you for calling. How can I assist you today?" : "")} 
                mode='script'
              />
                {error && (
                  <div className="error-message">
                    <div className="error-text">{error}</div>
                    {(error.includes('expired') || error.includes('401')) && (
                      <button 
                        className="retry-button"
                        onClick={() => window.location.reload()}
                        style={{
                          marginTop: '8px',
                          padding: '6px 12px',
                          backgroundColor: '#007bff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Refresh Page
                      </button>
                    )}
                  </div>
                )}
                <div className="widget-controls">
                  {isDiagnosing ? (
                    <div className="diagnosis-buttons-container">
                      <button 
                        className="diagnosis-button diagnosis-yes"
                        onClick={() => handleDiagnosisAnswer(true)}
                      >
                        {showingResponse ? '[ Continue ]' : '[ Yes ]'}
                      </button>
                      {!showingResponse && (
                        <button 
                          className="diagnosis-button diagnosis-no"
                          onClick={() => handleDiagnosisAnswer(false)}
                        >
                          [ No ]
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="control-buttons">
                      <button 
                        className={`call-button ${isCallActive ? 'end-call' : 'start-call'}`}
                        onClick={isCallActive ? endCall : startCall}
                        disabled={isProcessingScript}
                      >
                        {isCallActive ? 'End Call' : 'Start Call'}
                      </button>
                      <button 
                        className="diagnosis-trigger-button"
                        onClick={handleStartDiagnosis}
                      >
                        Start Credit Diagnosis
                      </button>
                    </div>
                  )}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingWidget;