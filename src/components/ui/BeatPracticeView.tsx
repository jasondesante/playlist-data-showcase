/**
 * BeatPracticeView Component
 *
 * The main container for the beat detection practice mode experience.
 * Integrates audio playback, beat visualization, and tap accuracy features.
 *
 * Features:
 * - Full-width container for the practice experience
 * - Layout: Timeline visualization at top, tap area below
 * - Integration with useAudioPlayerStore for playback state
 * - Integration with useBeatStream for beat sync
 * - Keyboard event handling (spacebar for tap)
 * - Current BPM and song position display
 *
 * Part of Task 3.2: BeatPracticeView Component (The Main Container)
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { Play, Pause, SkipBack, X, Music, Activity } from 'lucide-react';
import './BeatPracticeView.css';
import { useBeatDetectionStore } from '../../store/beatDetectionStore';
import { useBeatStream } from '../../hooks/useBeatStream';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { Button } from './Button';
import { BeatTimeline } from './BeatTimeline';
import { TapArea, useTapFeedback } from './TapArea';
import { TapStats } from './TapStats';
import { logger } from '../../utils/logger';

/**
 * Minimum time between taps in milliseconds.
 * Prevents accidental double-taps and spam tapping.
 * 100ms is reasonable - faster than human reaction time but
 * prevents most accidental rapid taps.
 */
const MIN_TAP_INTERVAL_MS = 100;

interface BeatPracticeViewProps {
  /** Callback to exit practice mode */
  onExit: () => void;
}

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function BeatPracticeView({ onExit }: BeatPracticeViewProps) {
  // Store state and actions
  const beatMap = useBeatDetectionStore((state) => state.beatMap);
  const stopPracticeMode = useBeatDetectionStore((state) => state.actions.stopPracticeMode);
  const recordTap = useBeatDetectionStore((state) => state.actions.recordTap);

  // Audio player state
  const { playbackState, currentTime, duration, pause, resume, seek } = useAudioPlayerStore();
  const isPlaying = playbackState === 'playing';

  // Beat stream hook for real-time sync
  const {
    currentBpm,
    upcomingBeats,
    lastBeatEvent,
    checkTap,
    isActive: streamIsActive,
    isPaused: streamIsPaused,
    seekStream,
  } = useBeatStream(beatMap, undefined, true);

  // Tap feedback hook for managing visual feedback
  const { showFeedback, lastTapResult, showTapFeedback, hideTapFeedback } = useTapFeedback(500);

  // Ref for tap area to handle keyboard focus
  const containerRef = useRef<HTMLDivElement>(null);

  // Refs for progress bar dragging
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  // Ref for tap debouncing - tracks last tap timestamp
  const lastTapTimeRef = useRef<number>(0);

  // State for showing "TOO FAST" indicator
  const [showTooFast, setShowTooFast] = useState(false);
  const tooFastTimeoutRef = useRef<number | null>(null);

  /**
   * Handle tap action (spacebar or click)
   * Includes debouncing to prevent rapid accidental taps.
   */
  const handleTap = useCallback(() => {
    if (!streamIsActive) return;

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    // Check if tap is too fast (debounce check)
    if (timeSinceLastTap < MIN_TAP_INTERVAL_MS) {
      // Show "TOO FAST" indicator
      setShowTooFast(true);

      // Clear any existing timeout
      if (tooFastTimeoutRef.current) {
        clearTimeout(tooFastTimeoutRef.current);
      }

      // Hide indicator after a short delay
      tooFastTimeoutRef.current = window.setTimeout(() => {
        setShowTooFast(false);
      }, 300);

      // Log for debugging
      logger.debug('BeatDetection', 'Tap rejected - too fast', {
        timeSinceLastTap,
        minInterval: MIN_TAP_INTERVAL_MS,
      });

      return; // Reject the tap
    }

    // Update last tap time
    lastTapTimeRef.current = now;

    const result = checkTap();
    if (result) {
      // Record in store
      recordTap(result);

      // Show visual feedback using the hook
      showTapFeedback(result);
    }
  }, [checkTap, recordTap, streamIsActive, showTapFeedback]);

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore key repeat events (when user holds down the key)
      if (event.repeat) return;

      if (event.code === 'Space') {
        event.preventDefault(); // Prevent page scroll
        handleTap();
      } else if (event.code === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTap, onExit]);

  /**
   * Handle seek events
   */
  const handleSeek = useCallback((time: number) => {
    seek(time);
    seekStream(time);
  }, [seek, seekStream]);

  /**
   * Handle play/pause toggle
   */
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  /**
   * Handle exit practice mode
   */
  const handleExit = useCallback(() => {
    stopPracticeMode();
    onExit();
  }, [stopPracticeMode, onExit]);

  /**
   * Calculate time from progress bar position
   */
  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!progressBarRef.current || duration === 0) return 0;

    const rect = progressBarRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return relativeX * duration;
  }, [duration]);

  /**
   * Handle progress bar mouse down - start drag
   */
  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingProgress(true);
    const time = getTimeFromPosition(e.clientX);
    handleSeek(time);
  }, [getTimeFromPosition, handleSeek]);

  /**
   * Handle progress bar mouse move during drag
   */
  const handleProgressMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingProgress) return;
    const time = getTimeFromPosition(e.clientX);
    handleSeek(time);
  }, [isDraggingProgress, getTimeFromPosition, handleSeek]);

  /**
   * Handle progress bar mouse up - end drag
   */
  const handleProgressMouseUp = useCallback(() => {
    setIsDraggingProgress(false);
  }, []);

  /**
   * Handle progress bar touch start
   */
  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDraggingProgress(true);
    const time = getTimeFromPosition(touch.clientX);
    handleSeek(time);
  }, [getTimeFromPosition, handleSeek]);

  /**
   * Handle progress bar touch move
   */
  const handleProgressTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingProgress) return;
    const touch = e.touches[0];
    const time = getTimeFromPosition(touch.clientX);
    handleSeek(time);
  }, [isDraggingProgress, getTimeFromPosition, handleSeek]);

  /**
   * Handle progress bar touch end
   */
  const handleProgressTouchEnd = useCallback(() => {
    setIsDraggingProgress(false);
  }, []);

  /**
   * Add global mouse event listeners when dragging progress bar
   */
  useEffect(() => {
    if (isDraggingProgress) {
      window.addEventListener('mousemove', handleProgressMouseMove);
      window.addEventListener('mouseup', handleProgressMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleProgressMouseMove);
        window.removeEventListener('mouseup', handleProgressMouseUp);
      };
    }
  }, [isDraggingProgress, handleProgressMouseMove, handleProgressMouseUp]);

  /**
   * Cleanup for tooFast timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (tooFastTimeoutRef.current) {
        clearTimeout(tooFastTimeoutRef.current);
      }
    };
  }, []);

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Don't render if no beat map
  if (!beatMap) {
    return null;
  }

  return (
    <div className="beat-practice-view" ref={containerRef}>
      {/* Header Bar */}
      <div className="beat-practice-header">
        <div className="beat-practice-header-left">
          <Music className="beat-practice-header-icon" />
          <span className="beat-practice-title">Practice Mode</span>
        </div>
        <div className="beat-practice-header-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            leftIcon={X}
            aria-label="Exit practice mode"
          >
            Exit
          </Button>
        </div>
      </div>

      {/* BPM and Position Display */}
      <div className="beat-practice-stats">
        <div className="beat-practice-stat">
          <span className={`beat-practice-stat-value ${currentBpm > 0 ? 'beat-practice-stat-value--live' : ''}`}>
            {Math.round(currentBpm) || Math.round(beatMap.bpm)}
          </span>
          <span className="beat-practice-stat-label">
            BPM
            {currentBpm > 0 && <span className="beat-practice-bpm-indicator">rolling</span>}
          </span>
        </div>
        <div className="beat-practice-stat">
          <span className="beat-practice-stat-value">{formatTime(currentTime)}</span>
          <span className="beat-practice-stat-label">Position</span>
        </div>
        <div className="beat-practice-stat">
          <span className="beat-practice-stat-value">{formatTime(duration)}</span>
          <span className="beat-practice-stat-label">Duration</span>
        </div>
      </div>

      {/* Progress Bar for Absolute Seeking */}
      <div className="beat-practice-progress-container">
        <div
          ref={progressBarRef}
          className={`beat-practice-progress-bar ${isDraggingProgress ? 'beat-practice-progress-bar--dragging' : ''}`}
          onMouseDown={handleProgressMouseDown}
          onTouchStart={handleProgressTouchStart}
          onTouchMove={handleProgressTouchMove}
          onTouchEnd={handleProgressTouchEnd}
          role="slider"
          aria-label="Song progress"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          tabIndex={0}
        >
          {/* Background track */}
          <div className="beat-practice-progress-track" />

          {/* Progress fill */}
          <div
            className="beat-practice-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />

          {/* Beat markers on progress bar */}
          <div className="beat-practice-progress-beats">
            {beatMap.beats.filter((_, i) => i % Math.ceil(beatMap.beats.length / 50) === 0).map((beat, i) => (
              <div
                key={i}
                className={`beat-practice-progress-beat ${beat.isDownbeat ? 'beat-practice-progress-beat--downbeat' : ''}`}
                style={{ left: `${(beat.timestamp / duration) * 100}%` }}
              />
            ))}
          </div>

          {/* Playhead handle */}
          <div
            className="beat-practice-progress-handle"
            style={{ left: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Beat Timeline Visualization */}
      <BeatTimeline
        beatMap={beatMap}
        currentTime={currentTime}
        upcomingBeats={upcomingBeats}
        lastBeatEvent={lastBeatEvent}
        onSeek={handleSeek}
        anticipationWindow={2.0}
        isPlaying={isPlaying}
        audioContext={null}
      />

      {/* Playback Controls */}
      <div className="beat-practice-controls">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSeek(0)}
          leftIcon={SkipBack}
          aria-label="Restart"
        >
          Restart
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handlePlayPause}
          leftIcon={isPlaying ? Pause : Play}
          className="beat-practice-play-button"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
      </div>

      {/* Tap Area - Using the dedicated TapArea component */}
      <TapArea
        onTap={handleTap}
        isActive={streamIsActive}
        lastTapResult={lastTapResult}
        showFeedback={showFeedback}
        feedbackDuration={500}
        onFeedbackComplete={hideTapFeedback}
        showTooFast={showTooFast}
      />

      {/* Tap Statistics - Using dedicated TapStats component */}
      <TapStats />

      {/* Stream status indicator */}
      <div className="beat-practice-stream-status">
        <Activity
          className={`beat-practice-stream-icon ${streamIsActive && !streamIsPaused ? 'beat-practice-stream-icon--active' : ''} ${streamIsPaused ? 'beat-practice-stream-icon--paused' : ''}`}
        />
        <span className="beat-practice-stream-label">
          {streamIsActive
            ? (streamIsPaused ? 'Beat stream paused' : 'Beat stream active')
            : 'Beat stream inactive'}
        </span>
      </div>
    </div>
  );
}
