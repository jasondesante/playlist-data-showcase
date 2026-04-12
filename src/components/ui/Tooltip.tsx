import { useRef, useState, useEffect, useCallback } from 'react';
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
 * Displays a help icon (?) that shows a tooltip on hover (desktop) or tap (mobile).
 * Uses React Portal to render outside the DOM hierarchy to avoid clipping.
 */
export function Tooltip({ content, className = '' }: TooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, visible: false });

  const show = useCallback(() => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      // Position tooltip above the icon, centered horizontally
      // On mobile, position below to avoid safe area issues
      const isMobile = window.innerWidth < 768;
      setPosition({
        top: isMobile ? rect.bottom + 8 : rect.top - 8,
        left: rect.left + rect.width / 2,
        visible: true
      });
    }
  }, []);

  const hide = useCallback(() => {
    setPosition(prev => ({ ...prev, visible: false }));
  }, []);

  const handleMouseEnter = () => {
    show();
  };

  const handleMouseLeave = () => {
    hide();
  };

  const handleClick = (e: React.MouseEvent) => {
    // Toggle on click for touch devices
    e.stopPropagation();
    setPosition(prev => {
      if (prev.visible) {
        hide();
        return { ...prev, visible: false };
      }
      show();
      return prev;
    });
  };

  // Close tooltip on outside tap (mobile)
  useEffect(() => {
    if (!position.visible) return;

    const handleOutsideTap = (e: TouchEvent | MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        hide();
      }
    };

    // Delay listener to avoid immediate close from the triggering tap
    const timer = setTimeout(() => {
      document.addEventListener('touchstart', handleOutsideTap);
      document.addEventListener('mousedown', handleOutsideTap);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('touchstart', handleOutsideTap);
      document.removeEventListener('mousedown', handleOutsideTap);
    };
  }, [position.visible, hide]);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <span
        ref={wrapperRef}
        className={`tooltip-wrapper ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <HelpCircle size={14} className="tooltip-icon" />
      </span>
      {position.visible && createPortal(
        <span
          className={`tooltip-text ${isMobile ? 'tooltip-text--mobile' : ''}`}
          style={{
            position: 'fixed',
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: isMobile ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
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
