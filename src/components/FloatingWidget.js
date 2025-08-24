import React, { useState, useEffect, useRef } from 'react';
import './FloatingWidget.css';
import ScriptWindow from './ScriptWindow';

const FloatingWidget = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [position, setPosition] = useState({ x: window.innerWidth - 300, y: window.innerHeight - 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showSampleScript, setShowSampleScript] = useState(true);
  const widgetRef = useRef(null);

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
              <span className="chevron-icon">›</span>
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
          <div className="widget-body">
            <div className="widget-content">
              <ScriptWindow 
                scriptText={showSampleScript ? "Hello! Thank you for calling. How can I assist you today?" : ""} 
              />
              <button 
                onClick={() => setShowSampleScript(!showSampleScript)}
                style={{ marginTop: '10px', padding: '5px 10px', cursor: 'pointer' }}
              >
                Toggle Script (Testing)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingWidget;