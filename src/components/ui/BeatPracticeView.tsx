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
import { Play, Pause, SkipBack, X, Music, Activity, Clock, Settings, Target, Layers, Zap } from 'lucide-react';
import './BeatPracticeView.css';
import {
    useBeatDetectionStore,
    useDifficultyPreset,
    useAccuracyThresholds,
    useInterpolationVisualizationData,
    useBeatStreamMode,
    useInterpolatedBeatMap,
    useSubdividedBeatMap,
    useShowGridOverlay,
    useShowTempoDriftVisualization,
    useIsDownbeatSelectionMode,
    useShowMeasureBoundaries,
    useTimeSignature,
    useInterpolationStatistics,
    useTapStatistics,
    useSubdivisionTransitionMode,
} from '../../store/beatDetectionStore';
import { useBeatStream } from '../../hooks/useBeatStream';
import { useSubdivisionPlayback, useSubdivisionPlaybackAvailable } from '../../hooks/useSubdivisionPlayback';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { Button } from './Button';
import { BeatTimeline } from './BeatTimeline';
import { TapArea, useTapFeedback } from './TapArea';
import { TapStats } from './TapStats';
import { DifficultySettingsPanel } from './DifficultySettingsPanel';
import { SubdivisionButtons } from './SubdivisionButtons';
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

  // Interpolation visualization data (Task 5.1)
  const interpolationData = useInterpolationVisualizationData();

  // Grid overlay visibility (Task 5.3)
  const showGridOverlay = useShowGridOverlay();

  // Tempo drift visualization visibility (Task 5.4)
  const showTempoDriftVisualization = useShowTempoDriftVisualization();

  // Downbeat selection mode (Phase 5: BeatMapSummary Integration - Task 5.4)
  const isDownbeatSelectionMode = useIsDownbeatSelectionMode();
  const showMeasureBoundaries = useShowMeasureBoundaries();
  const timeSignature = useTimeSignature();

  // Audio player state
  const { playbackState, currentTime, duration, pause, resume, seek } = useAudioPlayerStore();
  const isPlaying = playbackState === 'playing';

  // Beat stream mode state (Task 6.1)
  const beatStreamMode = useBeatStreamMode();
  const interpolatedBeatMap = useInterpolatedBeatMap();
  const subdividedBeatMap = useSubdividedBeatMap();

  // Determine which beat map to use based on mode
  // When mode is 'merged' and we have an interpolated beat map, use it
  // When mode is 'subdivided' and we have a subdivided beat map, use it
  // Otherwise, fall back to the regular beat map
  const activeBeatMap = (beatStreamMode === 'subdivided' && subdividedBeatMap)
    ? subdividedBeatMap
    : (beatStreamMode === 'merged' && interpolatedBeatMap)
      ? interpolatedBeatMap
      : beatMap;

  // Beat stream hook for real-time sync
  // Pass the appropriate beat map and mode (Task 6.2)
  const {
    currentBpm,
    lastBeatEvent,
    checkTap,
    isActive: streamIsActive,
    isPaused: streamIsPaused,
    seekStream,
  } = useBeatStream(activeBeatMap, undefined, true, beatStreamMode);

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

  // Debug: track all taps for timing analysis (no limit - shows full session history)
  const [tapDebugHistory, setTapDebugHistory] = useState<TapDebugInfo[]>([]);

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

  // Multi-tempo info (Phase 4: Task 4.1)
  const interpolationStats = useInterpolationStatistics();

  // Tap statistics for session summary (accuracy %, total deviation)
  const tapStats = useTapStatistics();

  // Beat stream mode action (state is already declared above)
  const setBeatStreamMode = useBeatDetectionStore((state) => state.actions.setBeatStreamMode);

  // Subdivision playback hook for real-time subdivision switching (Phase 6: Task 6.4)
  // Check if subdivision playback is available (requires UnifiedBeatMap)
  const subdivisionPlaybackAvailable = useSubdivisionPlaybackAvailable();

  // Initialize subdivision playback hook - practice mode is always active in this view
  const {
    currentSubdivision,
    isActive: subdivisionIsActive,
    setSubdivision,
  } = useSubdivisionPlayback(true);

  // Transition mode for subdivision changes (Phase 6: Task 6.7)
  const transitionMode = useSubdivisionTransitionMode();
  const setTransitionMode = useBeatDetectionStore((state) => state.actions.setSubdivisionTransitionMode);

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
      setTapDebugHistory(prev => [debugInfo, ...prev]);
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
   * Handle beat click for downbeat selection.
   * Called when user clicks a beat in selection mode.
   * Part of Phase 5: BeatMapSummary Integration (Task 5.4)
   */
  const handleBeatClick = useCallback((beatIndex: number) => {
    // Only handle click if in selection mode
    if (!isDownbeatSelectionMode) return;

    // Update the downbeat position in the store
    useBeatDetectionStore.getState().actions.setDownbeatPosition(beatIndex, timeSignature);

    logger.info('BeatDetection', 'Downbeat position set via beat click', {
      beatIndex,
      timeSignature,
    });
  }, [isDownbeatSelectionMode, timeSignature]);

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

      {/* Beat Stream Mode Toggle (Task 6.1) */}
      <div className="beat-practice-stream-toggle-container">
        <span className="beat-practice-stream-toggle-label">Beat Stream</span>
        <div className="beat-practice-stream-toggles">
          <button
            type="button"
            className={`beat-practice-stream-toggle ${beatStreamMode === 'detected' ? 'beat-practice-stream-toggle--active' : ''}`}
            onClick={() => setBeatStreamMode('detected')}
            aria-pressed={beatStreamMode === 'detected'}
          >
            <span className="beat-practice-stream-toggle-text">Detected Only</span>
          </button>
          <button
            type="button"
            className={`beat-practice-stream-toggle ${beatStreamMode === 'merged' ? 'beat-practice-stream-toggle--active' : ''} ${!interpolatedBeatMap ? 'beat-practice-stream-toggle--disabled' : ''}`}
            onClick={() => interpolatedBeatMap && setBeatStreamMode('merged')}
            disabled={!interpolatedBeatMap}
            aria-pressed={beatStreamMode === 'merged'}
            title={!interpolatedBeatMap ? 'Interpolation not available' : undefined}
          >
            <span className="beat-practice-stream-toggle-text">Merged</span>
            {!interpolatedBeatMap && <span className="beat-practice-stream-toggle-indicator">✦</span>}
          </button>
          <button
            type="button"
            className={`beat-practice-stream-toggle ${beatStreamMode === 'subdivided' ? 'beat-practice-stream-toggle--active' : ''} ${!subdividedBeatMap ? 'beat-practice-stream-toggle--disabled' : ''}`}
            onClick={() => subdividedBeatMap && setBeatStreamMode('subdivided')}
            disabled={!subdividedBeatMap}
            aria-pressed={beatStreamMode === 'subdivided'}
            title={!subdividedBeatMap ? 'Subdivision not available - generate in Analysis tab' : undefined}
          >
            <span className="beat-practice-stream-toggle-text">Subdivided</span>
            {!subdividedBeatMap && <span className="beat-practice-stream-toggle-indicator">✦</span>}
          </button>
        </div>
        <span className="beat-practice-stream-toggle-description">
          {beatStreamMode === 'detected'
            ? 'Using originally detected beats'
            : beatStreamMode === 'merged'
              ? (interpolatedBeatMap
                  ? 'Using interpolated beats with detected anchors'
                  : 'Interpolation not available')
              : beatStreamMode === 'subdivided'
                ? (subdividedBeatMap
                    ? `Using ${subdividedBeatMap.subdivisionMetadata.subdivisionsUsed.join(' → ')} subdivision`
                    : 'Subdivision not available')
                : 'Unknown mode'}
        </span>
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
          {/* Multi-tempo indicator (Phase 4: Task 4.1) */}
          {interpolationStats?.hasMultiTempoApplied && interpolationStats.tempoSections && interpolationStats.tempoSections.length > 1 && (
            <span className="beat-practice-multi-tempo-indicator">
              {Math.round(Math.min(...interpolationStats.tempoSections.map(s => s.bpm)))}-{Math.round(Math.max(...interpolationStats.tempoSections.map(s => s.bpm)))} BPM ({interpolationStats.tempoSections.length} sections)
            </span>
          )}
        </div>
        <div className="beat-practice-stat">
          <span className="beat-practice-stat-value">{formatTime(currentTime)}</span>
          <span className="beat-practice-stat-label">Position</span>
        </div>
        <div className="beat-practice-stat">
          <span className="beat-practice-stat-value">{formatTime(duration)}</span>
          <span className="beat-practice-stat-label">Duration</span>
        </div>
        {/* Current Subdivision Display (Phase 6: Task 6.5, Phase 8: Task 8.3) */}
        {subdivisionPlaybackAvailable && (
          <div
            className="beat-practice-stat beat-practice-stat--subdivision"
            data-subdivision={currentSubdivision}
          >
            <span className={`beat-practice-stat-value beat-practice-stat-value--subdivision ${subdivisionIsActive ? 'beat-practice-stat-value--subdivision-active' : ''}`}>
              {currentSubdivision}
            </span>
            <span className="beat-practice-stat-label">
              Subdivision
              {subdivisionIsActive && <span className="beat-practice-subdivision-indicator">live</span>}
            </span>
          </div>
        )}
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
        interpolationData={interpolationData}
        showGridOverlay={showGridOverlay}
        showTempoDriftVisualization={showTempoDriftVisualization}
        enableBeatSelection={isDownbeatSelectionMode}
        onBeatClick={handleBeatClick}
        showMeasureBoundaries={showMeasureBoundaries}
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

      {/* Subdivision Buttons (Phase 6: Task 6.4) - Real-time subdivision switching */}
      {subdivisionPlaybackAvailable && (
        <div className="beat-practice-subdivision-container">
          <div className="beat-practice-subdivision-header">
            <Layers className="beat-practice-subdivision-icon" />
            <span className="beat-practice-subdivision-title">Subdivision Playground</span>
            {subdivisionIsActive && (
              <span className="beat-practice-subdivision-active-indicator">Active</span>
            )}
          </div>
          <SubdivisionButtons
            currentSubdivision={currentSubdivision}
            onSubdivisionChange={setSubdivision}
            disabled={!isPlaying}
            isActive={isPlaying && subdivisionIsActive}
          />

          {/* Transition Mode Toggle (Phase 6: Task 6.7) */}
          <div className="beat-practice-transition-mode">
            <div className="beat-practice-transition-mode-header">
              <Zap className="beat-practice-transition-mode-icon" />
              <span className="beat-practice-transition-mode-label">Transition</span>
            </div>
            <div className="beat-practice-transition-mode-toggles">
              <button
                type="button"
                className={`beat-practice-transition-toggle ${transitionMode === 'immediate' ? 'beat-practice-transition-toggle--active' : ''}`}
                onClick={() => setTransitionMode('immediate')}
                aria-pressed={transitionMode === 'immediate'}
                title="Switch subdivision instantly"
              >
                <span className="beat-practice-transition-toggle-text">Instant</span>
              </button>
              <button
                type="button"
                className={`beat-practice-transition-toggle ${transitionMode === 'next-downbeat' ? 'beat-practice-transition-toggle--active' : ''}`}
                onClick={() => setTransitionMode('next-downbeat')}
                aria-pressed={transitionMode === 'next-downbeat'}
                title="Wait for beat 1 of next measure"
              >
                <span className="beat-practice-transition-toggle-text">Downbeat</span>
              </button>
              <button
                type="button"
                className={`beat-practice-transition-toggle ${transitionMode === 'next-measure' ? 'beat-practice-transition-toggle--active' : ''}`}
                onClick={() => setTransitionMode('next-measure')}
                aria-pressed={transitionMode === 'next-measure'}
                title="Wait for start of next measure"
              >
                <span className="beat-practice-transition-toggle-text">Measure</span>
              </button>
            </div>
            <span className="beat-practice-transition-mode-description">
              {transitionMode === 'immediate'
                ? 'Subdivision changes apply instantly'
                : transitionMode === 'next-downbeat'
                  ? 'Changes apply on next downbeat (beat 1)'
                  : 'Changes apply at start of next measure'}
            </span>
          </div>
        </div>
      )}

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
          <span className="beat-practice-debug-hint">({tapDebugHistory.length} taps this session)</span>
        </div>

        {/* Session Stats Summary */}
        {tapDebugHistory.length > 0 && (
          <div className="beat-practice-debug-session-stats">
            <div className="beat-practice-debug-session-stat">
              <span className="beat-practice-debug-session-value">{tapStats.accuracyPercentage}%</span>
              <span className="beat-practice-debug-session-label">Accuracy</span>
            </div>
            <div className="beat-practice-debug-session-stat">
              <span className="beat-practice-debug-session-value">{tapStats.averageOffset}ms</span>
              <span className="beat-practice-debug-session-label">Avg Deviation</span>
            </div>
            <div className="beat-practice-debug-session-stat">
              <span className="beat-practice-debug-session-value">{tapStats.totalDeviation}ms</span>
              <span className="beat-practice-debug-session-label">Total Deviation</span>
            </div>
            <div className="beat-practice-debug-session-stat">
              <span className="beat-practice-debug-session-value">{tapStats.totalTaps}</span>
              <span className="beat-practice-debug-session-label">Total Taps</span>
            </div>
            <div className="beat-practice-debug-session-stat">
              <span className="beat-practice-debug-session-value">{tapStats.miss}</span>
              <span className="beat-practice-debug-session-label">Missed Taps</span>
            </div>
          </div>
        )}

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
            {tapDebugHistory.map((tap, i) => {
              // Calculate position percentage for visual comparison
              // Max display range is ±ok threshold (everything beyond is a miss)
              const maxOffsetMs = Math.round(accuracyThresholds.ok * 1000);
              const clampedOffset = Math.max(-maxOffsetMs, Math.min(maxOffsetMs, tap.offsetMs));
              const positionPercent = ((clampedOffset + maxOffsetMs) / (maxOffsetMs * 2)) * 100;

              // Calculate threshold boundaries for visualization
              const perfectMs = Math.round(accuracyThresholds.perfect * 1000);
              const greatMs = Math.round(accuracyThresholds.great * 1000);
              const goodMs = Math.round(accuracyThresholds.good * 1000);
              const okMs = Math.round(accuracyThresholds.ok * 1000);

              // Calculate zone widths (each side from center)
              const perfectWidth = (perfectMs / okMs) * 50; // percentage from center
              const greatWidth = (greatMs / okMs) * 50;
              const goodWidth = (goodMs / okMs) * 50;

              return (
                <div key={i} className={`beat-practice-debug-tap beat-practice-debug-tap--${tap.accuracy}`}>
                  <div className="beat-practice-debug-tap-main">
                    <span className="beat-practice-debug-accuracy">{tap.accuracy.toUpperCase()}</span>
                    <span className="beat-practice-debug-offset">
                      {tap.offsetMs >= 0 ? '+' : ''}{tap.offsetMs}ms
                    </span>
                  </div>

                  {/* Visual threshold comparison bar */}
                  <div className="beat-practice-debug-tap-visual">
                    <div className="beat-practice-debug-threshold-bar">
                      {/* Miss zone (left) */}
                      <div className="beat-practice-debug-zone beat-practice-debug-zone--miss-left" />

                      {/* OK zone (outer) */}
                      <div
                        className="beat-practice-debug-zone beat-practice-debug-zone--ok"
                        style={{
                          left: `${50 - goodWidth}%`,
                          right: `${50 - goodWidth}%`,
                        }}
                      />

                      {/* Good zone */}
                      <div
                        className="beat-practice-debug-zone beat-practice-debug-zone--good"
                        style={{
                          left: `${50 - greatWidth}%`,
                          right: `${50 - greatWidth}%`,
                        }}
                      />

                      {/* Great zone */}
                      <div
                        className="beat-practice-debug-zone beat-practice-debug-zone--great"
                        style={{
                          left: `${50 - perfectWidth}%`,
                          right: `${50 - perfectWidth}%`,
                        }}
                      />

                      {/* Perfect zone (center) */}
                      <div
                        className="beat-practice-debug-zone beat-practice-debug-zone--perfect"
                        style={{
                          left: `${50 - perfectWidth}%`,
                          right: `${50 - perfectWidth}%`,
                        }}
                      />

                      {/* Center line (beat time) */}
                      <div className="beat-practice-debug-center-line" />

                      {/* Tap position marker */}
                      <div
                        className="beat-practice-debug-tap-marker"
                        style={{ left: `${positionPercent}%` }}
                      />
                    </div>

                    {/* Scale labels */}
                    <div className="beat-practice-debug-scale">
                      <span>-{okMs}ms</span>
                      <span>0</span>
                      <span>+{okMs}ms</span>
                    </div>
                  </div>

                  <div className="beat-practice-debug-tap-details">
                    <span>Audio: {tap.audioTime.toFixed(3)}s</span>
                    <span>Beat: {tap.beatTime.toFixed(3)}s</span>
                  </div>
                </div>
              );
            })}
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
