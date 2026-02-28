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
import { Play, Pause, SkipBack, X, Music, Activity, Clock, Settings, Target } from 'lucide-react';
import './BeatPracticeView.css';
import { useBeatDetectionStore, useDifficultyPreset, useAccuracyThresholds } from '../../store/beatDetectionStore';
import { useBeatStream } from '../../hooks/useBeatStream';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { Button } from './Button';
import { BeatTimeline } from './BeatTimeline';
import { TapArea, useTapFeedback } from './TapArea';
import { TapStats } from './TapStats';
import { DifficultySettingsPanel } from './DifficultySettingsPanel';
import { logger } from '../../utils/logger';
import type { ExtendedBeatAccuracy, DifficultyPreset } from '../../types';

/**
 * Minimum time between taps in milliseconds.
 * Prevents accidental double-taps and spam tapping.
 * 100ms is reasonable - faster than human reaction time but
 * prevents most accidental rapid taps.
 */
const MIN_TAP_INTERVAL_MS = 100;

/**
 * Debug info for a single tap - helps track input latency
 */
interface TapDebugInfo {
  /** When the tap was registered (performance.now()) */
  registeredAt: number;
  /** Audio time at the moment of tap */
  audioTime: number;
  /** The beat that was matched */
  beatTime: number;
  /** Calculated offset in ms */
  offsetMs: number;
  /** Accuracy rating (includes 'ok') */
  accuracy: ExtendedBeatAccuracy;
}

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

/**
 * Get display info for a difficulty preset
 */
function getDifficultyDisplayInfo(preset: DifficultyPreset): { label: string; className: string } {
  switch (preset) {
    case 'easy':
      return { label: 'Easy', className: 'beat-practice-difficulty--easy' };
    case 'medium':
      return { label: 'Medium', className: 'beat-practice-difficulty--medium' };
    case 'hard':
      return { label: 'Hard', className: 'beat-practice-difficulty--hard' };
    case 'custom':
      return { label: 'Custom', className: 'beat-practice-difficulty--custom' };
    default:
      return { label: 'Medium', className: 'beat-practice-difficulty--medium' };
  }
}

/**
 * Format threshold value for display (convert seconds to ms)
 */
function formatThresholdMs(seconds: number): string {
  return `${Math.round(seconds * 1000)}ms`;
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

  // State for tap visual feedback on timeline
  const [tapVisualTime, setTapVisualTime] = useState<number>(0);

  // Debug: track recent taps for timing analysis
  const [tapDebugHistory, setTapDebugHistory] = useState<TapDebugInfo[]>([]);
  const MAX_DEBUG_HISTORY = 5;

  // Track audio time for debug info
  const audioTimeRef = useRef<number>(currentTime);
  audioTimeRef.current = currentTime;

  // State for showing "TOO FAST" indicator
  const [showTooFast, setShowTooFast] = useState(false);
  const tooFastTimeoutRef = useRef<number | null>(null);

  // State for difficulty settings panel
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  // Difficulty settings for visual feedback
  const difficultyPreset = useDifficultyPreset();
  const accuracyThresholds = useAccuracyThresholds();

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

      // Trigger timeline tap visual
      setTapVisualTime(Date.now());

      // Record debug info for timing analysis
      const debugInfo: TapDebugInfo = {
        registeredAt: performance.now(),
        audioTime: audioTimeRef.current,
        beatTime: result.matchedBeat.timestamp,
        offsetMs: Math.round(result.offset * 1000),
        accuracy: result.accuracy,
      };
      setTapDebugHistory(prev => [debugInfo, ...prev].slice(0, MAX_DEBUG_HISTORY));
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

  // Get difficulty display info
  const difficultyInfo = getDifficultyDisplayInfo(difficultyPreset);

  return (
    <div className="beat-practice-view" ref={containerRef}>
      {/* Header Bar */}
      <div className="beat-practice-header">
        <div className="beat-practice-header-left">
          <Music className="beat-practice-header-icon" />
          <span className="beat-practice-title">Practice Mode</span>
          <span className={`beat-practice-difficulty-badge ${difficultyInfo.className}`}>
            {difficultyInfo.label}
          </span>
        </div>
        <div className="beat-practice-header-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSettingsPanelOpen(true)}
            leftIcon={Settings}
            aria-label="Open difficulty settings"
            title="Difficulty Settings"
          >
            Settings
          </Button>
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
        lastBeatEvent={lastBeatEvent}
        lastTapTime={tapVisualTime}
        lastTapAccuracy={lastTapResult?.accuracy ?? null}
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

      {/* Tap Timing Debug Panel - helps detect input latency */}
      <div className="beat-practice-debug-panel">
        <div className="beat-practice-debug-header">
          <Clock className="beat-practice-debug-icon" />
          <span>TAP TIMING DEBUG</span>
          <span className="beat-practice-debug-hint">(shows last {MAX_DEBUG_HISTORY} taps)</span>
        </div>

        {/* Active Thresholds Display */}
        <div className="beat-practice-debug-thresholds">
          <div className="beat-practice-debug-thresholds-header">
            <Target className="beat-practice-debug-thresholds-icon" />
            <span>Active Thresholds</span>
            <span className={`beat-practice-debug-thresholds-preset ${difficultyInfo.className}`}>
              {difficultyInfo.label}
            </span>
          </div>
          <div className="beat-practice-debug-thresholds-values">
            <div className="beat-practice-debug-threshold beat-practice-debug-threshold--perfect">
              <span className="beat-practice-debug-threshold-label">Perfect</span>
              <span className="beat-practice-debug-threshold-value">±{formatThresholdMs(accuracyThresholds.perfect)}</span>
            </div>
            <div className="beat-practice-debug-threshold beat-practice-debug-threshold--great">
              <span className="beat-practice-debug-threshold-label">Great</span>
              <span className="beat-practice-debug-threshold-value">±{formatThresholdMs(accuracyThresholds.great)}</span>
            </div>
            <div className="beat-practice-debug-threshold beat-practice-debug-threshold--good">
              <span className="beat-practice-debug-threshold-label">Good</span>
              <span className="beat-practice-debug-threshold-value">±{formatThresholdMs(accuracyThresholds.good)}</span>
            </div>
            <div className="beat-practice-debug-threshold beat-practice-debug-threshold--ok">
              <span className="beat-practice-debug-threshold-label">OK</span>
              <span className="beat-practice-debug-threshold-value">±{formatThresholdMs(accuracyThresholds.ok)}</span>
            </div>
          </div>
        </div>

        {tapDebugHistory.length === 0 ? (
          <div className="beat-practice-debug-empty">Tap to see timing details...</div>
        ) : (
          <div className="beat-practice-debug-taps">
            {tapDebugHistory.map((tap, i) => (
              <div key={i} className={`beat-practice-debug-tap beat-practice-debug-tap--${tap.accuracy}`}>
                <div className="beat-practice-debug-tap-main">
                  <span className="beat-practice-debug-accuracy">{tap.accuracy.toUpperCase()}</span>
                  <span className="beat-practice-debug-offset">
                    {tap.offsetMs >= 0 ? '+' : ''}{tap.offsetMs}ms
                  </span>
                </div>
                <div className="beat-practice-debug-tap-details">
                  <span>Audio: {tap.audioTime.toFixed(3)}s</span>
                  <span>Beat: {tap.beatTime.toFixed(3)}s</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Difficulty Settings Panel */}
      <DifficultySettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
      />
    </div>
  );
}
