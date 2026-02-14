import { useRef, useState, useEffect, useCallback } from 'react';
import { RefreshCw, Pause } from 'lucide-react';
import type { AudioTimelineEvent } from '../../types';
import './TimelineScrubber.css';

/**
 * Props for the TimelineScrubber component
 */
interface TimelineScrubberProps {
  /** Array of timeline events to visualize and scrub through */
  events: AudioTimelineEvent[];
  /** Index of the currently selected event */
  selectedIndex: number;
  /** Callback when selection changes */
  onSelectionChange: (index: number) => void;
  /** Current audio playback time in seconds */
  currentTime?: number;
  /** Total audio duration in seconds */
  duration?: number;
  /** Whether audio sync is currently enabled */
  audioSyncEnabled?: boolean;
  /** Callback to toggle audio sync */
  onAudioSyncToggle?: () => void;
  /** Callback to seek audio to a specific time */
  onSeek?: (time: number) => void;
  /** Number of surrounding events to highlight as context window */
  contextWindow?: number;
  /** Optional className for custom styling */
  className?: string;
}

/**
 * Format time in seconds to MM:SS display format
 */
function formatTime(seconds: number): string {
  // Handle NaN, Infinity, or negative values
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '--:--';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * TimelineScrubber Component
 *
 * An interactive timeline scrubber for navigating through audio analysis data points.
 * Displays waveform-style bars representing timeline events and provides
 * drag interaction for scrubbing, plus audio sync functionality.
 *
 * Features:
 * - Visual waveform bar display
 * - Draggable playhead with context window highlighting
 * - Mouse and touch interaction support
 * - Audio sync toggle for automatic following during playback
 * - Current time and point counter display
 *
 * @example
 * ```tsx
 * <TimelineScrubber
 *   events={timelineEvents}
 *   selectedIndex={selectedIdx}
 *   onSelectionChange={setSelectedIdx}
 *   currentTime={currentTime}
 *   duration={duration}
 *   audioSyncEnabled={syncEnabled}
 *   onAudioSyncToggle={() => setSyncEnabled(!syncEnabled)}
 *   onSeek={seek}
 * />
 * ```
 */
export function TimelineScrubber({
  events,
  selectedIndex,
  onSelectionChange,
  currentTime = 0,
  duration = 0,
  audioSyncEnabled = false,
  onAudioSyncToggle,
  onSeek,
  contextWindow = 2,
  className,
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  /**
   * Calculate the index from a mouse/touch position on the track
   */
  const getIndexFromPosition = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || events.length === 0) return 0;

      const rect = trackRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const index = Math.round(relativeX * (events.length - 1));

      return Math.max(0, Math.min(events.length - 1, index));
    },
    [events.length]
  );

  /**
   * Handle mouse down on track - start drag
   */
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const index = getIndexFromPosition(e.clientX);
      onSelectionChange(index);
    },
    [getIndexFromPosition, onSelectionChange]
  );

  /**
   * Handle mouse move during drag
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const index = getIndexFromPosition(e.clientX);
      onSelectionChange(index);

      // If audio sync is enabled, also seek audio
      if (audioSyncEnabled && onSeek && events[index]) {
        onSeek(events[index].timestamp);
      }
    },
    [isDragging, getIndexFromPosition, onSelectionChange, audioSyncEnabled, onSeek, events]
  );

  /**
   * Handle mouse up - end drag
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Handle touch start
   */
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      setIsDragging(true);
      const index = getIndexFromPosition(touch.clientX);
      onSelectionChange(index);
    },
    [getIndexFromPosition, onSelectionChange]
  );

  /**
   * Handle touch move
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      const touch = e.touches[0];
      const index = getIndexFromPosition(touch.clientX);
      onSelectionChange(index);

      if (audioSyncEnabled && onSeek && events[index]) {
        onSeek(events[index].timestamp);
      }
    },
    [isDragging, getIndexFromPosition, onSelectionChange, audioSyncEnabled, onSeek, events]
  );

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Add global mouse event listeners when dragging
   */
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  /**
   * Auto-follow: Update selection based on current audio time when sync is enabled
   * This effect is skipped while the user is actively dragging to prevent interference
   */
  useEffect(() => {
    // Don't auto-follow if sync is disabled, no events, no valid duration, or user is dragging
    if (!audioSyncEnabled || events.length === 0 || !Number.isFinite(duration) || duration === 0 || isDragging) return;

    // Find the closest event to the current time
    const closestIndex = events.reduce((closestIdx, event, idx) => {
      const currentDiff = Math.abs(events[closestIdx].timestamp - currentTime);
      const newDiff = Math.abs(event.timestamp - currentTime);
      return newDiff < currentDiff ? idx : closestIdx;
    }, 0);

    if (closestIndex !== selectedIndex) {
      onSelectionChange(closestIndex);
    }
  }, [audioSyncEnabled, currentTime, events, selectedIndex, onSelectionChange, duration, isDragging]);

  /**
   * Handle hover on event bar
   */
  const handleBarMouseEnter = (index: number) => {
    if (!isDragging) {
      setHoveredIndex(index);
    }
  };

  /**
   * Handle mouse leave from event bar
   */
  const handleBarMouseLeave = () => {
    setHoveredIndex(null);
  };

  /**
   * Handle click on event bar
   */
  const handleBarClick = (index: number) => {
    onSelectionChange(index);
    if (audioSyncEnabled && onSeek && events[index]) {
      onSeek(events[index].timestamp);
    }
  };

  // Calculate playhead position
  const playheadPosition = events.length > 1 ? (selectedIndex / (events.length - 1)) * 100 : 0;

  // Get selected event data
  const selectedEvent = events[selectedIndex];

  // Determine if a bar index is in the context window
  const isInContextWindow = (index: number): boolean => {
    const start = Math.max(0, selectedIndex - contextWindow);
    const end = Math.min(events.length - 1, selectedIndex + contextWindow);
    return index >= start && index <= end;
  };

  return (
    <div className={`timeline-scrubber ${className || ''}`}>
      {/* Header: Time display and point counter */}
      <div className="timeline-scrubber-header">
        <div className="timeline-scrubber-time">
          <span className="timeline-scrubber-time-current">
            {selectedEvent ? formatTime(selectedEvent.timestamp) : '0:00'}
          </span>
          <span className="timeline-scrubber-time-separator">/</span>
          <span className="timeline-scrubber-time-total">
            {Number.isFinite(duration) && duration > 0 ? formatTime(duration) : '--:--'}
          </span>
        </div>

        <div className="timeline-scrubber-point-counter">
          Point {selectedIndex + 1} of {events.length}
        </div>

        {/* Audio sync toggle button */}
        {onAudioSyncToggle && (
          <button
            type="button"
            className={`timeline-scrubber-sync-btn ${audioSyncEnabled ? 'timeline-scrubber-sync-btn-active' : ''}`}
            onClick={onAudioSyncToggle}
            title={audioSyncEnabled ? 'Disable audio sync' : 'Enable audio sync'}
            aria-label={audioSyncEnabled ? 'Disable audio sync' : 'Enable audio sync'}
            aria-pressed={audioSyncEnabled}
          >
            {audioSyncEnabled ? <RefreshCw size={14} /> : <Pause size={14} />}
          </button>
        )}
      </div>

      {/* Track container */}
      <div
        ref={trackRef}
        className="timeline-scrubber-track"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="slider"
        aria-label="Timeline scrubber"
        aria-valuemin={0}
        aria-valuemax={events.length - 1}
        aria-valuenow={selectedIndex}
        tabIndex={0}
      >
        {/* Background track */}
        <div className="timeline-scrubber-track-bg" />

        {/* Event bars (waveform visualization) */}
        <div className="timeline-scrubber-bars">
          {events.map((event, index) => {
            // Use amplitude for bar height, normalized to 0.2-1.0 range for visibility
            const heightPercent = 20 + event.amplitude * 80;

            return (
              <div
                key={index}
                className={`timeline-scrubber-bar ${
                  index === selectedIndex ? 'timeline-scrubber-bar-selected' : ''
                } ${isInContextWindow(index) ? 'timeline-scrubber-bar-context' : ''} ${
                  index === hoveredIndex ? 'timeline-scrubber-bar-hovered' : ''
                }`}
                style={{
                  height: `${heightPercent}%`,
                  // Color based on dominant frequency
                  '--bar-color':
                    event.bass > event.mid && event.bass > event.treble
                      ? 'hsl(221, 83%, 53%)' // Bass dominant - blue
                      : event.mid > event.treble
                        ? 'hsl(142, 76%, 50%)' // Mid dominant - green
                        : 'hsl(24, 95%, 53%)', // Treble dominant - orange
                } as React.CSSProperties}
                onMouseEnter={() => handleBarMouseEnter(index)}
                onMouseLeave={handleBarMouseLeave}
                onClick={(e) => {
                  e.stopPropagation();
                  handleBarClick(index);
                }}
                title={`${formatTime(event.timestamp)} - Bass: ${(event.bass * 100).toFixed(0)}%, Mid: ${(event.mid * 100).toFixed(0)}%, Treble: ${(event.treble * 100).toFixed(0)}%`}
              />
            );
          })}
        </div>

        {/* Playhead indicator */}
        <div
          className="timeline-scrubber-playhead"
          style={{ left: `${playheadPosition}%` }}
        >
          <div className="timeline-scrubber-playhead-line" />
          <div className="timeline-scrubber-playhead-handle" />
        </div>

        {/* Context window highlight overlay */}
        <div
          className="timeline-scrubber-context-overlay"
          style={{
            left: `${Math.max(0, (selectedIndex - contextWindow) / (events.length - 1)) * 100}%`,
            width: `${Math.min(100, ((contextWindow * 2 + 1) / events.length) * 100)}%`,
          }}
        />
      </div>

      {/* Footer: Instructions */}
      <div className="timeline-scrubber-footer">
        <span className="timeline-scrubber-hint">
          {isDragging ? 'Release to set position' : 'Drag or click to navigate'}
        </span>
        {audioSyncEnabled && (
          <span className="timeline-scrubber-sync-status">
            <RefreshCw size={10} className="timeline-scrubber-sync-icon" />
            Synced to audio
          </span>
        )}
      </div>
    </div>
  );
}

export default TimelineScrubber;
