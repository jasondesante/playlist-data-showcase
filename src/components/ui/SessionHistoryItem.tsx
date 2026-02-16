import { useState, useMemo, useId } from 'react';
import { Music, Zap, Gamepad2, MapPin, Sun, Cloud, ChevronDown, ChevronUp, Headphones } from 'lucide-react';
import type { ListeningSessionWithTrack } from '@/types';
import './SessionHistoryItem.css';

/**
 * SessionHistoryItem Component
 *
 * Displays a single session from the session history with expandable details.
 *
 * Features:
 * - Track title (from session metadata or track_uuid)
 * - Duration in MM:SS format
 * - XP earned with bonus indicators
 * - Relative or absolute timestamp
 * - Environmental and gaming bonus icons
 * - Expandable to show full session details
 * - Full keyboard navigation and screen reader support
 */

export interface SessionHistoryItemProps {
  /** The session data to display */
  session: ListeningSessionWithTrack;
  /** Optional track data for additional info */
  className?: string;
  /** Whether to start in expanded state */
  initiallyExpanded?: boolean;
}

/**
 * Format duration in seconds to MM:SS
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Format a timestamp to relative time (e.g., "2 hours ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
  } else {
    // Fall back to absolute date for older sessions
    return new Date(timestamp).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

/**
 * Format an absolute timestamp
 */
function formatAbsoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get the display title for a session
 */
function getSessionTitle(session: ListeningSessionWithTrack): string {
  if (session.track_title) {
    return session.track_title;
  }
  // Fall back to truncated UUID if no track title
  return `Track ${session.track_uuid.slice(0, 8)}...`;
}

/**
 * Get the display artist for a session
 */
function getSessionArtist(session: ListeningSessionWithTrack): string | null {
  return session.track_artist || null;
}

/**
 * SessionHistoryItem component for displaying a single session in history.
 *
 * @example
 * ```tsx
 * <SessionHistoryItem session={sessionData} />
 * ```
 */
export function SessionHistoryItem({
  session,
  className = '',
  initiallyExpanded = false
}: SessionHistoryItemProps) {
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);

  // Generate unique IDs for accessibility
  const uniqueId = useId();
  const detailsId = `session-details-${uniqueId}`;

  // Calculate bonus indicators
  const hasEnvironmentalBonus = session.environmental_context && (
    session.environmental_context.biome ||
    session.environmental_context.weather ||
    session.environmental_context.geolocation ||
    session.environmental_context.light
  );

  const hasGamingBonus = session.gaming_context?.isActivelyGaming;

  // Memoize formatted values
  const title = useMemo(() => getSessionTitle(session), [session]);
  const artist = useMemo(() => getSessionArtist(session), [session]);
  const duration = useMemo(() => formatDuration(session.duration_seconds), [session.duration_seconds]);
  const relativeTime = useMemo(() => formatRelativeTime(session.end_time), [session.end_time]);
  const absoluteTime = useMemo(() => formatAbsoluteTime(session.end_time), [session.end_time]);

  // Calculate bonus XP amount
  const bonusXP = (session.bonus_xp || 0);

  const toggleExpanded = () => {
    setIsExpanded(prev => !prev);
  };

  return (
    <div
      className={`session-history-item ${isExpanded ? 'session-history-item-expanded' : ''} ${className}`}
      role="listitem"
    >
      {/* Main Row - Always Visible */}
      <div
        className="session-history-item-main"
        onClick={toggleExpanded}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        aria-label={`${title} - ${duration} - ${session.total_xp_earned} XP - ${relativeTime}. Click to ${isExpanded ? 'collapse' : 'expand'}`}
      >
        {/* Track Icon/Image */}
        <div className="session-history-item-icon">
          {session.track_image_url ? (
            <img
              src={session.track_image_url}
              alt={title}
              className="session-history-item-image"
            />
          ) : (
            <div className="session-history-item-image-placeholder">
              <Music size={14} />
            </div>
          )}
        </div>

        {/* Track Info */}
        <div className="session-history-item-info">
          <div className="session-history-item-title-row">
            <span className="session-history-item-title">{title}</span>
            {artist && (
              <span className="session-history-item-artist">{artist}</span>
            )}
          </div>
          <div className="session-history-item-meta">
            <span className="session-history-item-duration">
              <Headphones size={12} />
              {duration}
            </span>
            <span className="session-history-item-time">{relativeTime}</span>
          </div>
        </div>

        {/* XP Display */}
        <div className="session-history-item-xp-section">
          <span className="session-history-item-xp">+{session.total_xp_earned} XP</span>
          {/* Bonus Indicators */}
          {(hasEnvironmentalBonus || hasGamingBonus) && (
            <div className="session-history-item-bonus-icons" aria-label="Bonuses applied">
              {hasEnvironmentalBonus && (
                <span
                  className="session-history-item-bonus-icon session-history-item-bonus-environmental"
                  aria-label="Environmental bonus applied"
                  title="Environmental bonus"
                >
                  <Zap size={12} aria-hidden="true" />
                </span>
              )}
              {hasGamingBonus && (
                <span
                  className="session-history-item-bonus-icon session-history-item-bonus-gaming"
                  aria-label="Gaming bonus applied"
                  title="Gaming bonus"
                >
                  <Gamepad2 size={12} aria-hidden="true" />
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand/Collapse Toggle */}
        <div className="session-history-item-toggle">
          {isExpanded ? (
            <ChevronUp size={16} className="session-history-item-toggle-icon" />
          ) : (
            <ChevronDown size={16} className="session-history-item-toggle-icon" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div
          id={detailsId}
          className="session-history-item-details"
          role="region"
          aria-label="Session details"
        >
          {/* Session Details Grid */}
          <div className="session-history-item-details-grid">
            <div className="session-history-item-detail">
              <span className="session-history-item-detail-label">Start Time</span>
              <span className="session-history-item-detail-value">{absoluteTime}</span>
            </div>
            <div className="session-history-item-detail">
              <span className="session-history-item-detail-label">Duration</span>
              <span className="session-history-item-detail-value">{duration}</span>
            </div>
            <div className="session-history-item-detail">
              <span className="session-history-item-detail-label">Base XP</span>
              <span className="session-history-item-detail-value">{session.base_xp_earned} XP</span>
            </div>
            {bonusXP > 0 && (
              <div className="session-history-item-detail session-history-item-detail-bonus">
                <span className="session-history-item-detail-label">Bonus XP</span>
                <span className="session-history-item-detail-value">+{bonusXP} XP</span>
              </div>
            )}
            {session.activity_type && (
              <div className="session-history-item-detail">
                <span className="session-history-item-detail-label">Activity</span>
                <span className="session-history-item-detail-value">{session.activity_type}</span>
              </div>
            )}
          </div>

          {/* Environmental Context */}
          {session.environmental_context && (
            <div className="session-history-item-context">
              <h4 className="session-history-item-context-title">
                <MapPin size={14} />
                Environmental Context
              </h4>
              <div className="session-history-item-context-grid">
                {session.environmental_context.biome && (
                  <div className="session-history-item-context-item">
                    <span className="session-history-item-context-label">Biome</span>
                    <span className="session-history-item-context-value">
                      {session.environmental_context.biome}
                    </span>
                  </div>
                )}
                {session.environmental_context.weather && (
                  <div className="session-history-item-context-item">
                    <Cloud size={12} className="session-history-item-context-icon" />
                    <span className="session-history-item-context-label">Weather</span>
                    <span className="session-history-item-context-value">
                      {typeof session.environmental_context.weather === 'string'
                        ? session.environmental_context.weather
                        : 'Recorded'}
                    </span>
                  </div>
                )}
                {session.environmental_context.light !== undefined && (
                  <div className="session-history-item-context-item">
                    <Sun size={12} className="session-history-item-context-icon" />
                    <span className="session-history-item-context-label">Light</span>
                    <span className="session-history-item-context-value">
                      {typeof session.environmental_context.light === 'number'
                        ? `${Math.round(session.environmental_context.light)} lux`
                        : 'Recorded'}
                    </span>
                  </div>
                )}
                {session.environmental_context.geolocation && (
                  <div className="session-history-item-context-item">
                    <MapPin size={12} className="session-history-item-context-icon" />
                    <span className="session-history-item-context-label">Location</span>
                    <span className="session-history-item-context-value">
                      {session.environmental_context.geolocation.latitude?.toFixed(4)},
                      {session.environmental_context.geolocation.longitude?.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Gaming Context */}
          {session.gaming_context && (
            <div className="session-history-item-context">
              <h4 className="session-history-item-context-title">
                <Gamepad2 size={14} />
                Gaming Context
              </h4>
              <div className="session-history-item-context-grid">
                <div className="session-history-item-context-item">
                  <span className="session-history-item-context-label">Is Gaming</span>
                  <span className="session-history-item-context-value">
                    {session.gaming_context.isActivelyGaming ? 'Yes' : 'No'}
                  </span>
                </div>
                {session.gaming_context.platformSource && (
                  <div className="session-history-item-context-item">
                    <span className="session-history-item-context-label">Platform</span>
                    <span className="session-history-item-context-value">
                      {session.gaming_context.platformSource}
                    </span>
                  </div>
                )}
                {session.gaming_context.currentGame && (
                  <div className="session-history-item-context-item">
                    <span className="session-history-item-context-label">Game</span>
                    <span className="session-history-item-context-value">
                      {session.gaming_context.currentGame.name}
                    </span>
                  </div>
                )}
                {session.gaming_context.currentGame?.sessionDuration && (
                  <div className="session-history-item-context-item">
                    <span className="session-history-item-context-label">Session</span>
                    <span className="session-history-item-context-value">
                      {session.gaming_context.currentGame.sessionDuration} min
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SessionHistoryItem;
