import React, { useState } from 'react';
import './GuidedDiagnosis.css';

const DIAGNOSIS_QUESTIONS = [
  {
    id: 1,
    question: "Are there any incorrectly spelled names?",
    script: "I can see there appears to be a spelling error with your name on this report. This is actually more common than you might think, and it's something we can help you fix. Let me walk you through the dispute process to get this corrected..."
  },
  {
    id: 2,
    question: "Are there accounts that don't belong to the customer?",
    script: "I notice there's an account showing up that you don't recognize. This could be a case of mistaken identity or even fraud. The good news is we have a proven process to investigate and remove accounts that don't belong to you..."
  },
  {
    id: 3,
    question: "Are there duplicate accounts?",
    script: "I see what appears to be duplicate entries for the same account. This can unfairly impact your credit score. We'll help you consolidate these duplicates and ensure your report accurately reflects your actual credit history..."
  },
  {
    id: 4,
    question: "Are there late payments older than 2 years?",
    script: "I notice you have some late payments from over 2 years ago. While these are still on your report, their impact diminishes over time. We can explore options to potentially remove these older items and improve your score..."
  },
  {
    id: 5,
    question: "Are there charge-offs or collections?",
    script: "I can see there are charge-offs or collections on your report. These are seriously affecting your score, but we have strategies to negotiate with creditors and potentially remove or settle these accounts for less than what's owed..."
  },
  {
    id: 6,
    question: "Are there inquiries older than 6 months?",
    script: "There are some credit inquiries from over 6 months ago showing on your report. While inquiries have less impact after 6 months, we can still work on removing unauthorized or unnecessary inquiries to give your score a boost..."
  },
  {
    id: 7,
    question: "Is the credit utilization above 30%?",
    script: "Your credit utilization is currently above 30%, which is impacting your score. The fastest way to improve your credit is to get this below 30%, ideally below 10%. Let me show you some strategies to quickly reduce your utilization..."
  }
];

function GuidedDiagnosis({ onScriptUpdate, onComplete, currentScript, embedded = false }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [showContinue, setShowContinue] = useState(false);

  const currentQuestion = DIAGNOSIS_QUESTIONS.find(q => q.id === currentStep);

  const handleYes = () => {
    onScriptUpdate(currentQuestion.script);
    setShowContinue(true);
  };

  const handleNo = () => {
    if (currentStep === 7) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleContinue = () => {
    setShowContinue(false);
    if (currentStep === 7) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  if (embedded) {
    // Embedded view for inside the widget
    return (
      <div className="guided-diagnosis-embedded">
        <div className="diagnosis-header-compact">
          <span className="step-badge">{currentStep}/7</span>
          <span className="diagnosis-title-compact">Credit Report Analysis</span>
        </div>
        
        <div className="diagnosis-question-compact">
          {currentQuestion.question}
        </div>
        
        <div className="diagnosis-actions">
          {!showContinue ? (
            <>
              <button 
                className="action-btn yes-btn"
                onClick={handleYes}
              >
                Yes
              </button>
              <button 
                className="action-btn no-btn"
                onClick={handleNo}
              >
                No
              </button>
            </>
          ) : (
            <button 
              className="action-btn continue-btn"
              onClick={handleContinue}
            >
              Continue →
            </button>
          )}
        </div>
        
        {currentScript && (
          <div className="script-area">
            <div className="script-content">
              {currentScript}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Modal view (original)
  return (
    <div className="guided-diagnosis">
      <div className="diagnosis-card">
        <div className="diagnosis-header">
          <span className="step-indicator">{currentStep} of 7</span>
          <h2 className="diagnosis-title">Credit Report Analysis</h2>
        </div>
        
        <div className="diagnosis-content">
          <p className="diagnosis-question">
            {currentQuestion.question}
          </p>
          
          {!showContinue ? (
            <div className="button-group">
              <button 
                className="diagnosis-button yes-button"
                onClick={handleYes}
              >
                Yes
              </button>
              <button 
                className="diagnosis-button no-button"
                onClick={handleNo}
              >
                No
              </button>
            </div>
          ) : (
            <div className="continue-section">
              <p className="continue-message">
                Script loaded. Handle the issue, then continue.
              </p>
              <button 
                className="diagnosis-button continue-button"
                onClick={handleContinue}
              >
                Continue to Next Question
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GuidedDiagnosis;