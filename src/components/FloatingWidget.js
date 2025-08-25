import React, { useState, useEffect, useRef } from 'react';
import './FloatingWidget.css';
import ScriptWindow from './ScriptWindow.js';
import DynamicStatusBar from './DynamicStatusBar.js';

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
  const widgetRef = useRef(null);

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

  // Load saved position from localStorage on mount
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
                    <button 
                      className="diagnosis-trigger-button"
                      onClick={handleStartDiagnosis}
                    >
                      Start Credit Diagnosis
                    </button>
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