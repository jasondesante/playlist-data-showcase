/**
 * CollapsibleSection Component
 *
 * A reusable collapsible panel with a header that can be toggled.
 * Used to organize the PartyTab layout with collapsible sections.
 *
 * Supports both controlled and uncontrolled modes:
 * - Uncontrolled: Uses internal state, optionally persisted to localStorage
 * - Controlled: Use `collapsed` and `onCollapsedChange` props for external control
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
  /** Whether the section starts collapsed (default: false = expanded) - uncontrolled mode only */
  defaultCollapsed?: boolean;
  /** Controlled collapsed state - when provided, component becomes controlled */
  collapsed?: boolean;
  /** Callback when collapsed state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Optional icon to display before the title */
  icon?: React.ReactNode;
  /** Optional badge/count to display in the header */
  badge?: string | number;
  /** Additional CSS class for the container */
  className?: string;
  /** Whether to persist collapsed state across sessions using localStorage (uncontrolled mode only) */
  persistKey?: string;
}

export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultCollapsed = false,
  collapsed: controlledCollapsed,
  onCollapsedChange,
  icon,
  badge,
  className = '',
  persistKey
}: CollapsibleSectionProps) {
  // Determine if component is controlled
  const isControlled = controlledCollapsed !== undefined;

  // Initialize collapsed state, optionally from localStorage (uncontrolled mode only)
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

  const [internalCollapsed, setInternalCollapsed] = useState(getInitialState);

  // Use controlled value if provided, otherwise use internal state
  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed;

  const contentRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  // Use ResizeObserver to measure content height when it changes
  // This handles cases where internal state changes affect height (e.g., TransientInspector expanding)
  // We observe the INNER element because the outer has overflow:hidden and max-height constraints
  useEffect(() => {
    // When collapsed, don't measure — reset so maxHeight falls back to undefined (no constraint)
    if (isCollapsed) {
      setContentHeight(undefined);
      return;
    }

    const innerEl = innerRef.current;
    if (!innerEl) return;

    const updateHeight = () => {
      setContentHeight(innerEl.offsetHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateHeight);
    });

    resizeObserver.observe(innerEl);
    updateHeight();

    return () => {
      resizeObserver.disconnect();
    };
  }, [isCollapsed]);

  const toggleCollapsed = () => {
    const newState = !isCollapsed;

    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalCollapsed(newState);
    }

    // Notify parent of change
    if (onCollapsedChange) {
      onCollapsedChange(newState);
    }

    // Persist to localStorage (only in uncontrolled mode with persistKey)
    if (!isControlled && persistKey) {
      try {
        localStorage.setItem(`collapsible-${persistKey}`, newState ? 'collapsed' : 'expanded');
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
        <div
          className="collapsible-section-inner"
          ref={innerRef}
          aria-hidden={isCollapsed}
          style={{ display: isCollapsed ? 'none' : undefined }}
        >
          {!isCollapsed && children}
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
