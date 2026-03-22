/**
 * CollapsibleSection Component
 *
 * A reusable collapsible panel with a header that can be toggled.
 * Used to organize the PartyTab layout with collapsible sections.
 */

import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import './CollapsibleSection.css';

export interface CollapsibleSectionProps {
  /** Section title displayed in the header */
  title: string;
  /** Optional subtitle for additional context */
  subtitle?: string;
  /** Content to be rendered inside the collapsible area */
  children: React.ReactNode;
  /** Whether the section starts collapsed (default: false = expanded) */
  defaultCollapsed?: boolean;
  /** Optional icon to display before the title */
  icon?: React.ReactNode;
  /** Optional badge/count to display in the header */
  badge?: string | number;
  /** Additional CSS class for the container */
  className?: string;
  /** Whether to persist collapsed state across sessions using localStorage */
  persistKey?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultCollapsed = false,
  icon,
  badge,
  className = '',
  persistKey
}: CollapsibleSectionProps) {
  // Initialize collapsed state, optionally from localStorage
  const getInitialState = () => {
    if (persistKey) {
      try {
        const stored = localStorage.getItem(`collapsible-${persistKey}`);
        if (stored !== null) {
          return stored === 'collapsed';
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    return defaultCollapsed;
  };

  const [isCollapsed, setIsCollapsed] = useState(getInitialState);
  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // Use ResizeObserver to measure content height when it changes
  // This handles cases where internal state changes affect height (e.g., TransientInspector expanding)
  // We observe the INNER element because the outer has overflow:hidden and max-height constraints
  useEffect(() => {
    const innerEl = innerRef.current;
    if (!innerEl) return;

    const updateHeight = () => {
      // Measure the inner element's offsetHeight which gives true unconstrained height
      setContentHeight(innerEl.offsetHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      // Use requestAnimationFrame to avoid ResizeObserver loop errors
      requestAnimationFrame(updateHeight);
    });

    resizeObserver.observe(innerEl);

    // Initial measurement
    updateHeight();

    return () => {
      resizeObserver.disconnect();
    };
  }, [children]);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);

    // Persist state to localStorage if key provided
    if (persistKey) {
      try {
        localStorage.setItem(
          `collapsible-${persistKey}`,
          newState ? 'collapsed' : 'expanded'
        );
      } catch {
        // Ignore localStorage errors
      }
    }
  };

  return (
    <div className={`collapsible-section ${isCollapsed ? 'collapsed' : 'expanded'} ${className}`}>
      <button
        className="collapsible-section-header"
        onClick={toggleCollapsed}
        aria-expanded={!isCollapsed}
        aria-controls={`collapsible-content-${title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        <div className="collapsible-section-header-left">
          {icon && <span className="collapsible-section-icon">{icon}</span>}
          <div className="collapsible-section-title-group">
            <span className="collapsible-section-title">{title}</span>
            {subtitle && <span className="collapsible-section-subtitle">{subtitle}</span>}
          </div>
          {badge !== undefined && (
            <span className="collapsible-section-badge">{badge}</span>
          )}
        </div>
        <ChevronDown
          size={20}
          className={`collapsible-section-chevron ${isCollapsed ? 'rotated' : ''}`}
        />
      </button>
      <div
        id={`collapsible-content-${title.toLowerCase().replace(/\s+/g, '-')}`}
        className="collapsible-section-content"
        style={{
          maxHeight: isCollapsed ? 0 : contentHeight,
          overflow: 'hidden'
        }}
        ref={contentRef}
      >
        <div className="collapsible-section-inner" ref={innerRef}>
          {children}
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
