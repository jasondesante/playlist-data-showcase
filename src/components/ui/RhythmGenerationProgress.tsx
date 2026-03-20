/**
 * RhythmGenerationProgress Component
 *
 * Displays progress for the rhythm generation pipeline with status indicators
 * and duration tracking for each stage.
 *
 * Pipeline stages:
 * 1. Multi-Band Analysis - Analyzing frequency bands
 * 2. Transient Detection - Detecting audio transients
 * 3. Quantization - Quantizing to beat grid
 * 4. Phrase Detection - Detecting rhythmic phrases
 * 5. Composite Stream - Building composite stream
 * 6. Difficulty Variants - Generating difficulty variants
 *
 * @example
 * ```tsx
 * <RhythmGenerationProgress
 *   progress={{ phase: 'transients', progress: 25, message: 'Detecting transients...' }}
 * />
 * ```
 */

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, Zap, Circle } from 'lucide-react';
import './RhythmGenerationProgress.css';
import type { RhythmGenerationProgress as RhythmGenerationProgressType, RhythmGenerationPhase } from '../../types/rhythmGeneration';
import { cn } from '../../utils/cn';

// ============================================================
// Types
// ============================================================

export interface RhythmGenerationProgressProps {
    /** Current generation progress state */
    progress: RhythmGenerationProgressType;
    /** Optional additional CSS classes */
    className?: string;
    /** Whether to show detailed timing information */
    showTiming?: boolean;
}

interface StageInfo {
    id: RhythmGenerationPhase;
    label: string;
    description: string;
}

interface StageTiming {
    startedAt: number | null;
    completedAt: number | null;
}

// ============================================================
// Constants
// ============================================================

const PIPELINE_STAGES: StageInfo[] = [
    { id: 'multiBand', label: 'Multi-Band Analysis', description: 'Analyzing frequency bands' },
    { id: 'transients', label: 'Transient Detection', description: 'Detecting audio transients' },
    { id: 'quantize', label: 'Quantization', description: 'Quantizing to beat grid' },
    { id: 'phrases', label: 'Phrase Detection', description: 'Detecting rhythmic phrases' },
    { id: 'composite', label: 'Composite Stream', description: 'Building composite stream' },
    { id: 'variants', label: 'Difficulty Variants', description: 'Generating difficulty variants' },
];

const PHASE_ORDER: RhythmGenerationPhase[] = ['multiBand', 'transients', 'quantize', 'phrases', 'composite', 'variants'];

// ============================================================
// Helper Functions
// ============================================================

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
                'rhythm-progress-stage',
                `rhythm-progress-stage--${status}`
            )}
        >
            <div className="rhythm-progress-stage__indicator">
                {status === 'complete' ? (
                    <CheckCircle size={16} className="rhythm-progress-stage__icon rhythm-progress-stage__icon--complete" />
                ) : status === 'active' ? (
                    <Zap size={16} className="rhythm-progress-stage__icon rhythm-progress-stage__icon--active" />
                ) : (
                    <Circle size={16} className="rhythm-progress-stage__icon rhythm-progress-stage__icon--pending" />
                )}
            </div>
            <div className="rhythm-progress-stage__content">
                <span className="rhythm-progress-stage__label">{stage.label}</span>
                {status === 'active' && (
                    <span className="rhythm-progress-stage__description">{stage.description}</span>
                )}
                {status === 'complete' && showTiming && duration !== null && (
                    <span className="rhythm-progress-stage__duration">{formatDuration(duration)}</span>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * RhythmGenerationProgress
 *
 * Displays a visual progress indicator for the rhythm generation pipeline.
 * Shows each stage with its status (pending, active, or complete) and
 * optionally shows timing information for completed stages.
 */
export function RhythmGenerationProgress({
    progress,
    className,
    showTiming = true,
}: RhythmGenerationProgressProps) {
    // Track timing for each stage
    const [stageTimings, setStageTimings] = useState<Record<RhythmGenerationPhase, StageTiming>>(() => {
        const initial: Record<string, StageTiming> = {};
        PHASE_ORDER.forEach(phase => {
            initial[phase] = { startedAt: null, completedAt: null };
        });
        return initial as Record<RhythmGenerationPhase, StageTiming>;
    });

    // Track the previous phase to detect transitions
    const prevPhaseRef = useRef<RhythmGenerationPhase | null>(null);

    // Update timings when phase changes
    useEffect(() => {
        const currentPhase = progress.phase;
        const prevPhase = prevPhaseRef.current;

        // If this is the first time we're seeing a phase, mark it as started
        if (currentPhase && stageTimings[currentPhase].startedAt === null) {
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
    }, [progress.phase, stageTimings]);

    // Reset timings when progress goes to 0 or null
    useEffect(() => {
        if (progress.progress === 0 && progress.phase === 'multiBand') {
            // Reset all timings
            const reset: Record<string, StageTiming> = {};
            PHASE_ORDER.forEach(phase => {
                reset[phase] = { startedAt: null, completedAt: null };
            });
            setStageTimings(reset as Record<RhythmGenerationPhase, StageTiming>);
            prevPhaseRef.current = null;
        }
    }, [progress.progress, progress.phase]);

    const currentPhaseIndex = PHASE_ORDER.indexOf(progress.phase);

    return (
        <div className={cn('rhythm-progress', className)}>
            {/* Overall progress bar */}
            <div className="rhythm-progress__bar-container">
                <div
                    className="rhythm-progress__bar"
                    style={{ width: `${progress.progress}%` }}
                    role="progressbar"
                    aria-valuenow={progress.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Rhythm generation progress: ${progress.progress}%`}
                />
            </div>

            {/* Progress percentage */}
            <div className="rhythm-progress__percentage">{progress.progress}%</div>

            {/* Status message */}
            <p className="rhythm-progress__message">{progress.message}</p>

            {/* Pipeline stages */}
            <div className="rhythm-progress__stages">
                {PIPELINE_STAGES.map((stage, index) => {
                    const isActive = stage.id === progress.phase;
                    const isComplete = index < currentPhaseIndex;

                    const status: 'pending' | 'active' | 'complete' = isComplete
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

export default RhythmGenerationProgress;
