import React, { useState, useEffect, useRef } from 'react';
import ScriptWindow from './ScriptWindow.js';

const FloatingWidgetContent = () => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [position, setPosition] = useState({ x: 20, y: 20 }); // Start at top-left for visibility
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const [isHoveringWidget, setIsHoveringWidget] = useState(false);
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
    if (e.target.closest('[data-drag-handle]')) {
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
        setHasDragged(true);
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        
        // Get widget dimensions
        const widgetWidth = isCollapsed ? 280 : 400;
        const widgetHeight = isCollapsed ? 44 : 500;
        
        // Keep widget within viewport boundaries
        const boundedX = Math.max(0, Math.min(window.innerWidth - widgetWidth, newX));
        const boundedY = Math.max(0, Math.min(window.innerHeight - widgetHeight, newY));
        
        setPosition({ x: boundedX, y: boundedY });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Reset hasDragged after a short delay to prevent click event
      setTimeout(() => setHasDragged(false), 100);
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
  const toggleCollapsed = (e) => {
    // Don't toggle if we're dragging or just finished dragging
    if (isDragging || hasDragged) return;
    
    // Prevent event from bubbling to drag handler
    if (e) e.stopPropagation();
    
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

  // Inline styles
  const baseStyles = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    zIndex: 2147483647,
    background: isCollapsed ? 'transparent' : '#ffffff',
    borderRadius: '8px',
    boxShadow: isDragging ? '0 6px 30px rgba(0, 0, 0, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.15)',
    transition: isDragging ? 'none' : 'all 0.3s ease',
    transform: isDragging ? 'scale(1.02)' : 'scale(1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
    width: isCollapsed ? '280px' : '400px',
    height: isCollapsed ? '44px' : '500px',
    cursor: isCollapsed ? 'pointer' : 'default'
  };

  const headerStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: isCollapsed ? '0 12px' : '12px 15px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: isCollapsed ? '8px' : '8px 8px 0 0',
    cursor: 'move',
    userSelect: 'none',
    height: isCollapsed ? '44px' : 'auto',
    gap: '12px',
    width: '100%',
    boxSizing: 'border-box'
  };

  const logoStyles = {
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '0.5px',
    flexShrink: 0
  };

  const statusStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    flex: '1 1 auto',
    justifyContent: 'center',
    minWidth: 0
  };

  const statusDotStyles = {
    width: '8px',
    height: '8px',
    background: '#4ade80',
    borderRadius: '50%',
    boxShadow: '0 0 8px rgba(74, 222, 128, 0.6)'
  };

  const statusTextStyles = {
    fontSize: '13px',
    fontWeight: '500',
    opacity: '0.95',
    whiteSpace: 'nowrap'
  };

  const minimizeButtonStyles = {
    background: 'rgba(255, 255, 255, 0.2)',
    border: 'none',
    width: '28px',
    height: '28px',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '24px',
    lineHeight: '1',
    fontWeight: '300'
  };

  const bodyStyles = {
    flex: 1,
    background: '#f8f9fa',
    borderRadius: '0 0 8px 8px',
    overflowY: 'auto',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  };

  const contentStyles = {
    padding: '20px',
    color: '#333',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    textAlign: 'center',
    background: 'white',
    margin: '15px',
    borderRadius: '6px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
  };

  const chevronStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    width: '20px',
    height: '20px'
  };

  const chevronIconStyles = {
    fontSize: '18px',
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    transition: 'transform 0.3s ease, color 0.3s ease',
    display: 'inline-block',
    lineHeight: '1',
    verticalAlign: 'middle',
    transform: isHoveringWidget && !isDragging ? 'translateX(2px)' : 'translateX(0)'
  };

  return (
    <div
      ref={widgetRef}
      style={baseStyles}
      onMouseDown={handleMouseDown}
    >
      {isCollapsed ? (
        // Collapsed View
        <div 
          style={{ 
            width: '100%', 
            height: '100%',
            display: 'flex',
            alignItems: 'center'
          }} 
          onClick={toggleCollapsed}
          onMouseEnter={() => setIsHoveringWidget(true)}
          onMouseLeave={() => setIsHoveringWidget(false)}
        >
          <div style={headerStyles} data-drag-handle>
            <div style={logoStyles}>Zeroscript</div>
            <div style={statusStyles}>
              <span style={statusDotStyles}></span>
              <span style={statusTextStyles}>Listening</span>
            </div>
            <div style={chevronStyles}>
              <svg 
                width="8" 
                height="12" 
                viewBox="0 0 8 12" 
                fill="none" 
                style={{
                  transition: 'transform 0.3s ease',
                  transform: isHoveringWidget && !isDragging ? 'translateX(2px)' : 'translateX(0)'
                }}
              >
                <path 
                  d="M2 2L6 6L2 10" 
                  stroke={isHoveringWidget && !isDragging ? 'white' : 'rgba(255, 255, 255, 0.9)'}
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>
      ) : (
        // Expanded View
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <div style={headerStyles} data-drag-handle>
            <div style={logoStyles}>Zeroscript</div>
            <button 
              style={minimizeButtonStyles}
              onClick={toggleCollapsed}
              onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.3)'}
              onMouseLeave={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.2)'}
              title="Minimize"
            >
              −
            </button>
          </div>
          <div style={bodyStyles}>
            <div style={{ padding: '15px', height: '100%', boxSizing: 'border-box' }}>
              <ScriptWindow scriptText="Hello! Thank you for calling. How can I assist you today?" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingWidgetContent;