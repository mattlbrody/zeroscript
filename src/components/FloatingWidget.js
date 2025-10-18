import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FloatingWidget.css';
import ScriptWindow from './ScriptWindow.js';
import DynamicStatusBar from './DynamicStatusBar.js';
import ObjectionsPanel from './ObjectionsPanel.js';
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
  
  // New states for phase-based playbook
  const [currentPhase, setCurrentPhase] = useState(0); // 0-5 for 6 phases
  const [selectedObjection, setSelectedObjection] = useState(null);
  const [showObjectionRebuttal, setShowObjectionRebuttal] = useState(false);
  
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

  // Sales playbook phases
  const PLAYBOOK_PHASES = [
    {
      id: 0,
      name: 'The Opening',
      script: "Hi [Customer Name], this is [Your Name] from Zeroscript. How is your day going? ... Great to hear. I'm giving you a call because you requested some information about helping with your credit. To start, are you aware of the specific negative items on your account?"
    },
    {
      id: 1,
      name: 'Building Authority & Trust',
      script: "I understand. Just so you know, our founder, Matt, has been building our credibility for over ten years and is one of the best in the industry. He's the one who will be heading the work on your file."
    },
    {
      id: 2,
      name: 'The Credit Pull Pivot',
      script: "Okay, what I can do for you right now is pull up your complete reports from all three bureaus using a secure tool. It's important we do this because it guarantees this will not be a hard inquiry that could hurt your score. It only requires a $1 charge, which is mainly to verify your identity and protect you from that hard pull."
    },
    {
      id: 3,
      name: 'The Guided Diagnosis',
      script: "Let's review your credit report together. I'll go through the most common items that impact credit scores and see what applies to your situation."
    },
    {
      id: 4,
      name: 'The Closing Sequence',
      script: "So, based on what we're seeing, the plan is to come after all of these negative items at once. Our initial goal is to start you with a big boost of at least 100 points across all three bureaus. The investment for the service, which covers all the work we've discussed, is [Amount] per month.\n\nAnd just so you're aware, you are protected by a 100% money-back guarantee. If we don't provide you with a minimum of a 100-point increase across all three bureaus in 90 days, you get all of your money back, fully refunded. So there is absolutely nothing for you to lose. I believe that's fair enough, correct?\n\n...Alright, perfect. So to get you started, and before I transfer you over to Matt, I just need to activate your account. To do that, we'll process the first month's payment of [Amount]. Would you like to use the same [Card Type] card you used for the credit pull?"
    },
    {
      id: 5,
      name: 'The Handoff',
      script: "Excellent, your account is now active. I'm going to transfer you over to Matt, our head of operations. He'll re-verify everything to make sure I didn't miss anything and will be your main point of contact moving forward. Again, welcome to the team."
    }
  ];

  // Objection rebuttals
  const OBJECTION_REBUTTALS = {
    price: "That's a completely fair question. The investment for the service is [Amount] per month. And just so you know, that's a flat rate that covers all the work we'll be doing on all of your accounts. More importantly, you are protected by a 100% money-back guarantee. If we don't provide you with the results we discussed, you get a full refund. So there is absolutely no risk to you to see what we can accomplish.",
    skepticism: "I completely understand your concern. There are a lot of untrustworthy companies out there. That's why I want to be transparent. Our company is owned by Matt, who has been building our credibility for over ten years. In fact, many of our clients come to us after having a bad experience with other companies. The best part is, the risk is all on us. With our 100% money-back guarantee, if you don't get the results, you don't pay. It's that simple.",
    timeline: "That's a great question. I would say you should expect to see significant results within two to three months, just to be on the safe side. However, I am confident that with Matt's help, you will likely start seeing a big improvement within the first month alone, so you don't have to worry.",
    think: "I completely understand, and you should absolutely take the time you need to think it over. While you do, just remember that the decision is completely risk-free. Because of our 100% money-back guarantee, you can get started today and see the progress for yourself. If for any reason you're not satisfied, we'll refund the investment. This way, you don't lose any time in getting started on your credit goals.",
    spouse: "That is a great idea and something I would encourage. This is a big decision, and you should both be on the same page. When you speak with them, the most important thing to remember is our 100% money-back guarantee. This makes the decision completely risk-free for both of you. You can try the service, see the results for yourself, and if you're not satisfied, you get a full refund.",
    research: "You are absolutely right, you can dispute these items yourself. The main advantage we bring is our experience and a specific strategy that has a very high success rate, especially with collections that have been sold to third parties. We challenge them based on federal privacy laws, which is an angle most consumers aren't aware of. Essentially, you're leveraging our expertise to get the job done faster and more effectively than you likely could on your own.",
    busy: "That's a great question. We require a monitoring service like IdentityIQ for two main reasons. First, they are accredited by the bureaus, which allows us to pull your full report without it counting as a hard inquiry that could damage your score. Second, it gives you 24/7 access to your own file so you can see the progress we're making in real-time. It ensures we're both looking at the exact same data and that everything is completely transparent.",
    notInterested: "I respect that. Before you go, can I ask - if there was a way to improve your credit score by 100 points in the next 90 days, would that change your mind? Because that's exactly what we've done for many of our clients."
  };

  // Diagnosis questions
  const DIAGNOSIS_QUESTIONS = [
    "First, I'm noticing a few variations of your name on the report. Do you see any incorrect name spellings?",
    "Next, I'm seeing some old addresses still listed here. Are there any addresses that are no longer current?",
    "Okay, it looks like there are a few late payments being reported. Do you see any late payments on your report?",
    "I'm also seeing an account that has been charged-off. Do you have any charge-offs showing?",
    "Okay, I see some accounts have gone to collections. Do you have any collection accounts?",
    "Finally, I'm seeing a number of hard inquiries here. Do you have multiple hard inquiries on your report?",
    "Okay, I do see a bankruptcy on the report. Is there a bankruptcy filing showing?"
  ];

  // Scripted responses for Yes answers
  const DIAGNOSIS_RESPONSES = [
    "First, I'm noticing a few variations of your name on the report. We need to clean that up to ensure everything is consistent, as this can sometimes cause issues.",
    "Next, I'm seeing some old addresses still listed here. It's important we remove these, as they can sometimes be linked to old negative accounts and hold your score back.",
    "Okay, it looks like there are a few late payments being reported. [Action: Name 1-2 examples]. We can definitely work on challenging the reporting of these.",
    "I'm also seeing an account that has been charged-off. [Action: Name the creditor and the approximate amount]. This is a major factor impacting your score, and our goal will be to challenge this.",
    "Okay, I see some accounts have gone to collections. [Action: Name 1-2 examples and state the total amount]. The good news is, because these were sold to a third-party agency, we can go after them for a privacy law violation—a strategy we have a very high success rate with.",
    "Finally, I'm seeing a number of hard inquiries here. [Action: State the total number]. Too many of these can drag your score down, so we'll look to dispute the ones that aren't attached to an open account you authorized.",
    "Okay, I do see a bankruptcy on the report. [Action: State the year it was filed]. While it can stay on your report for up to 10 years, we have strategies to challenge how it's being reported."
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

  // Initialize phase script on mount
  useEffect(() => {
    if (!showObjectionRebuttal && !isDiagnosing && currentPhase !== 3) {
      setCurrentScript(PLAYBOOK_PHASES[currentPhase].script);
      setShowSampleScript(false);
    }
  }, [currentPhase, showObjectionRebuttal, isDiagnosing]);

  // Phase navigation handlers
  const handleNextPhase = () => {
    if (currentPhase < 5) {
      const nextPhase = currentPhase + 1;
      setCurrentPhase(nextPhase);
      
      // If moving to phase 3 (Guided Diagnosis), start diagnosis
      if (nextPhase === 3) {
        handleStartDiagnosis();
      } else {
        setCurrentScript(PLAYBOOK_PHASES[nextPhase].script);
        setCurrentStatus({
          type: 'phase',
          data: {
            current: nextPhase + 1,
            total: 6,
            name: PLAYBOOK_PHASES[nextPhase].name
          }
        });
      }
    }
  };

  const handlePreviousPhase = () => {
    if (currentPhase > 0) {
      const prevPhase = currentPhase - 1;
      setCurrentPhase(prevPhase);
      setCurrentScript(PLAYBOOK_PHASES[prevPhase].script);
      setIsDiagnosing(false); // Exit diagnosis if going back
      setCurrentStatus({
        type: 'phase',
        data: {
          current: prevPhase + 1,
          total: 6,
          name: PLAYBOOK_PHASES[prevPhase].name
        }
      });
    }
  };

  // Handle objection selection
  const handleObjectionSelect = (objectionId) => {
    if (showObjectionRebuttal && selectedObjection === objectionId) {
      // Return to main script
      setShowObjectionRebuttal(false);
      setSelectedObjection(null);
      setCurrentScript(PLAYBOOK_PHASES[currentPhase].script);
      setCurrentStatus({
        type: 'phase',
        data: {
          current: currentPhase + 1,
          total: 6,
          name: PLAYBOOK_PHASES[currentPhase].name
        }
      });
    } else {
      // Show objection rebuttal
      setSelectedObjection(objectionId);
      setShowObjectionRebuttal(true);
      setCurrentScript(OBJECTION_REBUTTALS[objectionId]);
      setCurrentStatus({
        type: 'objection',
        data: {
          topic: objectionId.charAt(0).toUpperCase() + objectionId.slice(1)
        }
      });
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
    
    // Initialize phase status
    setCurrentStatus({
      type: 'phase',
      data: {
        current: 1,
        total: 6,
        name: PLAYBOOK_PHASES[0].name
      }
    });
    
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
        const widgetWidth = isCollapsed ? 280 : 600; // Increased for two-panel layout
        const widgetHeight = isCollapsed ? 40 : 580; // Increased to fit all objection buttons
        
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
    
    const expandedWidth = 600; // Increased for two-panel layout
    const expandedHeight = 580; // Increased to fit all objection buttons
    
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

  // Start diagnosis (Phase 3)
  const handleStartDiagnosis = () => {
    setIsDiagnosing(true);
    setDiagnosisStep(0);
    setDiagnosisAnswers([]);
    setShowingResponse(false);
    setCurrentScript(DIAGNOSIS_QUESTIONS[0]);
    setShowSampleScript(false);
    setShowObjectionRebuttal(false); // Clear any objection state
    setSelectedObjection(null);
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
      // Diagnosis complete - move to next phase (Solution Presentation)
      setIsDiagnosing(false);
      const script = generateDiagnosisScript(diagnosisAnswers);
      
      // Move to Phase 4 (Solution Presentation) with diagnosis results
      setCurrentPhase(4);
      setCurrentScript(script + "\n\n" + PLAYBOOK_PHASES[4].script);
      setShowSampleScript(false);
      setCurrentStatus({
        type: 'phase',
        data: {
          current: 5,
          total: 6,
          name: PLAYBOOK_PHASES[4].name
        }
      });
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

      // Debug the token we received
      console.log('[DEBUG] Creating Deepgram connection with token:', token ? 'Token present' : 'No token');
      console.log('[DEBUG] Token length:', token ? token.length : 0);
      console.log('[DEBUG] Token prefix:', token ? token.substring(0, 10) + '...' : 'N/A');
      
      // Validate token format
      if (!token || token.length < 20) {
        throw new Error(`Invalid token format. Length: ${token ? token.length : 0}`);
      }
      
      // For browser environments, we need to use WebSocket directly with token in URL
      // The SDK has issues with WebSocket authentication in browser environments
      console.log('[DEBUG] Creating WebSocket connection directly (browser compatibility mode)...');
      
      // Build WebSocket URL with token as query parameter
      const wsUrl = `wss://api.deepgram.com/v1/listen?` +
        `token=${token}&` +
        `model=nova-2&` +
        `language=en-US&` +
        `smart_format=true&` +
        `interim_results=true&` +
        `punctuate=true&` +
        `encoding=linear16&` +  // Use linear16 for direct WebSocket
        `sample_rate=16000`;
      
      console.log('[DEBUG] Connecting to WebSocket URL (token hidden):', wsUrl.replace(token, 'TOKEN_HIDDEN'));
      
      const ws = new WebSocket(wsUrl);
      
      // Create a connection-like object that mimics the SDK interface
      const connection = {
        ws: ws,
        listeners: {},
        getReadyState: () => ws.readyState,
        send: (data) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        },
        finish: () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close(1000, 'Normal closure');
          }
        },
        on: function(event, callback) {
          if (!this.listeners[event]) {
            this.listeners[event] = [];
          }
          this.listeners[event].push(callback);
        },
        emit: function(event, data) {
          if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
          }
        }
      };
      
      // Wire up WebSocket events to our connection object
      ws.onopen = () => {
        console.log('[DEBUG] WebSocket opened successfully');
        connection.emit('open');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'Results' && data.channel) {
            connection.emit('transcript', data);
          } else if (data.type === 'Metadata') {
            connection.emit('metadata', data);
          }
        } catch (e) {
          console.error('[DEBUG] Error parsing message:', e);
        }
      };
      
      ws.onerror = (error) => {
        console.error('[DEBUG] WebSocket error:', error);
        connection.emit('error', error);
      };
      
      ws.onclose = (event) => {
        console.log('[DEBUG] WebSocket closed:', event.code, event.reason);
        connection.emit('close', event.code, event.reason);
      };
      
      console.log('[DEBUG] Connection wrapper created');

      // Handle connection open - start recording when ready
      connection.on('open', () => {
        console.log('[DEBUG] Deepgram WebSocket connection opened');
        console.log('[DEBUG] Connection ready state:', connection.getReadyState());
        
        // Send a keep-alive immediately to prevent the connection from closing
        // For direct WebSocket, we send an empty buffer
        console.log('[DEBUG] Sending initial keep-alive');
        connection.send(new ArrayBuffer(0));
        
        // Now start the audio processing since the connection is ready
        if (mediaRecorder && mediaRecorder.state === 'inactive') {
          console.log('[DEBUG] Starting audio processor now that connection is open...');
          mediaRecorder.start();
          console.log('[DEBUG] Audio processor started');
        } else {
          console.log('[DEBUG] Audio processor state:', mediaRecorder ? mediaRecorder.state : 'not created');
        }
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

      // Handle errors with more detail
      connection.on('error', (err) => {
        console.error('[DEBUG] Deepgram error:', err);
        console.error('[DEBUG] Error type:', typeof err);
        console.error('[DEBUG] Error details:', JSON.stringify(err, null, 2));
        
        // Check if it's an authentication error
        let errorMessage = 'Transcription error occurred';
        if (err && err.message) {
          if (err.message.includes('401') || err.message.includes('Unauthorized')) {
            errorMessage = 'Authentication failed. API key may be invalid.';
          } else if (err.message.includes('403') || err.message.includes('Forbidden')) {
            errorMessage = 'Access forbidden. API key may lack required permissions.';
          } else {
            errorMessage = 'Deepgram error: ' + err.message;
          }
        }
        setError(errorMessage);
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
      
      // For linear16 encoding, we need to convert audio data
      // First, let's use the AudioContext API to process audio
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      
      let audioBuffer = [];
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Convert float32 to int16 for linear16 encoding
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        audioBuffer.push(int16Data);
        
        // Send audio data every 100ms (approximately)
        if (audioBuffer.length >= 4 && connection.getReadyState() === 1) {
          // Combine buffers
          const totalLength = audioBuffer.reduce((acc, arr) => acc + arr.length, 0);
          const combinedBuffer = new Int16Array(totalLength);
          let offset = 0;
          for (const buffer of audioBuffer) {
            combinedBuffer.set(buffer, offset);
            offset += buffer.length;
          }
          
          // Send as ArrayBuffer
          try {
            connection.send(combinedBuffer.buffer);
            console.log(`[DEBUG] Sent ${combinedBuffer.buffer.byteLength} bytes of linear16 audio`);
          } catch (err) {
            console.error('[DEBUG] Error sending audio:', err);
          }
          
          // Clear buffer
          audioBuffer = [];
        }
      };
      
      // Connect audio nodes
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      // Store references for cleanup
      const audioNodes = { audioContext, source, processor };
      
      // Create a dummy recorder object for compatibility
      const recorder = {
        state: 'inactive',
        start: () => {
          console.log('[DEBUG] Starting audio processing');
          recorder.state = 'recording';
          audioContext.resume();
        },
        stop: () => {
          console.log('[DEBUG] Stopping audio processing');
          recorder.state = 'inactive';
          source.disconnect();
          processor.disconnect();
          audioContext.close();
        }
      };


      // Store the recorder but don't start it yet
      setMediaRecorder(recorder);
      console.log('[DEBUG] MediaRecorder created and stored, will start when connection opens');
      setDeepgramConnection(connection);

      // Set up keepalive to prevent connection timeout
      const keepAliveInterval = setInterval(() => {
        if (connection.getReadyState() === 1) {
          // Send a keep-alive message (empty buffer)
          connection.send(new ArrayBuffer(0));
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
        // Expanded View with two-panel layout
        <div className="widget-expanded">
          <div className="widget-header expanded-header">
            <div className="widget-logo">Zeroscript</div>
            <button className="minimize-button" onClick={toggleCollapsed} title="Minimize">
              <span className="minimize-icon">−</span>
            </button>
          </div>
          <div className="widget-panels">
            <ObjectionsPanel 
              onObjectionSelect={handleObjectionSelect}
              activeObjection={selectedObjection}
            />
            <div className="main-panel">
              <DynamicStatusBar status={currentStatus} />
              <div className="widget-body">
                <div className="widget-content-wrapper">
                  <ScriptWindow 
                    scriptText={currentScript || PLAYBOOK_PHASES[currentPhase].script} 
                    mode={isDiagnosing ? 'diagnosis' : 'script'}
                    onDiagnosisAnswer={isDiagnosing ? handleDiagnosisAnswer : null}
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
                    {isDiagnosing && (
                      <div className="diagnosis-controls">
                        <div className="diagnosis-buttons-row">
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
                      </div>
                    )}
                    
                    {!isDiagnosing && (
                      <div className="phase-navigation">
                        <button 
                          className="nav-button nav-back"
                          onClick={handlePreviousPhase}
                          disabled={currentPhase === 0}
                        >
                          ← Back
                        </button>
                        <span className="phase-indicator">
                          Phase {currentPhase + 1} of 6: {PLAYBOOK_PHASES[currentPhase].name}
                        </span>
                        <button 
                          className="nav-button nav-next"
                          onClick={handleNextPhase}
                          disabled={currentPhase === 5}
                        >
                          Next →
                        </button>
                      </div>
                    )}
                    
                    {showObjectionRebuttal && (
                      <button 
                        className="return-to-script-button"
                        onClick={() => handleObjectionSelect(selectedObjection)}
                      >
                        Return to Main Script
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingWidget;