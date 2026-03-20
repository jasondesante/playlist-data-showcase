/**
 * TimelineControls Component
 *
 * Provides unified playback and zoom controls for timeline visualizations.
 * Features:
 * - Play/pause button synced with audioPlayerStore
 * - Zoom in/out controls for adjusting timeline view
 * - Timeline scrubber/progress bar for seeking
 * - Current time and duration display
 *
 * Part of Task 9.3: Add timeline controls
 */

import { useRef, useCallback, useState, useEffect } from 'react';
import { Play, Pause, ZoomIn, ZoomOut, SkipBack, SkipForward } from 'lucide-react';
import { Button } from './Button';
import './TimelineControls.css';

// ============================================================
// Types
// ============================================================

export interface TimelineControlsProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total duration in seconds */
  duration: number;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Callback to toggle play/pause */
  onPlayPause: () => void;
  /** Callback to seek to a specific time */
  onSeek: (time: number) => void;
  /** Current zoom level (affects visible time window) */
  zoomLevel?: number;
  /** Minimum zoom level */
  minZoom?: number;
  /** Maximum zoom level */
  maxZoom?: number;
  /** Callback when zoom level changes */
  onZoomChange?: (level: number) => void;
  /** Whether to show skip buttons */
  showSkipButtons?: boolean;
  /** Skip interval in seconds (default: 10) */
  skipInterval?: number;
  /** Additional CSS class names */
  className?: string;
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Format time in seconds to MM:SS display format
 */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================
// Sub-components
// ============================================================

interface ScrubberProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  bufferedRanges?: Array<{ start: number; end: number }>;
}

/**
 * Timeline scrubber/progress bar for seeking.
 * Supports click-to-seek and drag-to-scrub functionality.
 */
function TimelineScrubber({ currentTime, duration, onSeek, bufferedRanges }: ScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number>(0);

  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Calculate time from position
  const getTimeFromPosition = useCallback(
    (clientX: number): number => {
      if (!trackRef.current || duration <= 0) return 0;

      const rect = trackRef.current.getBoundingClientRect();
      const relativeX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return relativeX * duration;
    },
    [duration]
  );

  // Handle mouse down - start drag
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
      setDragPosition((time / duration) * 100);
    },
    [getTimeFromPosition, onSeek, duration]
  );

  // Handle mouse move during drag
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!trackRef.current) return;

      const time = getTimeFromPosition(e.clientX);

      if (isDragging) {
        onSeek(time);
        setDragPosition((time / duration) * 100);
      } else {
        // Update hover state
        setHoverPosition((time / duration) * 100);
        setHoverTime(time);
      }
    },
    [isDragging, getTimeFromPosition, onSeek, duration]
  );

  // Handle mouse up - end drag
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragPosition(null);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoverPosition(null);
  }, []);

  // Add global mouse event listeners when dragging
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

  // Calculate buffered percentage (for buffered indicator)
  const bufferedPercent = bufferedRanges
    ? bufferedRanges.reduce((total, range) => {
        if (range.end <= currentTime) return total;
        const visibleStart = Math.max(range.start, currentTime);
        const visibleEnd = Math.min(range.end, duration);
        return total + ((visibleEnd - visibleStart) / duration) * 100;
      }, 0)
    : 0;

  return (
    <div
      ref={trackRef}
      className={`timeline-scrubber-track ${isDragging ? 'timeline-scrubber-track--dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        const time = getTimeFromPosition(e.clientX);
        setHoverPosition((time / duration) * 100);
        setHoverTime(time);
      }}
      onMouseLeave={handleMouseLeave}
      role="slider"
      aria-label="Timeline scrubber"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      tabIndex={0}
    >
      {/* Buffered indicator */}
      {bufferedPercent > 0 && (
        <div
          className="timeline-scrubber-buffered"
          style={{
            left: `${progress}%`,
            width: `${bufferedPercent}%`,
          }}
        />
      )}

      {/* Progress fill */}
      <div
        className="timeline-scrubber-progress"
        style={{ width: `${dragPosition !== null ? dragPosition : progress}%` }}
      />

      {/* Hover indicator */}
      {hoverPosition !== null && !isDragging && (
        <div
          className="timeline-scrubber-hover"
          style={{ left: `${hoverPosition}%` }}
        >
          <div className="timeline-scrubber-hover-tooltip">
            {formatTime(hoverTime)}
          </div>
        </div>
      )}

      {/* Playhead handle */}
      <div
        className="timeline-scrubber-handle"
        style={{ left: `${dragPosition !== null ? dragPosition : progress}%` }}
      />
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

/**
 * TimelineControls
 *
 * Unified playback controls for timeline visualizations.
 * Provides play/pause, zoom, and scrubber controls.
 */
export function TimelineControls({
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  onSeek,
  zoomLevel = 1,
  minZoom = 0.5,
  maxZoom = 4,
  onZoomChange,
  showSkipButtons = true,
  skipInterval = 10,
  className,
}: TimelineControlsProps) {
  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    if (onZoomChange) {
      const newLevel = Math.min(maxZoom, zoomLevel * 1.5);
      onZoomChange(newLevel);
    }
  }, [onZoomChange, zoomLevel, maxZoom]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    if (onZoomChange) {
      const newLevel = Math.max(minZoom, zoomLevel / 1.5);
      onZoomChange(newLevel);
    }
  }, [onZoomChange, zoomLevel, minZoom]);

  // Handle skip backward
  const handleSkipBackward = useCallback(() => {
    onSeek(Math.max(0, currentTime - skipInterval));
  }, [onSeek, currentTime, skipInterval]);

  // Handle skip forward
  const handleSkipForward = useCallback(() => {
    onSeek(Math.min(duration, currentTime + skipInterval));
  }, [onSeek, currentTime, duration, skipInterval]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          onPlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkipBackward();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkipForward();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
      }
    },
    [onPlayPause, handleSkipBackward, handleSkipForward, handleZoomIn, handleZoomOut]
  );

  return (
    <div
      className={`timeline-controls ${className || ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* Time display */}
      <div className="timeline-controls-time">
        <span className="timeline-controls-time-current">
          {formatTime(currentTime)}
        </span>
        <span className="timeline-controls-time-separator">/</span>
        <span className="timeline-controls-time-total">
          {formatTime(duration)}
        </span>
      </div>

      {/* Playback controls */}
      <div className="timeline-controls-playback">
        {showSkipButtons && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipBackward}
            aria-label={`Skip back ${skipInterval} seconds`}
            className="timeline-controls-skip-btn"
          >
            <SkipBack size={16} />
          </Button>
        )}

        <Button
          variant="primary"
          size="md"
          onClick={onPlayPause}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="timeline-controls-play-btn"
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </Button>

        {showSkipButtons && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipForward}
            aria-label={`Skip forward ${skipInterval} seconds`}
            className="timeline-controls-skip-btn"
          >
            <SkipForward size={16} />
          </Button>
        )}
      </div>

      {/* Scrubber */}
      <div className="timeline-controls-scrubber">
        <TimelineScrubber
          currentTime={currentTime}
          duration={duration}
          onSeek={onSeek}
        />
      </div>

      {/* Zoom controls */}
      {onZoomChange && (
        <div className="timeline-controls-zoom">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            disabled={zoomLevel <= minZoom}
            aria-label="Zoom out"
            className="timeline-controls-zoom-btn"
          >
            <ZoomOut size={16} />
          </Button>
          <span className="timeline-controls-zoom-level">
            {zoomLevel.toFixed(1)}x
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            disabled={zoomLevel >= maxZoom}
            aria-label="Zoom in"
            className="timeline-controls-zoom-btn"
          >
            <ZoomIn size={16} />
          </Button>
        </div>
      )}
    </div>
  );
}

export default TimelineControls;
