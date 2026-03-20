/**
 * RhythmGenerationTab Component
 *
 * Main tab component for Step 2 in automatic mode.
 * Orchestrates all visualization panels for the rhythm generation feature.
 *
 * This is a pure visualization tab - all settings are in Step 1 (Analyze).
 * When auto mode is on, rhythm generation starts automatically after beat detection.
 *
 * Features:
 * - Loading state with pipeline progress indicator
 * - Error state with retry and "Switch to Manual" options
 * - Collapsible sections for visualization panels (future phases)
 * - Metadata display on successful generation
 */

import { Sparkles, AlertTriangle, CheckCircle, Music, Zap, Layers } from 'lucide-react';
import './RhythmGenerationTab.css';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { CollapsibleSection } from '../Party/CollapsibleSection';
import {
    useGeneratedRhythm,
    useRhythmGenerationProgress,
    useBeatDetectionActions,
} from '../../store/beatDetectionStore';
import type {
    GeneratedRhythm,
    RhythmGenerationProgress,
} from '../../types/rhythmGeneration';
import { cn } from '../../utils/cn';

// ============================================================
// Types
// ============================================================

export interface RhythmGenerationTabProps {
    /** Audio URL for retry functionality */
    audioUrl?: string;
    /** Difficulty setting from Step 1 */
    difficulty?: 'easy' | 'medium' | 'hard';
    /** Output mode setting from Step 1 */
    outputMode?: 'composite' | 'low' | 'mid' | 'high';
    /** Intensity threshold setting from Step 1 */
    intensityThreshold?: number;
    /** Callback when user wants to switch to manual mode */
    onSwitchToManual?: () => void;
    /** Callback when user wants to retry generation */
    onRetry?: () => void;
    /** Callback when generation is complete and user wants to proceed */
    onProceed?: () => void;
    /** Additional CSS class names */
    className?: string;
}

interface PipelineStage {
    id: string;
    label: string;
    description: string;
}

// ============================================================
// Constants
// ============================================================

const PIPELINE_STAGES: PipelineStage[] = [
    { id: 'multiBand', label: 'Multi-Band Analysis', description: 'Analyzing frequency bands' },
    { id: 'transients', label: 'Transient Detection', description: 'Detecting audio transients' },
    { id: 'quantize', label: 'Quantization', description: 'Quantizing to beat grid' },
    { id: 'phrases', label: 'Phrase Detection', description: 'Detecting rhythmic phrases' },
    { id: 'composite', label: 'Composite Stream', description: 'Building composite stream' },
    { id: 'variants', label: 'Difficulty Variants', description: 'Generating difficulty variants' },
];

const PHASE_ORDER = ['multiBand', 'transients', 'quantize', 'phrases', 'composite', 'variants'];

// ============================================================
// Sub-components
// ============================================================

/**
 * Progress indicator for the rhythm generation pipeline.
 */
interface RhythmGenerationProgressUIProps {
    progress: RhythmGenerationProgress;
}

function RhythmGenerationProgressUI({ progress }: RhythmGenerationProgressUIProps) {
    const currentPhaseIndex = PHASE_ORDER.indexOf(progress.phase);

    return (
        <div className="rhythm-generation-progress">
            <div className="rhythm-generation-progress-header">
                <Sparkles className="rhythm-generation-progress-icon" />
                <h4 className="rhythm-generation-progress-title">Generating Rhythm Patterns...</h4>
            </div>

            {/* Overall progress bar */}
            <div className="rhythm-generation-progress-bar-container">
                <div
                    className="rhythm-generation-progress-bar"
                    style={{ width: `${progress.progress}%` }}
                />
            </div>

            {/* Phase message */}
            <p className="rhythm-generation-progress-message">{progress.message}</p>

            {/* Pipeline stages */}
            <div className="rhythm-generation-pipeline">
                {PIPELINE_STAGES.map((stage, index) => {
                    const isActive = stage.id === progress.phase;
                    const isComplete = index < currentPhaseIndex;
                    const isPending = index > currentPhaseIndex;

                    return (
                        <div
                            key={stage.id}
                            className={cn(
                                'rhythm-generation-pipeline-stage',
                                isActive && 'active',
                                isComplete && 'complete',
                                isPending && 'pending'
                            )}
                        >
                            <div className="rhythm-generation-pipeline-stage-indicator">
                                {isComplete ? (
                                    <CheckCircle size={14} />
                                ) : isActive ? (
                                    <Zap size={14} className="rhythm-generation-pulse" />
                                ) : (
                                    <div className="rhythm-generation-pipeline-stage-dot" />
                                )}
                            </div>
                            <span className="rhythm-generation-pipeline-stage-label">
                                {stage.label}
                            </span>
                        </div>
                    );
                })}
            </div>

            {/* Progress percentage */}
            <p className="rhythm-generation-progress-percent">{progress.progress}%</p>
        </div>
    );
}

/**
 * Error state UI with retry option.
 */
interface RhythmGenerationErrorProps {
    error: string;
    onRetry?: () => void;
    onSwitchToManual?: () => void;
}

function RhythmGenerationError({ error, onRetry, onSwitchToManual }: RhythmGenerationErrorProps) {
    return (
        <div className="rhythm-generation-error">
            <div className="rhythm-generation-error-icon">
                <AlertTriangle size={32} />
            </div>
            <h4 className="rhythm-generation-error-title">Rhythm Generation Failed</h4>
            <p className="rhythm-generation-error-message">{error}</p>
            <div className="rhythm-generation-error-actions">
                {onRetry && (
                    <Button variant="primary" onClick={onRetry}>
                        Retry
                    </Button>
                )}
                {onSwitchToManual && (
                    <Button variant="outline" onClick={onSwitchToManual}>
                        Switch to Manual Mode
                    </Button>
                )}
            </div>
        </div>
    );
}

/**
 * Success state UI showing generated rhythm metadata.
 */
interface RhythmGenerationResultProps {
    rhythm: GeneratedRhythm;
    onProceed?: () => void;
}

function RhythmGenerationResult({ rhythm, onProceed }: RhythmGenerationResultProps) {
    const { metadata } = rhythm;

    return (
        <div className="rhythm-generation-result">
            <div className="rhythm-generation-result-header">
                <CheckCircle className="rhythm-generation-result-icon" size={24} />
                <h4 className="rhythm-generation-result-title">Rhythm Generated Successfully!</h4>
            </div>

            {/* Metadata stats */}
            <div className="rhythm-generation-result-stats">
                <div className="rhythm-generation-stat">
                    <span className="rhythm-generation-stat-label">Transients Detected</span>
                    <span className="rhythm-generation-stat-value">
                        {metadata.transientsDetected}
                    </span>
                </div>
                <div className="rhythm-generation-stat">
                    <span className="rhythm-generation-stat-label">Phrases Detected</span>
                    <span className="rhythm-generation-stat-value">{metadata.phrasesDetected}</span>
                </div>
                <div className="rhythm-generation-stat">
                    <span className="rhythm-generation-stat-label">Natural Difficulty</span>
                    <span className="rhythm-generation-stat-value rhythm-generation-difficulty-badge">
                        {metadata.naturalDifficulty}
                    </span>
                </div>
                <div className="rhythm-generation-stat">
                    <span className="rhythm-generation-stat-label">Processing Time</span>
                    <span className="rhythm-generation-stat-value">
                        {metadata.processingTimeMs}ms
                    </span>
                </div>
            </div>

            {/* Visualization panels placeholder - will be expanded in future phases */}
            <div className="rhythm-generation-visualizations">
                <CollapsibleSection
                    title="Transient Detection"
                    subtitle="Raw transient analysis results"
                    icon={<Zap size={18} />}
                    badge={metadata.transientsDetected}
                    defaultCollapsed={false}
                >
                    <div className="rhythm-generation-visualization-placeholder">
                        <Music size={24} />
                        <p>Transient timeline visualization coming in Phase 4</p>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Multi-Band Analysis"
                    subtitle="Frequency band breakdown"
                    icon={<Layers size={18} />}
                    defaultCollapsed={true}
                >
                    <div className="rhythm-generation-visualization-placeholder">
                        <Layers size={24} />
                        <p>Multi-band visualization coming in Phase 5</p>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Quantization"
                    subtitle="Beat grid quantization results"
                    icon={<Music size={18} />}
                    defaultCollapsed={true}
                >
                    <div className="rhythm-generation-visualization-placeholder">
                        <Music size={24} />
                        <p>Quantization visualization coming in Phase 6</p>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Difficulty Variants"
                    subtitle="Easy / Medium / Hard variations"
                    icon={<Zap size={18} />}
                    defaultCollapsed={false}
                >
                    <div className="rhythm-generation-visualization-placeholder">
                        <Zap size={24} />
                        <p>Difficulty variants visualization coming in Phase 7</p>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection
                    title="Phrase Detection"
                    subtitle="Detected rhythmic patterns"
                    icon={<Music size={18} />}
                    badge={metadata.phrasesDetected}
                    defaultCollapsed={true}
                >
                    <div className="rhythm-generation-visualization-placeholder">
                        <Music size={24} />
                        <p>Phrase detection visualization coming in Phase 8</p>
                    </div>
                </CollapsibleSection>
            </div>

            {/* Proceed button */}
            {onProceed && (
                <div className="rhythm-generation-proceed">
                    <Button variant="primary" onClick={onProceed}>
                        Go to Practice
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * Placeholder state when waiting for generation to start.
 */
function RhythmGenerationPlaceholder() {
    return (
        <div className="rhythm-generation-placeholder">
            <div className="rhythm-generation-placeholder-icon">
                <Music size={32} />
            </div>
            <h4 className="rhythm-generation-placeholder-title">Ready to Generate</h4>
            <p className="rhythm-generation-placeholder-text">
                Click "Re-Analyze" in Step 1 to regenerate the beat map and rhythm patterns.
            </p>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * RhythmGenerationTab
 *
 * Main tab component for the Rhythm Generation step in automatic mode.
 * This component handles:
 * - Loading states with pipeline progress
 * - Error states with retry option
 * - Success states with visualization panels
 */
export function RhythmGenerationTab({
    audioUrl: _audioUrl,
    difficulty: _difficulty = 'medium',
    outputMode: _outputMode = 'composite',
    intensityThreshold: _intensityThreshold = 0.2,
    onSwitchToManual,
    onRetry,
    onProceed,
    className,
}: RhythmGenerationTabProps) {
    const generatedRhythm = useGeneratedRhythm();
    const progress = useRhythmGenerationProgress();
    const actions = useBeatDetectionActions();

    // Determine the current state
    const isGenerating = progress !== null && !progress.message.startsWith('Error:');
    const hasError = progress?.message.startsWith('Error:') ?? false;
    const hasRhythm = generatedRhythm !== null;

    // Handle retry
    const handleRetry = () => {
        if (onRetry) {
            onRetry();
        }
    };

    // Handle switch to manual
    const handleSwitchToManual = () => {
        if (onSwitchToManual) {
            onSwitchToManual();
            actions.setGenerationMode('manual');
        }
    };

    // Render based on state
    const renderContent = () => {
        // Loading state - show progress
        if (isGenerating && progress) {
            return <RhythmGenerationProgressUI progress={progress} />;
        }

        // Error state
        if (hasError && progress) {
            const errorMessage = progress.message.replace('Error: ', '');
            return (
                <RhythmGenerationError
                    error={errorMessage}
                    onRetry={handleRetry}
                    onSwitchToManual={handleSwitchToManual}
                />
            );
        }

        // Success state - show result
        if (hasRhythm && generatedRhythm) {
            return <RhythmGenerationResult rhythm={generatedRhythm} onProceed={onProceed} />;
        }

        // Default/placeholder state
        return <RhythmGenerationPlaceholder />;
    };

    return (
        <Card variant="elevated" padding="lg" className={cn('rhythm-generation-tab', className)}>
            <div className="rhythm-generation-section">
                <h3 className="rhythm-generation-title">
                    Rhythm Generation{' '}
                    <Tooltip content="Automatic rhythm pattern generation using transient detection and quantization" />
                </h3>

                {renderContent()}
            </div>
        </Card>
    );
}

export default RhythmGenerationTab;
