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
import { List } from 'react-window';
import { Play, Pause, SkipBack, X, Music, Activity, Clock, Settings, Target, Layers, Zap, Gamepad2 } from 'lucide-react';
import { BeatSubdivider } from 'playlist-data-engine';
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
    useUnifiedBeatMap,
    useKeyLaneViewMode,
    useChartStyle,
    useHasRequiredKeys,
    useGrooveState,
    useBestGrooveHotness,
    useBestGrooveStreak,
} from '../../store/beatDetectionStore';
import { useBeatStream } from '../../hooks/useBeatStream';
import { useSubdivisionPlayback, useSubdivisionPlaybackAvailable } from '../../hooks/useSubdivisionPlayback';
import { useKeyboardInput } from '../../hooks/useKeyboardInput';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { Button } from './Button';
import { BeatTimeline } from './BeatTimeline';
import { TapArea, useTapFeedback } from './TapArea';
import { TapStats } from './TapStats';
import { DifficultySettingsPanel } from './DifficultySettingsPanel';
import { SubdivisionButtons } from './SubdivisionButtons';
import { KeyLaneView } from './KeyLaneView';
import { GrooveMeter } from './GrooveMeter';
import { GrooveStats } from './GrooveStats';
import { RhythmXPStats } from './RhythmXPStats';
import { RhythmXPSessionStats } from './RhythmXPSessionStats';
import { ComboFeedbackDisplay } from './ComboFeedbackDisplay';
import { logger } from '../../utils/logger';
import type { ExtendedBeatAccuracy, DifficultyPreset, SubdividedBeatMap, AccuracyThresholds } from '../../types';

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
  /** Raw score from hit (10 for perfect, 7 for great, etc.) - Phase 6: Task 6.1 */
  scorePoints?: number;
  /** XP earned (after ratio applied) - Phase 6: Task 6.1 */
  characterXP?: number;
  /** Total multiplier applied - Phase 6: Task 6.1 */
  multiplier?: number;
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

/**
 * Props for the virtualized tap row (passed via rowProps)
 */
interface TapRowProps {
  taps: TapDebugInfo[];
  accuracyThresholds: AccuracyThresholds;
}

/**
 * Row renderer for react-window virtualized tap history list
 */
function TapRow({
  index,
  style,
  taps,
  accuracyThresholds,
}: {
  index: number;
  style: React.CSSProperties;
  taps: TapDebugInfo[];
  accuracyThresholds: AccuracyThresholds;
}) {
  const tap = taps[index];

  if (!tap) return null;

  // Calculate position percentage for visual comparison
  const maxOffsetMs = Math.round(accuracyThresholds.ok * 1000);
  const clampedOffset = Math.max(-maxOffsetMs, Math.min(maxOffsetMs, tap.offsetMs));
  const positionPercent = ((clampedOffset + maxOffsetMs) / (maxOffsetMs * 2)) * 100;

  // Calculate threshold boundaries for visualization
  const perfectMs = Math.round(accuracyThresholds.perfect * 1000);
  const greatMs = Math.round(accuracyThresholds.great * 1000);
  const goodMs = Math.round(accuracyThresholds.good * 1000);
  const okMs = Math.round(accuracyThresholds.ok * 1000);

  // Calculate zone widths (each side from center)
  const perfectWidth = (perfectMs / okMs) * 50;
  const greatWidth = (greatMs / okMs) * 50;
  const goodWidth = (goodMs / okMs) * 50;

  return (
    <div style={style}>
      <div className={`beat-practice-debug-tap beat-practice-debug-tap--${tap.accuracy}`}>
        <div className="beat-practice-debug-tap-main">
          <span className="beat-practice-debug-accuracy">{tap.accuracy.toUpperCase()}</span>
          <span className="beat-practice-debug-offset">
            {tap.offsetMs >= 0 ? '+' : ''}{tap.offsetMs}ms
          </span>
        </div>

        {/* Phase 6: Task 6.1 - XP Stats Display */}
        {(tap.scorePoints !== undefined || tap.characterXP !== undefined) && (
          <div className="beat-practice-debug-tap-xp">
            <span className={`beat-practice-debug-score beat-practice-debug-score--${tap.accuracy}`}>
              {tap.scorePoints ?? 0}pts
            </span>
            <span className="beat-practice-debug-xp">
              +{(tap.characterXP ?? 0).toFixed(1)} XP
            </span>
            <span className={`beat-practice-debug-multiplier ${(tap.multiplier ?? 1) > 1 ? 'beat-practice-debug-multiplier--active' : ''}`}>
              {(tap.multiplier ?? 1) > 1 ? `${(tap.multiplier ?? 1).toFixed(1)}x` : '-'}
            </span>
          </div>
        )}

        {/* Visual threshold comparison bar */}
        <div className="beat-practice-debug-tap-visual">
          <div className="beat-practice-debug-threshold-bar">
            <div className="beat-practice-debug-zone beat-practice-debug-zone--miss-left" />
            <div
              className="beat-practice-debug-zone beat-practice-debug-zone--ok"
              style={{ left: `${50 - goodWidth}%`, right: `${50 - goodWidth}%` }}
            />
            <div
              className="beat-practice-debug-zone beat-practice-debug-zone--good"
              style={{ left: `${50 - greatWidth}%`, right: `${50 - greatWidth}%` }}
            />
            <div
              className="beat-practice-debug-zone beat-practice-debug-zone--great"
              style={{ left: `${50 - perfectWidth}%`, right: `${50 - perfectWidth}%` }}
            />
            <div
              className="beat-practice-debug-zone beat-practice-debug-zone--perfect"
              style={{ left: `${50 - perfectWidth}%`, right: `${50 - perfectWidth}%` }}
            />
            <div className="beat-practice-debug-center-line" />
            <div
              className="beat-practice-debug-tap-marker"
              style={{ left: `${positionPercent}%` }}
            />
          </div>
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
    </div>
  );
}

export function BeatPracticeView({ onExit }: BeatPracticeViewProps) {
  // Store state and actions
  const beatMap = useBeatDetectionStore((state) => state.beatMap);
  const stopPracticeMode = useBeatDetectionStore((state) => state.actions.stopPracticeMode);
  const recordTap = useBeatDetectionStore((state) => state.actions.recordTap);

  // Groove analyzer actions (Phase 5: Task 5.1 - Initialize GrooveAnalyzer)
  const initGrooveAnalyzer = useBeatDetectionStore((state) => state.actions.initGrooveAnalyzer);
  const resetGrooveAnalyzer = useBeatDetectionStore((state) => state.actions.resetGrooveAnalyzer);
  const recordGrooveHit = useBeatDetectionStore((state) => state.actions.recordGrooveHit);
  const recordGrooveMiss = useBeatDetectionStore((state) => state.actions.recordGrooveMiss);

  // Rhythm XP actions (Phase 2: Task 2.1 - Initialize Rhythm XP)
  const initRhythmXP = useBeatDetectionStore((state) => state.actions.initRhythmXP);

  // Rhythm XP actions (Phase 2: Task 2.2 - Record XP on Each Hit)
  const recordRhythmHit = useBeatDetectionStore((state) => state.actions.recordRhythmHit);
  const processGrooveEndBonus = useBeatDetectionStore((state) => state.actions.processGrooveEndBonus);

  // Rhythm XP actions (Phase 2: Task 2.5 - Reset XP on Seek/Track Change)
  const resetRhythmXP = useBeatDetectionStore((state) => state.actions.resetRhythmXP);

  // Rhythm XP state (Phase 2: Task 2.6 - End Session on Practice Exit)
  const hasUnclaimedXP = useBeatDetectionStore((state) => state.actions.hasUnclaimedXP);
  const rhythmSessionTotals = useBeatDetectionStore((state) => state.rhythmSessionTotals);
  const maxCombo = useBeatDetectionStore((state) => state.maxCombo);

  // Rhythm XP state (Phase 3: Task 3.3 - Real-Time XP Display)
  const lastRhythmXPResult = useBeatDetectionStore((state) => state.lastRhythmXPResult);
  const currentCombo = useBeatDetectionStore((state) => state.currentCombo);

  // Rhythm XP state (Phase 4: Task 4.5 - Session Stats)
  const pendingComboEndBonus = useBeatDetectionStore((state) => state.pendingComboEndBonus);
  const pendingGrooveEndBonus = useBeatDetectionStore((state) => state.pendingGrooveEndBonus);
  const clearPendingBonuses = useBeatDetectionStore((state) => state.actions.clearPendingBonuses);

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

  // Get unified beat map (foundation for real-time subdivision)
  const unifiedBeatMap = useUnifiedBeatMap();

  // State for real-time generated subdivided beat map (for timeline visualization)
  const [realtimeSubdividedBeatMap, setRealtimeSubdividedBeatMap] = useState<SubdividedBeatMap | null>(null);

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

  // Debug: track taps for timing analysis (limited to 1000, virtualized with react-window)
  const MAX_DEBUG_HISTORY = 1000;
  const [tapDebugHistory, setTapDebugHistory] = useState<TapDebugInfo[]>([]);

  // Virtualization constants for react-window
  const TAP_ITEM_HEIGHT = 80; // Height of each tap item in pixels
  const TAP_LIST_HEIGHT = 300; // Max height of the visible container

  // Track audio time for debug info
  const audioTimeRef = useRef<number>(currentTime);
  audioTimeRef.current = currentTime;

  // State for showing "TOO FAST" indicator
  const [showTooFast, setShowTooFast] = useState(false);
  const tooFastTimeoutRef = useRef<number | null>(null);

  // Ref for tracking last matched beat timestamp (Phase 5: Task 5.3 - Post-Hit Lookback)
  // Used to detect missed beats between the current hit and the previous hit
  const lastMatchedBeatTimestampRef = useRef<number | null>(null);

  // State for difficulty settings panel
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

  // State for exit prompt modal (Phase 2: Task 2.6 - End Session on Practice Exit)
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  // Difficulty settings for visual feedback
  const difficultyPreset = useDifficultyPreset();
  const accuracyThresholds = useAccuracyThresholds();

  // Multi-tempo info (Phase 4: Task 4.1)
  const interpolationStats = useInterpolationStatistics();

  // Tap statistics for session summary (accuracy %, total deviation)
  const tapStats = useTapStatistics();

  // KeyLane view mode state (Phase 10: Task 10.3)
  const keyLaneViewMode = useKeyLaneViewMode();
  const chartStyle = useChartStyle();
  const hasRequiredKeys = useHasRequiredKeys();
  const setKeyLaneViewMode = useBeatDetectionStore((state) => state.actions.setKeyLaneViewMode);

  // Groove state for GrooveMeter display (Phase 5: Task 5.5)
  const grooveState = useGrooveState();

  // Groove stats for GrooveStats display (Phase 5: Task 5.6)
  const bestGrooveHotness = useBestGrooveHotness();
  const bestGrooveStreak = useBestGrooveStreak();

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
    checkTap: checkSubdivisionTap,
  } = useSubdivisionPlayback(true);

  // Transition mode for subdivision changes (Phase 6: Task 6.7)
  const transitionMode = useSubdivisionTransitionMode();
  const setTransitionMode = useBeatDetectionStore((state) => state.actions.setSubdivisionTransitionMode);

  // Keyboard input hook for rhythm game key input (Phase 5: Task 5.1)
  // Tracks pressed keys for key-matching gameplay (DDR arrows + Guitar Hero numbers)
  // Note: We use a ref to store handleTap to avoid stale closure issues in the callback
  const handleTapRef = useRef<(pressedKey?: string) => void>(() => {});
  const { pressedKey: _pressedKey, keyDownList, clearKeys } = useKeyboardInput({
    enabled: true, // Always enabled in practice mode
    onKeyDown: (key) => {
      // Trigger handleTap with the pressed key for key-matching gameplay
      handleTapRef.current(key);
      logger.debug('BeatDetection', 'Key pressed, triggering tap', { key, keyDownList });
    },
    onKeyUp: (key) => {
      logger.debug('BeatDetection', 'Key released', { key });
    },
  });

  /**
   * Generate real-time subdivided beat map when subdivision changes.
   * This feeds the BeatTimeline for visualization in real-time mode.
   */
  useEffect(() => {
    // Don't generate if:
    // - No unified beat map available
    // - Subdivision playback not available
    // - Subdivision is 'quarter' (no subdivision - use original beats)
    if (!unifiedBeatMap || !subdivisionPlaybackAvailable || currentSubdivision === 'quarter') {
      setRealtimeSubdividedBeatMap(null);
      return;
    }

    // Generate SubdividedBeatMap for the current real-time subdivision
    // This uses a single-segment config covering the whole track
    const subdivider = new BeatSubdivider();
    const config = {
      beatSubdivisions: new Map(), // Empty map = all beats use default
      defaultSubdivision: currentSubdivision,
    };

    try {
      const subdivided = subdivider.subdivide(unifiedBeatMap, config);
      setRealtimeSubdividedBeatMap(subdivided);
      logger.debug('BeatDetection', 'Generated real-time subdivided beat map', {
        subdivision: currentSubdivision,
        beatCount: subdivided.beats.length,
        originalBeatCount: unifiedBeatMap.beats.length,
      });
    } catch (error) {
      logger.error('BeatDetection', 'Failed to generate real-time subdivided beat map', { error });
      setRealtimeSubdividedBeatMap(null);
    }
  }, [unifiedBeatMap, subdivisionPlaybackAvailable, currentSubdivision]);

  /**
   * Handle tap action (spacebar, click, or key press)
   * Includes debouncing to prevent rapid accidental taps.
   *
   * @param pressedKey - Optional key that was pressed (for rhythm game chart mode)
   */
  const handleTap = useCallback((pressedKey?: string) => {
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

    // Use subdivision tap check when real-time subdivision is active
    const useSubdivisionTap = subdivisionPlaybackAvailable &&
                              currentSubdivision !== 'quarter' &&
                              subdivisionIsActive;

    // Pass pressedKey to checkTap for key-matching gameplay
    const result = useSubdivisionTap ? checkSubdivisionTap(pressedKey) : checkTap(pressedKey);
    if (result) {
      // Record in store
      recordTap(result);

      // Record groove hit (Phase 5: Task 5.2 - Wire Up Groove Recording)
      // Pass offset, BPM, currentTime (audio time from beat map), and accuracy
      // Required: accuracy 'miss' or 'wrongKey' will decrease hotness
      const grooveResult = recordGrooveHit(result.offset, currentBpm, result.matchedBeat.timestamp, result.accuracy);

      // Record XP (Phase 2: Task 2.2 - Record XP on Each Hit)
      // This also handles combo tracking internally
      // Phase 6: Task 6.1 - Capture XP result for debug panel
      const xpResult = recordRhythmHit(result.accuracy, grooveResult.hotness);

      // Check for groove end bonus (Phase 2: Task 2.4 - Handle Groove End Bonus)
      // If present, groove just ended (hotness=0 or direction changed)
      if (grooveResult.endedGrooveStats) {
        processGrooveEndBonus(grooveResult.endedGrooveStats);
      }

      // Phase 5: Task 5.3 - Post-Hit Lookback for Missed Beats
      // After recording the hit, look back at beats between previous hit and current hit
      // to find any beats that were missed
      const currentBeatTimestamp = result.matchedBeat.timestamp;
      const previousBeatTimestamp = lastMatchedBeatTimestampRef.current;

      if (previousBeatTimestamp !== null && activeBeatMap) {
        // Get the beats array from the beat map, handling different types
        // - BeatMap/SubdividedBeatMap/UnifiedBeatMap: use .beats
        // - InterpolatedBeatMap: use .mergedBeats
        const beats = 'mergedBeats' in activeBeatMap
          ? activeBeatMap.mergedBeats
          : activeBeatMap.beats;

        // Find beats in the map between previous matched beat and current matched beat
        const missedBeats = beats.filter((beat: { timestamp: number }) =>
          beat.timestamp > previousBeatTimestamp &&
          beat.timestamp < currentBeatTimestamp
        );

        // Record a miss for each missed beat
        if (missedBeats.length > 0) {
          logger.debug('BeatDetection', 'Missed beats detected via lookback', {
            count: missedBeats.length,
            previousBeatTimestamp,
            currentBeatTimestamp,
          });

          missedBeats.forEach(() => recordGrooveMiss());
        }
      }

      // Update last matched beat timestamp for next comparison
      lastMatchedBeatTimestampRef.current = currentBeatTimestamp;

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
        // Phase 6: Task 6.1 - Add XP fields for debug panel
        scorePoints: xpResult?.scorePoints,
        characterXP: xpResult?.finalXP,
        multiplier: xpResult?.totalMultiplier,
      };
      setTapDebugHistory(prev => {
        const newHistory = [debugInfo, ...prev];
        // Limit to MAX_DEBUG_HISTORY to prevent memory/performance issues
        return newHistory.slice(0, MAX_DEBUG_HISTORY);
      });
    }
  }, [checkTap, checkSubdivisionTap, recordTap, streamIsActive, showTapFeedback, subdivisionPlaybackAvailable, currentSubdivision, subdivisionIsActive, recordGrooveHit, recordGrooveMiss, currentBpm, activeBeatMap, recordRhythmHit, processGrooveEndBonus]);

  // Keep handleTapRef updated with the latest handleTap function
  // This allows the keyboard hook callback to call the latest handleTap
  handleTapRef.current = handleTap;

  /**
   * Handle keyboard events (spacebar and escape only - game keys handled by useKeyboardInput)
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
   * Also resets groove analyzer and rhythm XP since the combo/streak ends on seek.
   */
  const handleSeek = useCallback((time: number) => {
    seek(time);
    seekStream(time);
    // Reset groove analyzer on seek (Phase 5: Task 5.1)
    resetGrooveAnalyzer();
    // Reset last matched beat timestamp (Phase 5: Task 5.3)
    lastMatchedBeatTimestampRef.current = null;
    // Reset rhythm XP on seek (Phase 2: Task 2.5)
    resetRhythmXP();
    logger.debug('BeatDetection', 'GrooveAnalyzer and RhythmXP reset due to seek', { time });
  }, [seek, seekStream, resetGrooveAnalyzer, resetRhythmXP]);

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
   * Phase 2: Task 2.6 - End Session on Practice Exit (With Prompt)
   */
  const handleExit = useCallback(() => {
    if (hasUnclaimedXP()) {
      // Show modal with session summary and Claim/Discard options
      setShowExitPrompt(true);
    } else {
      // No XP to claim, exit directly
      stopPracticeMode();
      resetRhythmXP();
      onExit();
    }
  }, [hasUnclaimedXP, stopPracticeMode, resetRhythmXP, onExit]);

  /**
   * Handle claiming XP and exiting (Phase 2: Task 2.6)
   * Note: Full character integration is in Phase 8, this just ends the session
   */
  const handleClaimXPAndExit = useCallback(() => {
    // For now, just clear the session and exit
    // Phase 8 will add actual character XP claiming
    stopPracticeMode();
    resetRhythmXP();
    setShowExitPrompt(false);
    onExit();
  }, [stopPracticeMode, resetRhythmXP, onExit]);

  /**
   * Handle discarding XP and exiting (Phase 2: Task 2.6)
   */
  const handleDiscardAndExit = useCallback(() => {
    stopPracticeMode();
    resetRhythmXP();
    setShowExitPrompt(false);
    onExit();
  }, [stopPracticeMode, resetRhythmXP, onExit]);

  /**
   * Handle cancel exit (Phase 2: Task 2.6)
   */
  const handleCancelExit = useCallback(() => {
    setShowExitPrompt(false);
  }, []);

  /**
   * Handle claiming XP from session stats (Phase 4: Task 4.5)
   * This claims XP without exiting the practice mode.
   * Note: Phase 8 will add actual character XP claiming.
   */
  const handleClaimXP = useCallback((xp: number) => {
    // For now, just log and reset the session
    // Phase 8 will add actual character XP claiming
    logger.info('BeatDetection', 'XP claimed from session', { xp });
    resetRhythmXP();
  }, [resetRhythmXP]);

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

  /**
   * Cleanup keyboard input state on unmount
   */
  useEffect(() => {
    return () => {
      clearKeys();
    };
  }, [clearKeys]);

  // ============================================================
  // Groove Analyzer Initialization (Phase 5: Task 5.1)
  // ============================================================

  /**
   * Initialize groove analyzer when practice mode starts.
   * Creates a new GrooveAnalyzer instance with default options.
   */
  useEffect(() => {
    initGrooveAnalyzer();
    logger.info('BeatDetection', 'GrooveAnalyzer initialized for practice mode');
  }, [initGrooveAnalyzer]);

  // ============================================================
  // Rhythm XP Initialization (Phase 2: Task 2.1)
  // ============================================================

  /**
   * Initialize Rhythm XP calculator when practice mode starts.
   * Creates a new RhythmXPCalculator instance with default config.
   */
  useEffect(() => {
    initRhythmXP();
    logger.info('BeatDetection', 'RhythmXPCalculator initialized for practice mode');
  }, [initRhythmXP]);

  /**
   * Reset groove analyzer when beat map changes (track change).
   * This clears the current groove state (hotness, streak, pocket) but
   * preserves best stats for the session.
   */
  useEffect(() => {
    if (beatMap) {
      resetGrooveAnalyzer();
      // Reset last matched beat timestamp (Phase 5: Task 5.3)
      lastMatchedBeatTimestampRef.current = null;
      logger.info('BeatDetection', 'GrooveAnalyzer reset due to beat map change', {
        audioId: beatMap.audioId,
      });
    }
  }, [beatMap?.audioId, resetGrooveAnalyzer]);

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
        {/* Rhythm XP Stats (Phase 3: Task 3.3 - Real-Time XP Display) */}
        <RhythmXPStats
          sessionTotals={rhythmSessionTotals}
          lastResult={lastRhythmXPResult}
          currentCombo={currentCombo}
        />
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
              {subdivisionIsActive && currentSubdivision !== 'quarter' && <span className="beat-practice-subdivision-indicator">live</span>}
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

      {/* Beat Timeline Visualization - Hidden when in DDR/Guitar lane mode */}
      {/* GrooveMeter for TapArea mode - inline with timeline (Phase 5: Task 5.5) */}
      {keyLaneViewMode === 'off' && grooveState && (
        <div className="beat-practice-groove-row">
          <GrooveMeter
            hotness={grooveState.hotness}
            direction={grooveState.pocketDirection}
            streak={grooveState.streakLength}
            variant="compact"
            pendingBonus={pendingGrooveEndBonus}
            onBonusDisplayed={clearPendingBonuses}
          />
        </div>
      )}
      {keyLaneViewMode === 'off' && (
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
          // Pass subdivided beat map for visualization
          // Priority: 1) Pre-calculated (beatStreamMode='subdivided'), 2) Real-time generated
          subdividedBeatMap={
            beatStreamMode === 'subdivided'
              ? subdividedBeatMap
              : realtimeSubdividedBeatMap
          }
          showSubdivisionVisualization={
            beatStreamMode === 'subdivided'
              ? !!subdividedBeatMap
              : !!realtimeSubdividedBeatMap
          }
        />
      )}

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
            disabled={false}
            isActive={isPlaying && subdivisionIsActive && currentSubdivision !== 'quarter'}
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

      {/* View Mode Toggle (Phase 10: Task 10.3) - Switch between TapArea and KeyLane views */}
      {subdividedBeatMap && (
        <div className="beat-practice-view-mode-container">
          <div className="beat-practice-view-mode-header">
            <Gamepad2 className="beat-practice-view-mode-icon" />
            <span className="beat-practice-view-mode-title">Practice View</span>
            {hasRequiredKeys && (
              <span className="beat-practice-view-mode-chart-style">
                {chartStyle === 'ddr' ? 'DDR Chart' : 'Guitar Hero Chart'}
              </span>
            )}
          </div>
          <div className="beat-practice-view-mode-toggles">
            <button
              type="button"
              className={`beat-practice-view-toggle ${keyLaneViewMode === 'off' ? 'beat-practice-view-toggle--active' : ''}`}
              onClick={() => setKeyLaneViewMode('off')}
              aria-pressed={keyLaneViewMode === 'off'}
              title="Default tap area view"
            >
              <span className="beat-practice-view-toggle-text">Tap Area</span>
            </button>
            <button
              type="button"
              className={`beat-practice-view-toggle ${keyLaneViewMode === 'ddr' ? 'beat-practice-view-toggle--active' : ''}`}
              onClick={() => setKeyLaneViewMode('ddr')}
              aria-pressed={keyLaneViewMode === 'ddr'}
              title="DDR 4-lane view (arrow keys)"
            >
              <span className="beat-practice-view-toggle-text">DDR Lanes</span>
            </button>
            <button
              type="button"
              className={`beat-practice-view-toggle ${keyLaneViewMode === 'guitar-hero' ? 'beat-practice-view-toggle--active' : ''}`}
              onClick={() => setKeyLaneViewMode('guitar-hero')}
              aria-pressed={keyLaneViewMode === 'guitar-hero'}
              title="Guitar Hero 5-lane view (number keys 1-5)"
            >
              <span className="beat-practice-view-toggle-text">Guitar Lanes</span>
            </button>
          </div>
          <span className="beat-practice-view-mode-description">
            {keyLaneViewMode === 'off'
              ? 'Classic tap area - use spacebar or click'
              : keyLaneViewMode === 'ddr'
                ? 'DDR style - use arrow keys to hit notes'
                : 'Guitar Hero style - use number keys 1-5'}
            {!hasRequiredKeys && keyLaneViewMode !== 'off' && (
              <span className="beat-practice-view-mode-warning"> (no key assignments - edit chart first)</span>
            )}
            {hasRequiredKeys && keyLaneViewMode !== 'off' && chartStyle !== keyLaneViewMode && (
              <span className="beat-practice-view-mode-warning"> (style mismatch - chart is {chartStyle})</span>
            )}
          </span>
        </div>
      )}

      {/* Practice View - TapArea or KeyLane based on view mode */}
      {keyLaneViewMode === 'off' ? (
        <>
          {/* ComboFeedbackDisplay for TapArea mode (Phase 3.5: Task 3.5.4) */}
          <div className="beat-practice-combo-feedback-row">
            <ComboFeedbackDisplay
              score={rhythmSessionTotals?.totalScore ?? 0}
              combo={currentCombo}
              multiplier={lastRhythmXPResult?.totalMultiplier ?? 1.0}
            />
          </div>
          <TapArea
            onTap={handleTap}
            isActive={streamIsActive}
            lastTapResult={lastTapResult}
            showFeedback={showFeedback}
            feedbackDuration={500}
            onFeedbackComplete={hideTapFeedback}
            showTooFast={showTooFast}
          />
        </>
      ) : (
        <>
          {/* GrooveMeter for KeyLane mode - above lanes (Phase 5: Task 5.5) */}
          {grooveState && (
            <GrooveMeter
              hotness={grooveState.hotness}
              direction={grooveState.pocketDirection}
              streak={grooveState.streakLength}
              variant="full"
              pendingBonus={pendingGrooveEndBonus}
              onBonusDisplayed={clearPendingBonuses}
            />
          )}
          <KeyLaneView
            beatMap={subdividedBeatMap}
            currentTime={currentTime}
            chartStyle={keyLaneViewMode}
            isActive={streamIsActive}
            isPaused={streamIsPaused}
            lastAccuracy={lastTapResult?.accuracy ?? null}
            lastPressedKey={lastTapResult?.pressedKey ?? null}
            lastHitBeatTimestamp={lastTapResult?.matchedBeat?.timestamp ?? null}
            lastTapOffsetMs={lastTapResult ? Math.round(lastTapResult.offset * 1000) : null}
            onSeek={handleSeek}
            score={rhythmSessionTotals?.totalScore ?? 0}
            combo={currentCombo}
            multiplier={lastRhythmXPResult?.totalMultiplier ?? 1.0}
          />
        </>
      )}

      {/* Tap Statistics - Using dedicated TapStats component */}
      <TapStats />

      {/* Rhythm XP Session Stats (Phase 4: Task 4.5) */}
      <RhythmXPSessionStats
        sessionTotals={rhythmSessionTotals}
        pendingComboBonus={pendingComboEndBonus}
        pendingGrooveBonus={pendingGrooveEndBonus}
        onClearBonuses={clearPendingBonuses}
        onClaimXP={handleClaimXP}
        hasCharacter={false}
      />

      {/* Groove Session Stats (Phase 5: Task 5.6) */}
      {(bestGrooveHotness > 0 || bestGrooveStreak > 0) && (
        <GrooveStats
          bestHotness={bestGrooveHotness}
          bestStreak={bestGrooveStreak}
          currentHotness={grooveState?.hotness}
          currentStreak={grooveState?.streakLength}
          showComparison={true}
        />
      )}

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
            {/* Phase 6: Task 6.3 - Total XP in debug panel session stats */}
            <div className="beat-practice-debug-session-stat beat-practice-debug-session-stat--xp">
              <span className="beat-practice-debug-session-value beat-practice-debug-session-value--xp">
                {(rhythmSessionTotals?.totalXP ?? 0).toFixed(1)}
              </span>
              <span className="beat-practice-debug-session-label">Total XP</span>
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
          <List<TapRowProps>
            className="beat-practice-debug-taps beat-practice-debug-taps--virtualized"
            style={{ height: TAP_LIST_HEIGHT }}
            rowCount={tapDebugHistory.length}
            rowHeight={TAP_ITEM_HEIGHT}
            rowComponent={TapRow}
            rowProps={{
              taps: tapDebugHistory,
              accuracyThresholds,
            }}
          />
        )}
      </div>

      {/* Difficulty Settings Panel */}
      <DifficultySettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
      />

      {/* Exit Prompt Modal (Phase 2: Task 2.6 - End Session on Practice Exit) */}
      {showExitPrompt && (
        <div
          className="exit-prompt-overlay"
          onClick={(e) => e.target === e.currentTarget && handleCancelExit()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-prompt-title"
        >
          <div className="exit-prompt-container">
            <h2 id="exit-prompt-title" className="exit-prompt-title">
              Session Summary
            </h2>

            <div className="exit-prompt-summary">
              <div className="exit-prompt-stat">
                <span className="exit-prompt-stat-value">{rhythmSessionTotals?.totalScore ?? 0}</span>
                <span className="exit-prompt-stat-label">Score</span>
              </div>
              <div className="exit-prompt-stat exit-prompt-stat--xp">
                <span className="exit-prompt-stat-value">{(rhythmSessionTotals?.totalXP ?? 0).toFixed(1)}</span>
                <span className="exit-prompt-stat-label">XP</span>
              </div>
              <div className="exit-prompt-stat">
                <span className="exit-prompt-stat-value">{maxCombo}</span>
                <span className="exit-prompt-stat-label">Max Combo</span>
              </div>
            </div>

            <p className="exit-prompt-message">
              You have unclaimed XP from this session. What would you like to do?
            </p>

            <div className="exit-prompt-actions">
              <button
                type="button"
                className="exit-prompt-btn exit-prompt-btn--primary"
                onClick={handleClaimXPAndExit}
              >
                Claim {(rhythmSessionTotals?.totalXP ?? 0).toFixed(1)} XP
              </button>
              <button
                type="button"
                className="exit-prompt-btn exit-prompt-btn--danger"
                onClick={handleDiscardAndExit}
              >
                Discard & Exit
              </button>
              <button
                type="button"
                className="exit-prompt-btn exit-prompt-btn--secondary"
                onClick={handleCancelExit}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
