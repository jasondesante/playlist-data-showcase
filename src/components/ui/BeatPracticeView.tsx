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
import { Activity } from 'lucide-react';
import { BeatSubdivider, type SubdivisionType } from 'playlist-data-engine';
import './BeatPracticeView.css';
import { SubdivisionPlayground } from './BeatPracticeView/SubdivisionPlayground';
import { BeatStreamModeToggle } from './BeatPracticeView/BeatStreamModeToggle';
import { ViewModeToggle } from './BeatPracticeView/ViewModeToggle';
import { TapTimingDebugPanel, type TapDebugInfo } from './BeatPracticeView/TapTimingDebugPanel';
import { ExitPromptModal } from './BeatPracticeView/ExitPromptModal';
import { PracticeStatsBar } from './BeatPracticeView/PracticeStatsBar';
import { PracticeProgressBar } from './BeatPracticeView/PracticeProgressBar';
import { PracticeHeader } from './BeatPracticeView/PracticeHeader';
import { PlaybackControls } from './BeatPracticeView/PlaybackControls';
import { PracticePlayArea } from './BeatPracticeView/PracticePlayArea';
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
  usePendingSubdivision,
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
import { useTapFeedback } from './TapArea';
import { TapStats } from './TapStats';
import { DifficultySettingsPanel } from './DifficultySettingsPanel';
import { GrooveStats } from './GrooveStats';
import { RhythmXPSessionStats } from './RhythmXPSessionStats';
import { logger } from '../../utils/logger';
import { showToast } from './Toast';
import { LevelUpDetailModal } from '../LevelUpDetailModal';
import type { LevelUpDetail } from 'playlist-data-engine';
import type { SubdividedBeatMap } from '../../types';
import { usePlaylistStore } from '../../store/playlistStore';
import { useCharacterStore } from '../../store/characterStore';

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
  const breakCombo = useBeatDetectionStore((state) => state.actions.breakCombo);

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

  // Ref for tap debouncing - tracks last tap timestamp
  const lastTapTimeRef = useRef<number>(0);

  // State for tap visual feedback on timeline
  const [tapVisualTime, setTapVisualTime] = useState<number>(0);

  // Debug: track taps for timing analysis (limited to 1000, virtualized with react-window)
  const MAX_DEBUG_HISTORY = 1000;
  const [tapDebugHistory, setTapDebugHistory] = useState<TapDebugInfo[]>([]);

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

  // State for subdivision playground visibility
  const [showSubdivisionPlayground, setShowSubdivisionPlayground] = useState(false);

  // Ref to track previous beatStreamMode before forcing by subdivision playground
  // Used to restore the mode when subdivision playground is turned off
  const previousBeatStreamModeRef = useRef<typeof beatStreamMode | null>(null);

  // State for exit prompt modal (Phase 2: Task 2.6 - End Session on Practice Exit)
  const [showExitPrompt, setShowExitPrompt] = useState(false);

  // State for level-up modal (Phase 8: Task 8.3 - Claim XP Handler)
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpDetails, setLevelUpDetails] = useState<LevelUpDetail[]>([]);

  // Get selected track and character store for XP claiming (Phase 8: Task 8.3)
  const selectedTrack = usePlaylistStore((state) => state.selectedTrack);
  const characters = useCharacterStore((state) => state.characters);
  const addRhythmXP = useCharacterStore((state) => state.addRhythmXP);

  // Check if there's a character associated with the current track
  // The character's seed equals the track ID
  const trackCharacter = selectedTrack
    ? characters.find((c) => c.seed === selectedTrack.id)
    : null;
  const hasCharacter = !!trackCharacter;

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

  /**
   * Effect to force beatStreamMode based on view mode and subdivision playground state.
   *
   * Rules:
   * 1. When subdivision playground is turned ON while in DDR/Guitar view → switch to Tap Area
   *    (subdivision playground requires merged mode, which conflicts with lane views)
   * 2. When view mode is "ddr" or "guitar-hero" → force beatStreamMode to "subdivided"
   *    (only subdivided mode is playable in lane views)
   * 3. When subdivision playground is active AND view mode is "off" → force beatStreamMode to "merged"
   *    (subdivision playground needs merged beats to work with real-time subdivision)
   * 4. When subdivision playground is turned off AND view mode is "off" → restore previous mode
   */
  useEffect(() => {
    // Priority 0: Subdivision playground conflicts with lane views - switch to tap area
    if (showSubdivisionPlayground && (keyLaneViewMode === 'ddr' || keyLaneViewMode === 'guitar-hero')) {
      // Save current mode before switching
      if (previousBeatStreamModeRef.current === null) {
        previousBeatStreamModeRef.current = beatStreamMode;
      }
      setKeyLaneViewMode('off');
      // Don't return - let the effect run again with the new view mode
      return;
    }

    // Priority 1: Lane views require subdivided mode
    if (keyLaneViewMode === 'ddr' || keyLaneViewMode === 'guitar-hero') {
      if (beatStreamMode !== 'subdivided') {
        // Save current mode before forcing (for potential restoration)
        // Only save if we're not already in a forced state
        if (previousBeatStreamModeRef.current === null) {
          previousBeatStreamModeRef.current = beatStreamMode;
        }
        setBeatStreamMode('subdivided');
      }
      return;
    }

    // Priority 2: Subdivision playground requires merged mode (only in tap area view)
    if (showSubdivisionPlayground && keyLaneViewMode === 'off') {
      if (beatStreamMode !== 'merged') {
        // Save current mode before forcing
        if (previousBeatStreamModeRef.current === null) {
          previousBeatStreamModeRef.current = beatStreamMode;
        }
        setBeatStreamMode('merged');
      }
      return;
    }

    // Priority 3: Restore previous mode when constraints are lifted
    if (previousBeatStreamModeRef.current !== null && !showSubdivisionPlayground && keyLaneViewMode === 'off') {
      // Only restore if the current mode was forced (merged when playground was active)
      // or if we're coming from a lane view
      if (beatStreamMode === 'merged' || beatStreamMode === 'subdivided') {
        setBeatStreamMode(previousBeatStreamModeRef.current);
      }
      previousBeatStreamModeRef.current = null;
    }
  }, [keyLaneViewMode, showSubdivisionPlayground, beatStreamMode, setBeatStreamMode, setKeyLaneViewMode]);

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

  // Pending subdivision for deferred transitions
  const pendingSubdivision = usePendingSubdivision();

  // Keyboard input hook for rhythm game key input (Phase 5: Task 5.1)
  // Tracks pressed keys for key-matching gameplay (DDR arrows + Guitar Hero numbers)
  // Note: We use a ref to store handleTap to avoid stale closure issues in the callback
  const handleTapRef = useRef<(pressedKey?: string) => void>(() => { });
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
   *
   * When there's a pending subdivision (deferred transition), generates a "preview"
   * beat map that shows:
   * - Current subdivision for beats in the current measure
   * - Pending subdivision for beats from the next measure onwards
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

    const subdivider = new BeatSubdivider();

    try {
      // Check if we have a pending subdivision for a deferred transition
      if (pendingSubdivision && pendingSubdivision !== currentSubdivision) {
        // Find the beat index where the next measure starts
        // We need to find the first beat in the next measure from the current time
        const currentBeatIndex = unifiedBeatMap.beats.findIndex(
          (beat) => beat.timestamp > currentTime
        );

        // Find the start of the next measure by looking for the next downbeat
        let nextMeasureStartIndex = -1;
        for (let i = Math.max(0, currentBeatIndex); i < unifiedBeatMap.beats.length; i++) {
          const beat = unifiedBeatMap.beats[i];
          if (beat.beatInMeasure === 0 && i > 0) {
            nextMeasureStartIndex = i;
            break;
          }
        }

        if (nextMeasureStartIndex > 0) {
          // Generate a mixed beat map with per-beat subdivisions
          const beatSubdivisions = new Map<number, SubdivisionType>();

          // Mark beats before next measure with current subdivision
          for (let i = 0; i < nextMeasureStartIndex; i++) {
            beatSubdivisions.set(i, currentSubdivision);
          }

          // Mark beats from next measure onwards with pending subdivision
          for (let i = nextMeasureStartIndex; i < unifiedBeatMap.beats.length; i++) {
            beatSubdivisions.set(i, pendingSubdivision);
          }

          const config = {
            beatSubdivisions,
            defaultSubdivision: currentSubdivision,
          };

          const subdivided = subdivider.subdivide(unifiedBeatMap, config);
          setRealtimeSubdividedBeatMap(subdivided);
          logger.debug('BeatDetection', 'Generated preview subdivided beat map with pending transition', {
            currentSubdivision,
            pendingSubdivision,
            nextMeasureStartIndex,
            beatCount: subdivided.beats.length,
          });
          return;
        }
      }

      // No pending subdivision or couldn't find measure boundary - use single subdivision
      const config = {
        beatSubdivisions: new Map(), // Empty map = all beats use default
        defaultSubdivision: currentSubdivision,
      };

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
  }, [unifiedBeatMap, subdivisionPlaybackAvailable, currentSubdivision, pendingSubdivision, currentTime]);

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

      // Phase 5: Task 5.3 - Pre-Hit Lookback for Missed Beats (MOVED BEFORE recordRhythmHit)
      // Look back at beats between previous hit and current hit BEFORE recording XP
      // This ensures combo is correctly reset if beats were missed
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

        // Record a miss for each missed beat (for groove analyzer)
        // AND break the combo before recording the new hit
        if (missedBeats.length > 0) {
          logger.debug('BeatDetection', 'Missed beats detected via lookback', {
            count: missedBeats.length,
            previousBeatTimestamp,
            currentBeatTimestamp,
          });

          // Record groove misses for hotness tracking
          missedBeats.forEach(() => recordGrooveMiss());

          // Break the combo BEFORE recording the new hit
          // This ensures the combo is reset and end bonus is calculated
          breakCombo(missedBeats.length);
        }
      }

      // Update last matched beat timestamp for next comparison
      lastMatchedBeatTimestampRef.current = currentBeatTimestamp;

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
  }, [checkTap, checkSubdivisionTap, recordTap, streamIsActive, showTapFeedback, subdivisionPlaybackAvailable, currentSubdivision, subdivisionIsActive, recordGrooveHit, recordGrooveMiss, currentBpm, activeBeatMap, recordRhythmHit, processGrooveEndBonus, breakCombo]);

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
   * Handle claiming XP and exiting (Phase 2: Task 2.6, Phase 8: Task 8.3)
   * Claims XP to character and exits practice mode.
   */
  const handleClaimXPAndExit = useCallback(() => {
    const xpToClaim = rhythmSessionTotals?.totalXP ?? 0;

    if (xpToClaim > 0 && trackCharacter) {
      // Claim XP using the character store
      const result = addRhythmXP(trackCharacter.seed, xpToClaim);

      if (result?.leveledUp && result.levelUpDetails) {
        // Show level-up modal (will display on top after exit)
        setLevelUpDetails(result.levelUpDetails);
        setShowLevelUpModal(true);
        logger.info('BeatDetection', 'Character leveled up from rhythm XP!', {
          characterName: result.character.name,
          newLevel: result.newLevel,
          xpEarned: result.xpEarned,
        });
      } else if (result) {
        showToast(`+${xpToClaim.toFixed(1)} XP added to ${trackCharacter.name}`, 'success');
      } else {
        showToast('Failed to add XP', 'error');
      }
    }

    // Reset session and exit
    stopPracticeMode();
    resetRhythmXP();
    setShowExitPrompt(false);
    onExit();
  }, [rhythmSessionTotals, trackCharacter, addRhythmXP, stopPracticeMode, resetRhythmXP, onExit]);

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
    // Check if there's a character associated with this track
    if (!trackCharacter) {
      showToast('No character associated with this track', 'warning');
      return;
    }

    // Claim XP using the character store
    const result = addRhythmXP(trackCharacter.seed, xp);

    if (result) {
      if (result.leveledUp && result.levelUpDetails) {
        // Show level-up modal
        setLevelUpDetails(result.levelUpDetails);
        setShowLevelUpModal(true);
        logger.info('BeatDetection', 'Character leveled up from rhythm XP!', {
          characterName: result.character.name,
          newLevel: result.newLevel,
          xpEarned: result.xpEarned,
        });
      } else {
        // Show success toast
        showToast(`+${xp.toFixed(1)} XP added to ${trackCharacter.name}`, 'success');
      }
    } else {
      showToast('Failed to add XP', 'error');
    }

    // Reset session after claiming
    resetRhythmXP();
  }, [trackCharacter, addRhythmXP, resetRhythmXP]);

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
  // Groove Analyzer Initialization
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
  // Rhythm XP Initialization
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

  // Don't render if no beat map
  if (!beatMap) {
    return null;
  }

  // Get difficulty display info
  return (
    <div className="beat-practice-view" ref={containerRef}>
      {/* Header Bar */}
      <PracticeHeader
        difficultyPreset={difficultyPreset}
        subdivisionPlaybackAvailable={subdivisionPlaybackAvailable}
        showSubdivisionPlayground={showSubdivisionPlayground}
        onToggleSubdivisionPlayground={() => setShowSubdivisionPlayground(!showSubdivisionPlayground)}
        onOpenSettings={() => setIsSettingsPanelOpen(true)}
        onExit={handleExit}
      />

      {/* Beat Stream Mode Toggle */}
      <BeatStreamModeToggle
        mode={beatStreamMode}
        onModeChange={setBeatStreamMode}
        interpolatedBeatMap={interpolatedBeatMap}
        subdividedBeatMap={subdividedBeatMap}
        viewMode={keyLaneViewMode}
        subdivisionPlaygroundActive={showSubdivisionPlayground}
      />

      {/* View Mode Toggle - Switch between TapArea and KeyLane views */}
      <ViewModeToggle
        subdividedBeatMap={subdividedBeatMap}
        mode={keyLaneViewMode}
        onModeChange={setKeyLaneViewMode}
        hasRequiredKeys={hasRequiredKeys}
        chartStyle={chartStyle}
        subdivisionPlaygroundActive={showSubdivisionPlayground}
      />

      {/* BPM and Position Display */}
      <PracticeStatsBar
        currentBpm={currentBpm}
        beatMapBpm={beatMap.bpm}
        interpolationStats={interpolationStats}
        currentTime={currentTime}
        duration={duration}
        rhythmSessionTotals={rhythmSessionTotals}
        lastRhythmXPResult={lastRhythmXPResult}
        currentCombo={currentCombo}
        subdivisionPlaybackAvailable={subdivisionPlaybackAvailable}
        currentSubdivision={currentSubdivision}
        subdivisionIsActive={subdivisionIsActive}
      />

      {/* Playback Controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        onRestart={() => handleSeek(0)}
        onPlayPause={handlePlayPause}
      />

      {/* Subdivision Playground - Real-time subdivision switching */}
      <SubdivisionPlayground
        available={subdivisionPlaybackAvailable}
        visible={showSubdivisionPlayground}
        currentSubdivision={currentSubdivision}
        isActive={subdivisionIsActive}
        isPlaying={isPlaying}
        transitionMode={transitionMode}
        onSubdivisionChange={setSubdivision}
        onTransitionModeChange={setTransitionMode}
      />

      {/* Progress Bar for Absolute Seeking */}
      <PracticeProgressBar
        beatMap={beatMap}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
      />

      {/* Practice Play Area - Timeline, GrooveMeter, TapArea/KeyLane */}
      <PracticePlayArea
        keyLaneViewMode={keyLaneViewMode}
        beatMap={beatMap}
        subdividedBeatMap={subdividedBeatMap}
        realtimeSubdividedBeatMap={realtimeSubdividedBeatMap}
        beatStreamMode={beatStreamMode}
        currentTime={currentTime}
        isPlaying={isPlaying}
        streamIsActive={streamIsActive}
        streamIsPaused={streamIsPaused}
        lastBeatEvent={lastBeatEvent}
        handleTap={handleTap}
        lastTapResult={lastTapResult}
        showFeedback={showFeedback}
        hideTapFeedback={hideTapFeedback}
        showTooFast={showTooFast}
        tapVisualTime={tapVisualTime}
        rhythmSessionTotals={rhythmSessionTotals}
        currentCombo={currentCombo}
        lastRhythmXPResult={lastRhythmXPResult}
        grooveState={grooveState}
        pendingGrooveEndBonus={pendingGrooveEndBonus}
        pendingComboEndBonus={pendingComboEndBonus}
        clearPendingBonuses={clearPendingBonuses}
        interpolationData={interpolationData}
        showGridOverlay={showGridOverlay}
        showTempoDriftVisualization={showTempoDriftVisualization}
        isDownbeatSelectionMode={isDownbeatSelectionMode}
        showMeasureBoundaries={showMeasureBoundaries}
        handleSeek={handleSeek}
        handleBeatClick={handleBeatClick}
      />

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

      {/* Game Stats - For Post Game */}
      {/* Tap Statistics - Using dedicated TapStats component */}
      <TapStats />

      {/* Rhythm XP Session Stats */}
      <RhythmXPSessionStats
        sessionTotals={rhythmSessionTotals}
        pendingComboBonus={pendingComboEndBonus}
        pendingGrooveBonus={pendingGrooveEndBonus}
        onClearBonuses={clearPendingBonuses}
        onClaimXP={handleClaimXP}
        hasCharacter={hasCharacter}
      />

      {/* Groove Session Stats */}
      {(bestGrooveHotness > 0 || bestGrooveStreak > 0) && (
        <GrooveStats
          bestHotness={bestGrooveHotness}
          bestStreak={bestGrooveStreak}
          currentHotness={grooveState?.hotness}
          currentStreak={grooveState?.streakLength}
          showComparison={true}
        />
      )}

      {/* Tap Timing Debug Panel - helps detect input latency */}
      <TapTimingDebugPanel
        tapHistory={tapDebugHistory}
        tapStats={tapStats}
        accuracyThresholds={accuracyThresholds}
        difficultyPreset={difficultyPreset}
        rhythmSessionTotals={rhythmSessionTotals}
      />

      {/* Modals */}
      {/* Difficulty Settings Panel */}
      <DifficultySettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
      />

      {/* Exit Prompt Modal (End Session on Practice Exit) */}
      <ExitPromptModal
        isOpen={showExitPrompt}
        totalScore={rhythmSessionTotals?.totalScore ?? 0}
        totalXP={rhythmSessionTotals?.totalXP ?? 0}
        maxCombo={maxCombo}
        onClaimXPAndExit={handleClaimXPAndExit}
        onDiscardAndExit={handleDiscardAndExit}
        onCancel={handleCancelExit}
      />

      {/* Level-Up Detail Modal (Claim XP Handler) */}
      <LevelUpDetailModal
        levelUpDetails={levelUpDetails}
        isOpen={showLevelUpModal}
        onClose={() => setShowLevelUpModal(false)}
      />
    </div>
  );
}
