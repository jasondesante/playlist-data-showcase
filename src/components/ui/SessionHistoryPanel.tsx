import { useState, useMemo, useId, useRef, useCallback, useEffect } from 'react';
import { ScrollText, ChevronDown, ChevronUp, Headphones, Zap, Clock, History, List } from 'lucide-react';
import { SessionHistoryItem } from './SessionHistoryItem';
import type { ListeningSessionWithTrack } from '@/types';
import './SessionHistoryPanel.css';

/**
 * Virtualization threshold - enable virtualization when sessions exceed this count
 */
const VIRTUALIZATION_THRESHOLD = 100;

/**
 * Estimated height of each session item in pixels (used for virtualization)
 * Based on typical collapsed item height: ~68px (padding + icon + text)
 */
const ESTIMATED_ITEM_HEIGHT = 68;

/**
 * Number of buffer items to render above and below viewport
 * Ensures smooth scrolling without visible gaps
 */
const BUFFER_ITEMS = 5;

/**
 * SessionHistoryPanel Component
 *
 * Displays a list of session history with stats summary and expandable view.
 *
 * Features:
 * - Stats summary (total sessions, total XP, total listening time)
 * - List of recent sessions using SessionHistoryItem
 * - "Show More" button if more sessions exist
 * - Collapsible/expandable design
 * - Empty state when no history
 * - Full keyboard navigation and screen reader support
 * - Virtualization for large session lists (>100 items)
 */

export interface SessionHistoryPanelProps {
  /** Array of sessions to display */
  sessions: ListeningSessionWithTrack[];
  /** Maximum number of items to show initially (default: 10) */
  maxItems?: number;
  /** Whether to start collapsed */
  initiallyCollapsed?: boolean;
  /** Optional className */
  className?: string;
}

/**
 * Format total listening time to human-readable string
 */
function formatTotalTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    const remainingMins = mins > 0 ? ` ${mins}m` : '';
    return `${hours}h${remainingMins}`;
  }
  return `${mins}m`;
}

/**
 * Calculate aggregate stats from sessions
 */
function calculateSessionStats(sessions: ListeningSessionWithTrack[]) {
  const totalSessions = sessions.length;
  const totalXP = sessions.reduce((sum, s) => sum + (s.total_xp_earned || 0), 0);
  const totalListeningTime = sessions.reduce((sum, s) => sum + (s.duration_seconds || 0), 0);

  return {
    totalSessions,
    totalXP,
    totalListeningTime
  };
}

/**
 * SessionHistoryPanel component for displaying session history with stats.
 *
 * @example
 * ```tsx
 * <SessionHistoryPanel
 *   sessions={sessionHistory}
 *   maxItems={10}
 * />
 * ```
 */
export function SessionHistoryPanel({
  sessions,
  maxItems = 10,
  initiallyCollapsed = false,
  className = ''
}: SessionHistoryPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
  const [showAll, setShowAll] = useState(false);

  // Ref for the list container
  const listRef = useRef<HTMLDivElement>(null);

  // Track current focus index
  const focusIndexRef = useRef<number>(0);

  // Virtualization state - track scroll position for large lists
  const [scrollTop, setScrollTop] = useState(0);

  // Generate unique IDs for accessibility
  const uniqueId = useId();
  const contentId = `session-history-content-${uniqueId}`;

  // Calculate aggregate stats
  const stats = useMemo(() => calculateSessionStats(sessions), [sessions]);

  // Determine visible sessions based on showAll state
  const visibleSessions = useMemo(() => {
    if (showAll || sessions.length <= maxItems) {
      return sessions;
    }
    return sessions.slice(0, maxItems);
  }, [sessions, showAll, maxItems]);

  // Determine if virtualization should be enabled
  const shouldVirtualize = useMemo(() => {
    return showAll && sessions.length > VIRTUALIZATION_THRESHOLD;
  }, [showAll, sessions.length]);

  // Calculate virtualized range and padding
  const virtualization = useMemo(() => {
    if (!shouldVirtualize || !listRef.current) {
      return {
        startIndex: 0,
        endIndex: visibleSessions.length,
        paddingTop: 0,
        paddingBottom: 0
      };
    }

    const containerHeight = listRef.current.clientHeight || 500;
    const itemCount = visibleSessions.length;

    // Calculate visible range based on scroll position
    const startIndex = Math.max(0, Math.floor(scrollTop / ESTIMATED_ITEM_HEIGHT) - BUFFER_ITEMS);
    const visibleCount = Math.ceil(containerHeight / ESTIMATED_ITEM_HEIGHT) + (BUFFER_ITEMS * 2);
    const endIndex = Math.min(itemCount, startIndex + visibleCount);

    // Calculate padding to maintain scroll position
    const paddingTop = startIndex * ESTIMATED_ITEM_HEIGHT;
    const paddingBottom = Math.max(0, (itemCount - endIndex) * ESTIMATED_ITEM_HEIGHT);

    return { startIndex, endIndex, paddingTop, paddingBottom };
  }, [shouldVirtualize, scrollTop, visibleSessions.length]);

  // Sessions to actually render (virtualized subset or all)
  const renderedSessions = useMemo(() => {
    if (!shouldVirtualize) {
      return visibleSessions;
    }
    return visibleSessions.slice(virtualization.startIndex, virtualization.endIndex);
  }, [shouldVirtualize, visibleSessions, virtualization.startIndex, virtualization.endIndex]);

  // Scroll event handler for virtualization
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (shouldVirtualize) {
      setScrollTop(e.currentTarget.scrollTop);
    }
  }, [shouldVirtualize]);

  // Reset scroll position when showAll changes
  useEffect(() => {
    setScrollTop(0);
  }, [showAll]);

  const hasMoreSessions = sessions.length > maxItems;
  const remainingCount = sessions.length - maxItems;

  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev);
  };

  const toggleShowAll = () => {
    setShowAll(prev => !prev);
  };

  // Helper to focus an item by index
  const focusItem = useCallback((index: number) => {
    const items = listRef.current?.querySelectorAll<HTMLButtonElement>('[role="button"]');
    if (items && items[index]) {
      items[index].focus();
      focusIndexRef.current = index;
    }
  }, []);

  // Keyboard navigation for the session list
  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    const itemCount = visibleSessions.length;

    if (itemCount === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusItem(Math.min(focusIndexRef.current + 1, itemCount - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusItem(Math.max(focusIndexRef.current - 1, 0));
        break;
      case 'Home':
        e.preventDefault();
        focusItem(0);
        break;
      case 'End':
        e.preventDefault();
        focusItem(itemCount - 1);
        break;
    }
  }, [visibleSessions.length, focusItem]);

  // Empty state
  if (sessions.length === 0) {
    return (
      <div className={`session-history-panel ${className}`}>
        <div className="session-history-panel-header">
          <div className="session-history-panel-title-row">
            <History className="session-history-panel-icon" size={18} />
            <h3 className="session-history-panel-title">Session History</h3>
          </div>
        </div>
        <div className="session-history-panel-empty" role="status">
          <ScrollText className="session-history-panel-empty-icon" size={32} />
          <p className="session-history-panel-empty-text">No sessions yet</p>
          <p className="session-history-panel-empty-hint">
            Start a listening session to see your history here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`session-history-panel ${className}`}>
      {/* Header with collapse toggle */}
      <div
        className="session-history-panel-header"
        onClick={toggleCollapsed}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleCollapsed();
          }
        }}
        aria-expanded={!isCollapsed}
        aria-controls={contentId}
        aria-label={`Session History - ${stats.totalSessions} sessions. Click to ${isCollapsed ? 'expand' : 'collapse'}`}
      >
        <div className="session-history-panel-title-row">
          <History className="session-history-panel-icon" size={18} />
          <h3 className="session-history-panel-title">Session History</h3>
          <span className="session-history-panel-count">
            {stats.totalSessions} session{stats.totalSessions !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="session-history-panel-toggle">
          {isCollapsed ? (
            <ChevronDown size={18} className="session-history-panel-toggle-icon" />
          ) : (
            <ChevronUp size={18} className="session-history-panel-toggle-icon" />
          )}
        </div>
      </div>

      {/* Stats Summary Bar */}
      {!isCollapsed && (
        <div id={contentId} role="region" aria-label="Session history content">
        <>
          <div className="session-history-panel-stats">
            <div className="session-history-panel-stat">
              <List className="session-history-panel-stat-icon" size={14} />
              <span className="session-history-panel-stat-value">{stats.totalSessions}</span>
              <span className="session-history-panel-stat-label">Sessions</span>
            </div>
            <div className="session-history-panel-stat">
              <Zap className="session-history-panel-stat-icon" size={14} />
              <span className="session-history-panel-stat-value">
                {stats.totalXP.toLocaleString()}
              </span>
              <span className="session-history-panel-stat-label">XP</span>
            </div>
            <div className="session-history-panel-stat">
              <Clock className="session-history-panel-stat-icon" size={14} />
              <span className="session-history-panel-stat-value">
                {formatTotalTime(stats.totalListeningTime)}
              </span>
              <span className="session-history-panel-stat-label">Total Time</span>
            </div>
          </div>

          {/* Session List */}
          <div
            ref={listRef}
            className={`session-history-panel-list ${shouldVirtualize ? 'session-history-panel-list-virtualized' : ''}`}
            role="list"
            aria-label="Session history list"
            onKeyDown={handleListKeyDown}
            onScroll={handleScroll}
          >
            {/* Virtualization: Top padding for items not rendered */}
            {shouldVirtualize && virtualization.paddingTop > 0 && (
              <div
                className="session-history-panel-virtual-padding"
                style={{ height: virtualization.paddingTop }}
                aria-hidden="true"
              />
            )}
            {renderedSessions.map((session) => (
              <SessionHistoryItem
                key={session.start_time}
                session={session}
                className="session-history-panel-item"
              />
            ))}
            {/* Virtualization: Bottom padding for items not rendered */}
            {shouldVirtualize && virtualization.paddingBottom > 0 && (
              <div
                className="session-history-panel-virtual-padding"
                style={{ height: virtualization.paddingBottom }}
                aria-hidden="true"
              />
            )}
          </div>

          {/* Show More/Less Button */}
          {hasMoreSessions && (
            <div className="session-history-panel-footer">
              <button
                className="session-history-panel-show-more"
                onClick={toggleShowAll}
                aria-label={showAll ? 'Show fewer sessions' : `Show ${remainingCount} more sessions`}
              >
                <Headphones size={14} aria-hidden="true" />
                {showAll ? (
                  <>Show Less</>
                ) : (
                  <>Show {remainingCount} More</>
                )}
              </button>
            </div>
          )}
        </>
        </div>
      )}
    </div>
  );
}

export default SessionHistoryPanel;
