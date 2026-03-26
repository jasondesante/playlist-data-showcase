/**
 * AutoBeatPracticeView Component
 *
 * Practice view for auto-generated levels using BeatStream.
 * Uses the same visual components as manual mode (BeatPracticeView):
 * - KeyLaneView (DDR/Guitar Hero lanes)
 * - BeatTimeline (horizontal timeline)
 * - ViewModeToggle (Tap/DDR/Guitar switcher)
 * - GrooveMeter, ComboFeedbackDisplay
 * - PracticeHeader, PracticeStatsBar, PlaybackControls, PracticeProgressBar
 */

import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import './AutoBeatPracticeView.css';
import {
    useBeatDetectionStore,
    useGrooveState,
    useBestGrooveHotness,
    useBestGrooveStreak,
    useKeyLaneViewMode,
    useTapStatistics,
    useAccuracyThresholds,
} from '../../../store/beatDetectionStore';
import { useBeatStream } from '../../../hooks/useBeatStream';
import { useKeyboardInput } from '../../../hooks/useKeyboardInput';
import { useTrackDuration } from '../../../hooks/useTrackDuration';
import { useAudioPlayerStore } from '../../../store/audioPlayerStore';
import { useTapFeedback } from '../TapArea';
import { TapStats } from '../TapStats';
import { GrooveStats } from '../GrooveStats';
import { RhythmXPSessionStats } from '../RhythmXPSessionStats';
import { DifficultySwitcher } from '../DifficultySwitcher';
import { DifficultySettingsPanel } from '../DifficultySettingsPanel';
import { showToast } from '../Toast';
import { logger } from '../../../utils/logger';
import { chartedBeatMapToBeatMap, chartedBeatMapToSubdividedBeatMap } from '../../../utils/chartedBeatMapAdapter';
import type { DifficultyLevel, AllDifficultiesWithNatural, DifficultyPreset } from '../../../types';
import type { BeatMap } from 'playlist-data-engine';
import { usePlaylistStore } from '../../../store/playlistStore';
import { useCharacterStore } from '../../../store/characterStore';
import { LevelUpDetailModal } from '../../LevelUpDetailModal';

// Shared components from manual mode
import { PracticePlayArea } from './BeatPracticeView/PracticePlayArea';
import { ViewModeToggle } from './BeatPracticeView/ViewModeToggle';
import type { KeyLaneViewMode } from './BeatPracticeView/ViewModeToggle';
import { PracticeHeader } from './BeatPracticeView/PracticeHeader';
import { PracticeStatsBar } from './BeatPracticeView/PracticeStatsBar';
import { PlaybackControls } from './BeatPracticeView/PlaybackControls';
import { PracticeProgressBar } from './BeatPracticeView/PracticeProgressBar';
import { TapTimingDebugPanel, type TapDebugInfo } from './BeatPracticeView/TapTimingDebugPanel';

/**
 * Props for the AutoBeatPracticeView component
 */
interface AutoBeatPracticeViewProps {
    /** Callback to exit practice mode */
    onExit: () => void;
}

/**
 * Minimum time between taps in milliseconds.
 */
const MIN_TAP_INTERVAL_MS = 100;

export function AutoBeatPracticeView({ onExit }: AutoBeatPracticeViewProps) {
    // Store state and actions
    const allDifficultyLevels = useBeatDetectionStore((state) => state.allDifficultyLevels);
    const selectedDifficulty = useBeatDetectionStore((state) => state.selectedDifficulty);
    const setSelectedDifficulty = useBeatDetectionStore((state) => state.actions.setSelectedDifficulty);
    const recordTap = useBeatDetectionStore((state) => state.actions.recordTap);
    const stopPracticeMode = useBeatDetectionStore((state) => state.actions.stopPracticeMode);
    const setKeyLaneViewMode = useBeatDetectionStore((state) => state.actions.setKeyLaneViewMode);

    // Groove analyzer actions
    const initGrooveAnalyzer = useBeatDetectionStore((state) => state.actions.initGrooveAnalyzer);
    const resetGrooveAnalyzer = useBeatDetectionStore((state) => state.actions.resetGrooveAnalyzer);
    const recordGrooveHit = useBeatDetectionStore((state) => state.actions.recordGrooveHit);
    const recordGrooveMiss = useBeatDetectionStore((state) => state.actions.recordGrooveMiss);

    // Rhythm XP actions
    const initRhythmXP = useBeatDetectionStore((state) => state.actions.initRhythmXP);
    const recordRhythmHit = useBeatDetectionStore((state) => state.actions.recordRhythmHit);
    const breakCombo = useBeatDetectionStore((state) => state.actions.breakCombo);
    const resetRhythmXP = useBeatDetectionStore((state) => state.actions.resetRhythmXP);

    // Rhythm XP state
    const rhythmSessionTotals = useBeatDetectionStore((state) => state.rhythmSessionTotals);
    const pendingComboEndBonus = useBeatDetectionStore((state) => state.pendingComboEndBonus);
    const pendingGrooveEndBonus = useBeatDetectionStore((state) => state.pendingGrooveEndBonus);
    const clearPendingBonuses = useBeatDetectionStore((state) => state.actions.clearPendingBonuses);

    // View mode state
    const keyLaneViewMode = useKeyLaneViewMode();

    // Combo and XP result
    const currentCombo = useBeatDetectionStore((state) => state.currentCombo);
    const lastRhythmXPResult = useBeatDetectionStore((state) => state.lastRhythmXPResult);

    // Audio player state
    const { playbackState, currentTime, pause, resume, seek } = useAudioPlayerStore();
    const duration = useTrackDuration();
    const isPlaying = playbackState === 'playing';

    // Groove state for GrooveMeter display
    const grooveState = useGrooveState();
    const bestGrooveHotness = useBestGrooveHotness();
    const bestGrooveStreak = useBestGrooveStreak();

    // Tap statistics and accuracy thresholds for debug panel
    const tapStats = useTapStatistics();
    const accuracyThresholds = useAccuracyThresholds();

    // State for settings panel
    const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);

    // State for level-up modal
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);

    // Debug: track taps for timing analysis (limited to 1000)
    const MAX_DEBUG_HISTORY = 1000;
    const [tapDebugHistory, setTapDebugHistory] = useState<TapDebugInfo[]>([]);

    // Track audio time for debug info
    const audioTimeRef = useRef<number>(currentTime);
    audioTimeRef.current = currentTime;

    // State for tap visual feedback on timeline
    const [tapVisualTime, setTapVisualTime] = useState<number>(0);

    // State for showing "TOO FAST" indicator
    const [showTooFast, setShowTooFast] = useState(false);
    const tooFastTimeoutRef = useRef<number | null>(null);

    // Get selected track and character store for XP claiming
    const selectedTrack = usePlaylistStore((state) => state.selectedTrack);
    const characters = useCharacterStore((state) => state.characters);
    const addRhythmXP = useCharacterStore((state) => state.addRhythmXP);

    // Check if there's a character associated with the current track
    const trackCharacter = selectedTrack
        ? characters.find((c) => c.seed === selectedTrack.id)
        : null;
    const hasCharacter = !!trackCharacter;

    // Get the current beat map based on selected difficulty
    const currentBeatMap = getBeatMapForDifficulty(allDifficultyLevels, selectedDifficulty);

    // Convert ChartedBeatMap to BeatMap format for useBeatStream
    // Memoized to prevent infinite loop: initGrooveAnalyzer sets grooveState,
    // which triggers re-render, which would create a new object ref without memo.
    const convertedBeatMap: BeatMap | null = useMemo(
        () => currentBeatMap ? chartedBeatMapToBeatMap(currentBeatMap.chart) : null,
        [currentBeatMap]
    );

    // Convert to SubdividedBeatMap for KeyLaneView and ViewModeToggle
    const subdividedBeatMap = useMemo(
        () => currentBeatMap ? chartedBeatMapToSubdividedBeatMap(currentBeatMap.chart) : null,
        [currentBeatMap]
    );

    // Determine chart style from the generated level's controller mode
    const chartStyle: KeyLaneViewMode = useMemo(() => {
        const mode = currentBeatMap?.metadata?.controllerMode;
        if (mode === 'ddr') return 'ddr';
        if (mode === 'guitar_hero') return 'guitar-hero';
        return 'ddr'; // Default to DDR
    }, [currentBeatMap]);

    // Map selected difficulty to DifficultyPreset for PracticeHeader
    const difficultyPreset: DifficultyPreset = useMemo(() => {
        if (selectedDifficulty === 'natural') return 'easy';
        return selectedDifficulty;
    }, [selectedDifficulty]);

    // Beat stream hook for real-time beat synchronization
    const {
        checkTap,
        isActive: streamIsActive,
        isPaused: streamIsPaused,
        seekStream,
        currentBpm,
        lastBeatEvent,
    } = useBeatStream(convertedBeatMap, undefined, true, 'subdivided');

    // Tap feedback hook for managing visual feedback
    const { showFeedback, lastTapResult, showTapFeedback, hideTapFeedback } = useTapFeedback(500);

    // Ref to track last tap time for debouncing
    const lastTapTimeRef = useRef<number>(0);

    // Set default view mode on mount based on controller mode
    useEffect(() => {
        if (subdividedBeatMap) {
            setKeyLaneViewMode(chartStyle);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Initialize groove analyzer and rhythm XP on mount
    useEffect(() => {
        if (convertedBeatMap) {
            initGrooveAnalyzer();
            initRhythmXP();
            logger.info('BeatDetection', 'AutoBeatPracticeView initialized', {
                beatsCount: convertedBeatMap.beats.length,
                bpm: convertedBeatMap.bpm,
            });
        }
    }, [convertedBeatMap, initGrooveAnalyzer, initRhythmXP]);

    // Reset XP when audio position changes significantly (seek)
    useEffect(() => {
        return () => {
            resetRhythmXP();
            resetGrooveAnalyzer();
        };
    }, [resetRhythmXP, resetGrooveAnalyzer]);

    /**
     * Handle tap input from keyboard or click
     */
    const handleTap = useCallback((pressedKey?: string) => {
        const now = Date.now();

        // Check if tap is too fast (debounce check)
        if (now - lastTapTimeRef.current < MIN_TAP_INTERVAL_MS) {
            setShowTooFast(true);

            // Clear any existing timeout
            if (tooFastTimeoutRef.current) {
                clearTimeout(tooFastTimeoutRef.current);
            }

            // Hide indicator after a short delay
            tooFastTimeoutRef.current = window.setTimeout(() => {
                setShowTooFast(false);
            }, 300);

            return;
        }
        lastTapTimeRef.current = now;

        // Check if the tap hit a beat
        if (!checkTap || !streamIsActive) {
            logger.debug('BeatDetection', 'Tap ignored - stream not active');
            return;
        }

        const result = checkTap(pressedKey);

        if (result) {
            // Record the tap
            recordTap(result);

            // Show visual feedback - pass the full result object
            showTapFeedback(result);

            // Trigger timeline tap visual
            setTapVisualTime(Date.now());

            // Record debug info for timing analysis
            const debugInfo: TapDebugInfo = {
                registeredAt: performance.now(),
                audioTime: audioTimeRef.current,
                beatTime: result.matchedBeat?.timestamp ?? 0,
                offsetMs: Math.round(result.offset * 1000),
                accuracy: result.accuracy,
            };
            setTapDebugHistory(prev => {
                const newHistory = [debugInfo, ...prev];
                return newHistory.slice(0, MAX_DEBUG_HISTORY);
            });

            // Process groove and XP
            if (result.matchedBeat) {
                // Record groove hit
                recordGrooveHit(
                    result.offset,
                    currentBpm || convertedBeatMap?.bpm || 120,
                    result.matchedBeat.timestamp,
                    result.accuracy
                );

                // Record rhythm XP hit
                const grooveHotness = grooveState?.hotness || 0;
                recordRhythmHit(result.accuracy, grooveHotness);
            } else {
                // Missed - break combo
                breakCombo(1);
                recordGrooveMiss();
            }

            logger.debug('BeatDetection', 'Tap result', {
                accuracy: result.accuracy,
                offset: result.offset,
                matched: !!result.matchedBeat,
            });
        }
    }, [checkTap, streamIsActive, recordTap, showTapFeedback, recordGrooveHit, currentBpm, convertedBeatMap, grooveState, recordRhythmHit, breakCombo, recordGrooveMiss]);

    // Keep handleTapRef updated with the latest handleTap function
    const handleTapRef = useRef<(pressedKey?: string) => void>(() => { });
    handleTapRef.current = handleTap;

    // Keyboard input hook
    useKeyboardInput({
        enabled: true,
        onKeyDown: (key) => {
            handleTapRef.current(key);
        },
    });

    /**
     * Handle difficulty change
     */
    const handleDifficultyChange = useCallback((difficulty: DifficultyLevel) => {
        // Store current audio position
        const audioPosition = currentTime;

        // Change difficulty
        setSelectedDifficulty(difficulty);

        // The beat map will update via the store, and the beat stream will re-initialize
        // Restore audio position after a short delay to allow beat stream to re-initialize
        setTimeout(() => {
            seek(audioPosition);
            seekStream?.(audioPosition);
        }, 50);

        logger.info('BeatDetection', 'Changed difficulty', { difficulty, audioPosition });
    }, [currentTime, setSelectedDifficulty, seek, seekStream]);

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
     * Handle restart (seek to beginning)
     */
    const handleRestart = useCallback(() => {
        seek(0);
        seekStream?.(0);
        resetRhythmXP();
        resetGrooveAnalyzer();
        if (convertedBeatMap) {
            initGrooveAnalyzer();
            initRhythmXP();
        }
    }, [seek, seekStream, resetRhythmXP, resetGrooveAnalyzer, initGrooveAnalyzer, initRhythmXP, convertedBeatMap]);

    /**
     * Handle seek (from timeline, progress bar, or lane view)
     */
    const handleSeek = useCallback((time: number) => {
        seek(time);
        seekStream?.(time);
        resetGrooveAnalyzer();
        resetRhythmXP();
    }, [seek, seekStream, resetGrooveAnalyzer, resetRhythmXP]);

    /**
     * Handle exit with cleanup
     */
    const handleExit = useCallback(() => {
        stopPracticeMode();
        onExit();
    }, [stopPracticeMode, onExit]);

    /**
     * Handle XP claim
     */
    const handleClaimXP = useCallback((xp: number) => {
        if (!trackCharacter) return;

        const result = addRhythmXP(trackCharacter.seed, xp);

        if (result) {
            if (result.leveledUp && result.levelUpDetails) {
                setShowLevelUpModal(true);
                logger.info('BeatDetection', 'Character leveled up from rhythm XP!', {
                    characterName: result.character.name,
                    newLevel: result.newLevel,
                    xpEarned: result.xpEarned,
                });
            } else {
                showToast(`+${xp.toFixed(1)} XP added to ${trackCharacter.name}`, 'success');
            }
        }

        // Reset session after claiming so the button disappears
        resetRhythmXP();
    }, [trackCharacter, addRhythmXP, resetRhythmXP]);

    // Calculate beat counts for difficulty switcher
    const beatCounts = allDifficultyLevels
        ? {
            natural: allDifficultyLevels.natural?.chart.beats.length ?? 0,
            easy: allDifficultyLevels.easy.chart.beats.length,
            medium: allDifficultyLevels.medium.chart.beats.length,
            hard: allDifficultyLevels.hard.chart.beats.length,
        }
        : undefined;

    return (
        <div className="auto-beat-practice-view">
            {/* Header - same as manual mode */}
            <PracticeHeader
                difficultyPreset={difficultyPreset}
                subdivisionPlaybackAvailable={false}
                showSubdivisionPlayground={false}
                onToggleSubdivisionPlayground={() => {}}
                onOpenSettings={() => setIsSettingsPanelOpen(true)}
                onExit={handleExit}
            />

            {/* View mode toggle - tap area / DDR lanes / Guitar lanes */}
            <ViewModeToggle
                subdividedBeatMap={subdividedBeatMap}
                mode={keyLaneViewMode}
                onModeChange={setKeyLaneViewMode}
                hasRequiredKeys={true}
                chartStyle={chartStyle}
            />

            {/* Stats bar - BPM, position, XP, combo */}
            <PracticeStatsBar
                currentBpm={currentBpm ?? convertedBeatMap?.bpm ?? 0}
                beatMapBpm={convertedBeatMap?.bpm ?? 0}
                interpolationStats={null}
                currentTime={currentTime}
                duration={duration}
                rhythmSessionTotals={rhythmSessionTotals}
                lastRhythmXPResult={lastRhythmXPResult}
                currentCombo={currentCombo}
                subdivisionPlaybackAvailable={false}
                currentSubdivision=""
                subdivisionIsActive={false}
            />

            {/* Playback controls */}
            <PlaybackControls
                isPlaying={isPlaying}
                onRestart={handleRestart}
                onPlayPause={handlePlayPause}
            />

            {/* Progress bar with beat markers */}
            {convertedBeatMap && (
                <PracticeProgressBar
                    beatMap={convertedBeatMap}
                    currentTime={currentTime}
                    duration={duration}
                    onSeek={handleSeek}
                />
            )}

            {/* Main practice play area - BeatTimeline or KeyLaneView */}
            {convertedBeatMap && (
                <PracticePlayArea
                    keyLaneViewMode={keyLaneViewMode}
                    beatMap={convertedBeatMap}
                    subdividedBeatMap={subdividedBeatMap}
                    realtimeSubdividedBeatMap={null}
                    beatStreamMode="subdivided"
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                    streamIsActive={streamIsActive}
                    streamIsPaused={streamIsPaused}
                    lastBeatEvent={lastBeatEvent ?? null}
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
                    interpolationData={null}
                    showGridOverlay={false}
                    showTempoDriftVisualization={false}
                    isDownbeatSelectionMode={false}
                    showMeasureBoundaries={false}
                    handleSeek={handleSeek}
                    handleBeatClick={() => {}}
                />
            )}

            {/* Difficulty switcher */}
            <div className="auto-beat-practice-difficulty-section">
                <DifficultySwitcher
                    selected={selectedDifficulty}
                    onChange={handleDifficultyChange}
                    beatCounts={beatCounts}
                    showCounts={true}
                    size="default"
                />
            </div>

            {/* Tap Statistics */}
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

            {/* Groove Stats */}
            {(bestGrooveHotness > 0 || bestGrooveStreak > 0) && (
                <GrooveStats
                    bestHotness={bestGrooveHotness}
                    bestStreak={bestGrooveStreak}
                    currentHotness={grooveState?.hotness}
                    currentStreak={grooveState?.streakLength}
                    showComparison={true}
                />
            )}

            {/* Level-Up Modal */}
            <LevelUpDetailModal
                levelUpDetails={[]}
                isOpen={showLevelUpModal}
                onClose={() => setShowLevelUpModal(false)}
            />

            {/* Difficulty Settings Panel */}
            <DifficultySettingsPanel
                isOpen={isSettingsPanelOpen}
                onClose={() => setIsSettingsPanelOpen(false)}
            />

            {/* Tap Timing Debug Panel - helps detect input latency */}
            <TapTimingDebugPanel
                tapHistory={tapDebugHistory}
                tapStats={tapStats}
                accuracyThresholds={accuracyThresholds}
                difficultyPreset={difficultyPreset}
                rhythmSessionTotals={rhythmSessionTotals}
            />
        </div>
    );
}

/**
 * Get the beat map for a specific difficulty level
 */
function getBeatMapForDifficulty(
    levels: AllDifficultiesWithNatural | null,
    difficulty: DifficultyLevel
) {
    if (!levels) return null;

    switch (difficulty) {
        case 'natural':
            return levels.natural || levels.medium;
        case 'easy':
            return levels.easy;
        case 'medium':
            return levels.medium;
        case 'hard':
            return levels.hard;
        default:
            return levels.medium;
    }
}

export default AutoBeatPracticeView;
