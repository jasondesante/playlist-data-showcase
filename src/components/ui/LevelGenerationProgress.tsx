/**
 * LevelGenerationProgress Component
 *
 * Displays a two-stage progress indicator for the complete level generation pipeline:
 * 1. Rhythm Generation (7 phases) - shown as complete
 * 2. Level Generation (4 phases) - current progress
 *
 * Level Generation phases:
 * 1. Pitch Detection - Detecting pitch at beat timestamps
 * 2. Melody Analysis - Analyzing pitch direction and intervals
 * 3. Button Mapping - Mapping pitch to DDR/Guitar Hero buttons
 * 4. Level Assembly - Building the final ChartedBeatMap
 *
 * Task 2.2: Create LevelGenerationProgress Component
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Zap, Circle, Music, Activity, Gamepad2, Layers } from 'lucide-react';
import './LevelGenerationProgress.css';
import { cn } from '../../utils/cn';

// ============================================================
// Types
// ============================================================

/**
 * Level generation progress phases as defined in the plan.
 */
export type LevelGenerationPhase =
    | 'pitchDetection'
    | 'melodyAnalysis'
    | 'buttonMapping'
    | 'levelAssembly';

/**
 * Engine stages as reported by the LevelGenerator.
 * These are mapped to our UI phases.
 */
export type EngineStage = 'rhythm' | 'pitch' | 'buttons' | 'conversion' | 'finalizing';

/**
 * Progress state for level generation.
 */
export interface LevelGenerationProgressState {
    /** Current engine stage */
    stage: EngineStage | string;
    /** Progress percentage (0-100) */
    progress: number;
    /** Human-readable status message */
    message: string;
}

export interface LevelGenerationProgressProps {
    /** Current generation progress state */
    progress: LevelGenerationProgressState;
    /** Optional additional CSS classes */
    className?: string;
    /** Whether to show detailed timing information */
    showTiming?: boolean;
    /** Total duration of rhythm generation phase (for display) */
    rhythmDuration?: number | null;
}

interface StageInfo {
    id: LevelGenerationPhase;
    label: string;
    description: string;
    icon: React.ReactNode;
}

interface StageTiming {
    startedAt: number | null;
    completedAt: number | null;
}

// ============================================================
// Constants
// ============================================================

/**
 * Level generation pipeline stages as defined in the plan.
 */
const LEVEL_STAGES: StageInfo[] = [
    {
        id: 'pitchDetection',
        label: 'Pitch Detection',
        description: 'Detecting pitch at beats',
        icon: <Music size={16} />,
    },
    {
        id: 'melodyAnalysis',
        label: 'Melody Analysis',
        description: 'Analyzing pitch contour',
        icon: <Activity size={16} />,
    },
    {
        id: 'buttonMapping',
        label: 'Button Mapping',
        description: 'Mapping to buttons',
        icon: <Gamepad2 size={16} />,
    },
    {
        id: 'levelAssembly',
        label: 'Level Assembly',
        description: 'Building final chart',
        icon: <Layers size={16} />,
    },
];

const PHASE_ORDER: LevelGenerationPhase[] = ['pitchDetection', 'melodyAnalysis', 'buttonMapping', 'levelAssembly'];

/**
 * Map engine stages to UI phases.
 * Engine stages: rhythm → pitch → buttons → conversion → finalizing
 * UI phases: pitchDetection → melodyAnalysis → buttonMapping → levelAssembly
 */
const ENGINE_TO_PHASE: Record<string, LevelGenerationPhase> = {
    pitch: 'pitchDetection',
    buttons: 'buttonMapping',
    conversion: 'levelAssembly',
    finalizing: 'levelAssembly',
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Map an engine stage to a UI phase.
 */
function mapEngineStageToPhase(engineStage: string): LevelGenerationPhase | null {
    return ENGINE_TO_PHASE[engineStage] ?? null;
}

/**
 * Calculate the duration of a stage in milliseconds.
 */
function calculateDuration(timing: StageTiming): number | null {
    if (timing.startedAt === null || timing.completedAt === null) {
        return null;
    }
    return timing.completedAt - timing.startedAt;
}

/**
 * Format duration for display.
 */
function formatDuration(ms: number | null): string {
    if (ms === null) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Calculate overall progress percentage based on engine stage and progress.
 * Engine stages are mapped to progress ranges:
 * - rhythm: 0-5% (loading audio)
 * - pitch: 5-35% (pitch detection + melody analysis)
 * - buttons: 35-65% (button mapping)
 * - conversion: 65-95% (level assembly)
 * - finalizing: 95-100%
 */
function calculateOverallProgress(stage: string, stageProgress: number): number {
    const stageRanges: Record<string, [number, number]> = {
        rhythm: [0, 5],
        pitch: [5, 35],
        buttons: [35, 65],
        conversion: [65, 95],
        finalizing: [95, 100],
    };

    const range = stageRanges[stage] ?? [0, 100];
    const [start, end] = range;
    return Math.round(start + (end - start) * (stageProgress / 100));
}

// ============================================================
// Sub-components
// ============================================================

interface StageIndicatorProps {
    stage: StageInfo;
    status: 'pending' | 'active' | 'complete';
    duration: number | null;
    showTiming: boolean;
}

function StageIndicator({ stage, status, duration, showTiming }: StageIndicatorProps) {
    return (
        <div
            className={cn(
                'level-progress-stage',
                `level-progress-stage--${status}`
            )}
        >
            <div className="level-progress-stage__indicator">
                {status === 'complete' ? (
                    <CheckCircle size={16} className="level-progress-stage__icon level-progress-stage__icon--complete" />
                ) : status === 'active' ? (
                    <Zap size={16} className="level-progress-stage__icon level-progress-stage__icon--active" />
                ) : (
                    <Circle size={16} className="level-progress-stage__icon level-progress-stage__icon--pending" />
                )}
            </div>
            <div className="level-progress-stage__content">
                <span className="level-progress-stage__label">{stage.label}</span>
                {status === 'active' && (
                    <span className="level-progress-stage__description">{stage.description}</span>
                )}
                {status === 'complete' && showTiming && duration !== null && (
                    <span className="level-progress-stage__duration">{formatDuration(duration)}</span>
                )}
            </div>
        </div>
    );
}

interface RhythmCompleteStageProps {
    duration: number | null;
    showTiming: boolean;
}

function RhythmCompleteStage({ duration, showTiming }: RhythmCompleteStageProps) {
    return (
        <div className="level-progress-stage level-progress-stage--complete level-progress-stage--rhythm">
            <div className="level-progress-stage__indicator">
                <CheckCircle size={16} className="level-progress-stage__icon level-progress-stage__icon--complete" />
            </div>
            <div className="level-progress-stage__content">
                <span className="level-progress-stage__label">Rhythm Generation</span>
                <span className="level-progress-stage__description">7 phases complete</span>
                {showTiming && duration !== null && (
                    <span className="level-progress-stage__duration">{formatDuration(duration)}</span>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * LevelGenerationProgress
 *
 * Displays a visual progress indicator for the complete level generation pipeline.
 * Shows two stages:
 * 1. Rhythm Generation (already complete)
 * 2. Level Generation (current progress)
 *
 * Each stage shows timing information when completed.
 */
export function LevelGenerationProgress({
    progress,
    className,
    showTiming = true,
    rhythmDuration = null,
}: LevelGenerationProgressProps) {
    // Track timing for each level generation stage
    const [stageTimings, setStageTimings] = useState<Record<LevelGenerationPhase, StageTiming>>(() => {
        const initial: Record<string, StageTiming> = {};
        PHASE_ORDER.forEach(phase => {
            initial[phase] = { startedAt: null, completedAt: null };
        });
        return initial as Record<LevelGenerationPhase, StageTiming>;
    });

    // Track the previous phase to detect transitions
    const prevPhaseRef = useRef<LevelGenerationPhase | null>(null);

    // Map engine stage to UI phase
    const currentPhase = mapEngineStageToPhase(progress.stage);

    // Update timings when phase changes
    useEffect(() => {
        if (!currentPhase) return;

        const prevPhase = prevPhaseRef.current;

        // If this is the first time we're seeing a phase, mark it as started
        if (stageTimings[currentPhase].startedAt === null) {
            setStageTimings(prev => ({
                ...prev,
                [currentPhase]: { ...prev[currentPhase], startedAt: Date.now() }
            }));
        }

        // If we transitioned to a new phase, mark the previous one as complete
        if (prevPhase !== null && prevPhase !== currentPhase && stageTimings[prevPhase]?.completedAt === null) {
            setStageTimings(prev => ({
                ...prev,
                [prevPhase]: { ...prev[prevPhase], completedAt: Date.now() }
            }));
        }

        // Update ref for next comparison
        prevPhaseRef.current = currentPhase;
    }, [currentPhase, stageTimings]);

    // Reset timings when progress goes to 0 or starts fresh
    useEffect(() => {
        if (progress.progress === 0 && progress.stage === 'rhythm') {
            // Reset all timings
            const reset: Record<string, StageTiming> = {};
            PHASE_ORDER.forEach(phase => {
                reset[phase] = { startedAt: null, completedAt: null };
            });
            setStageTimings(reset as Record<LevelGenerationPhase, StageTiming>);
            prevPhaseRef.current = null;
        }
    }, [progress.progress, progress.stage]);

    // Calculate overall progress
    const overallProgress = calculateOverallProgress(progress.stage, progress.progress);

    // Determine the current phase index
    const currentPhaseIndex = currentPhase ? PHASE_ORDER.indexOf(currentPhase) : -1;

    // Determine if level generation is complete
    const isComplete = progress.stage === 'finalizing' && progress.progress >= 100;

    return (
        <div className={cn('level-progress', className)}>
            {/* Overall progress bar */}
            <div className="level-progress__bar-container">
                <div
                    className="level-progress__bar"
                    style={{ width: `${overallProgress}%` }}
                    role="progressbar"
                    aria-valuenow={overallProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Level generation progress: ${overallProgress}%`}
                />
            </div>

            {/* Progress percentage */}
            <div className="level-progress__percentage">{overallProgress}%</div>

            {/* Status message */}
            <p className="level-progress__message">{progress.message}</p>

            {/* Two-stage progress display */}
            <div className="level-progress__stages">
                {/* Stage 1: Rhythm Generation (always complete when this component is shown) */}
                <RhythmCompleteStage
                    duration={rhythmDuration}
                    showTiming={showTiming}
                />

                {/* Divider */}
                <div className="level-progress__divider" />

                {/* Stage 2: Level Generation phases */}
                {LEVEL_STAGES.map((stage, index) => {
                    const isActive = stage.id === currentPhase && !isComplete;
                    const isCompleteStage = index < currentPhaseIndex || isComplete;

                    const status: 'pending' | 'active' | 'complete' = isCompleteStage
                        ? 'complete'
                        : isActive
                            ? 'active'
                            : 'pending';

                    const duration = calculateDuration(stageTimings[stage.id]);

                    return (
                        <StageIndicator
                            key={stage.id}
                            stage={stage}
                            status={status}
                            duration={duration}
                            showTiming={showTiming}
                        />
                    );
                })}
            </div>
        </div>
    );
}

export default LevelGenerationProgress;
