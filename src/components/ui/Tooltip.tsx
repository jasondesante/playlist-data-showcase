import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';
import './Tooltip.css';

interface TooltipProps {
  content: string;
  className?: string;
}

/**
 * Tooltip Component
 *
 * Displays a help icon (?) that shows a tooltip on hover.
 * The tooltip appears immediately and stays visible while hovering.
 * Uses React Portal to render outside the DOM hierarchy to avoid clipping.
 */
export function Tooltip({ content, className = '' }: TooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, visible: false });

  const handleMouseEnter = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      // Position tooltip above the icon, centered horizontally
      // Place it 8px above the icon
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
        visible: true
      });
    }
  };

  const handleMouseLeave = () => {
    setPosition(prev => ({ ...prev, visible: false }));
  };

  return (
    <>
      <span
        ref={wrapperRef}
        className={`tooltip-wrapper ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <HelpCircle size={14} className="tooltip-icon" />
      </span>
      {position.visible && createPortal(
        <span
          className="tooltip-text"
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)',
            opacity: 1,
            visibility: 'visible',
            backgroundColor: '#000000',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {content}
        </span>,
        document.body
      )}
    </>
  );
}
