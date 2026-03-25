/**
 * AutoBeatPracticeView Component
 *
 * Practice view for auto-generated levels using BeatStream.
 * This component provides the full practice experience for levels
 * created by the automatic level generation pipeline.
 *
 * Features:
 * - BeatStream integration for real-time beat synchronization
 * - Difficulty switching (Natural/Easy/Medium/Hard)
 * - Game controls (play, pause, restart, seek)
 * - Score and accuracy tracking (TapStats, GrooveStats, RhythmXP)
 * - Audio playback sync
 *
 * Task 8.2: BeatStream Practice Mode Integration
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { Activity, Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import './AutoBeatPracticeView.css';
import {
    useBeatDetectionStore,
    useGrooveState,
    useBestGrooveHotness,
    useBestGrooveStreak,
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
import { Button } from '../Button';
import { logger } from '../../../utils/logger';
import { chartedBeatMapToBeatMap } from '../../../utils/chartedBeatMapAdapter';
import type { DifficultyLevel, AllDifficultiesWithNatural } from '../../../types/levelGeneration';
import type { BeatMap } from 'playlist-data-engine';
import type { ExtendedButtonPressResult } from '../../../types';
import { usePlaylistStore } from '../../../store/playlistStore';
import { useCharacterStore } from '../../../store/characterStore';
import { LevelUpDetailModal } from '../../LevelUpDetailModal';

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

    // Audio player state
    const { playbackState, currentTime, pause, resume, seek } = useAudioPlayerStore();
    const duration = useTrackDuration();
    const isPlaying = playbackState === 'playing';

    // Groove state for GrooveMeter display
    const grooveState = useGrooveState();
    const bestGrooveHotness = useBestGrooveHotness();
    const bestGrooveStreak = useBestGrooveStreak();

    // State for level-up modal
    const [showLevelUpModal, setShowLevelUpModal] = useState(false);

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
    const convertedBeatMap: BeatMap | null = currentBeatMap
        ? chartedBeatMapToBeatMap(currentBeatMap.chart)
        : null;

    // Beat stream hook for real-time beat synchronization
    const {
        checkTap,
        isActive: streamIsActive,
        isPaused: streamIsPaused,
        seekStream,
        currentBpm,
    } = useBeatStream(convertedBeatMap, undefined, true, 'subdivided');

    // Tap feedback hook for managing visual feedback
    const { showFeedback, lastTapResult, showTapFeedback } = useTapFeedback(500);

    // Ref for tap area to handle keyboard focus
    const tapAreaRef = useRef<HTMLDivElement>(null);

    // Ref to track last tap time for debouncing
    const lastTapTimeRef = useRef<number>(0);

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

        // Debounce rapid taps
        if (now - lastTapTimeRef.current < MIN_TAP_INTERVAL_MS) {
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
     * Handle seek backward
     */
    const handleSeekBackward = useCallback(() => {
        const newTime = Math.max(0, currentTime - 5);
        seek(newTime);
        seekStream?.(newTime);
    }, [currentTime, seek, seekStream]);

    /**
     * Handle seek forward
     */
    const handleSeekForward = useCallback(() => {
        const newTime = Math.min(duration, currentTime + 5);
        seek(newTime);
        seekStream?.(newTime);
    }, [currentTime, duration, seek, seekStream]);

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
    const handleClaimXP = useCallback(async () => {
        if (!hasCharacter || !trackCharacter || !rhythmSessionTotals) return;

        try {
            const result = addRhythmXP(trackCharacter.seed, rhythmSessionTotals.totalXP);
            if (result && result.leveledUp) {
                // Show level up modal if character leveled up
                setShowLevelUpModal(true);
            }
            clearPendingBonuses();
        } catch (error) {
            logger.error('BeatDetection', 'Failed to claim XP', { error });
        }
    }, [hasCharacter, trackCharacter, rhythmSessionTotals, addRhythmXP, clearPendingBonuses]);

    // Calculate beat counts for difficulty switcher
    const beatCounts = allDifficultyLevels
        ? {
            natural: allDifficultyLevels.natural?.chart.beats.length ?? 0,
            easy: allDifficultyLevels.easy.chart.beats.length,
            medium: allDifficultyLevels.medium.chart.beats.length,
            hard: allDifficultyLevels.hard.chart.beats.length,
        }
        : undefined;

    // Convert accuracy to display string
    const getAccuracyDisplay = (result: ExtendedButtonPressResult | null): string => {
        if (!result) return '';
        return result.accuracy.toUpperCase();
    };

    return (
        <div className="auto-beat-practice-view">
            {/* Header with exit button */}
            <div className="auto-beat-practice-header">
                <div className="auto-beat-practice-header-left">
                    <Activity className="auto-beat-practice-header-icon" />
                    <span className="auto-beat-practice-title">Practice Mode</span>
                    <span className="auto-beat-practice-badge">Auto-Generated</span>
                </div>
                <div className="auto-beat-practice-header-right">
                    <Button variant="ghost" size="sm" onClick={handleExit}>
                        Exit
                    </Button>
                </div>
            </div>

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

            {/* Playback controls */}
            <div className="auto-beat-practice-controls">
                <Button variant="ghost" size="sm" onClick={handleSeekBackward} title="Back 5s">
                    <SkipBack size={20} />
                </Button>
                <Button variant="primary" size="md" onClick={handlePlayPause}>
                    {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSeekForward} title="Forward 5s">
                    <SkipForward size={20} />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRestart} title="Restart">
                    <RotateCcw size={20} />
                </Button>
            </div>

            {/* Current time display */}
            <div className="auto-beat-practice-time">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
            </div>

            {/* Tap area */}
            <div
                ref={tapAreaRef}
                className="auto-beat-practice-tap-area"
                onClick={() => handleTap()}
                tabIndex={0}
                role="button"
                aria-label="Tap area"
            >
                {showFeedback && lastTapResult && (
                    <div className={`auto-beat-practice-feedback auto-beat-practice-feedback--${lastTapResult.accuracy}`}>
                        {getAccuracyDisplay(lastTapResult)}
                    </div>
                )}
                <div className="auto-beat-practice-tap-instruction">
                    {streamIsActive && !streamIsPaused
                        ? 'Tap here or press any key'
                        : streamIsPaused
                            ? 'Beat stream paused'
                            : 'Start playback to begin'}
                </div>
            </div>

            {/* Stream status indicator */}
            <div className="auto-beat-practice-stream-status">
                <Activity
                    className={`auto-beat-practice-stream-icon ${streamIsActive && !streamIsPaused ? 'auto-beat-practice-stream-icon--active' : ''} ${streamIsPaused ? 'auto-beat-practice-stream-icon--paused' : ''}`}
                />
                <span className="auto-beat-practice-stream-label">
                    {streamIsActive
                        ? (streamIsPaused ? 'Beat stream paused' : 'Beat stream active')
                        : 'Beat stream inactive'}
                </span>
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

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default AutoBeatPracticeView;
