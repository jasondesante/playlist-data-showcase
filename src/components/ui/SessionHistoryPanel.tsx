import { useState, useMemo } from 'react';
import { ScrollText, ChevronDown, ChevronUp, Headphones, Zap, Clock, History, List } from 'lucide-react';
import { SessionHistoryItem } from './SessionHistoryItem';
import type { ListeningSessionWithTrack } from '@/types';
import './SessionHistoryPanel.css';

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

  // Calculate aggregate stats
  const stats = useMemo(() => calculateSessionStats(sessions), [sessions]);

  // Determine visible sessions based on showAll state
  const visibleSessions = useMemo(() => {
    if (showAll || sessions.length <= maxItems) {
      return sessions;
    }
    return sessions.slice(0, maxItems);
  }, [sessions, showAll, maxItems]);

  const hasMoreSessions = sessions.length > maxItems;
  const remainingCount = sessions.length - maxItems;

  const toggleCollapsed = () => {
    setIsCollapsed(prev => !prev);
  };

  const toggleShowAll = () => {
    setShowAll(prev => !prev);
  };

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
        <div className="session-history-panel-empty">
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
          <div className="session-history-panel-list">
            {visibleSessions.map((session, index) => (
              <SessionHistoryItem
                key={`${session.track_uuid}-${session.start_time}-${index}`}
                session={session}
                className="session-history-panel-item"
              />
            ))}
          </div>

          {/* Show More/Less Button */}
          {hasMoreSessions && (
            <div className="session-history-panel-footer">
              <button
                className="session-history-panel-show-more"
                onClick={toggleShowAll}
                aria-label={showAll ? 'Show fewer sessions' : `Show ${remainingCount} more sessions`}
              >
                <Headphones size={14} />
                {showAll ? (
                  <>Show Less</>
                ) : (
                  <>Show {remainingCount} More</>
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default SessionHistoryPanel;
