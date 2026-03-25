/**
 * PitchLevelTab Component
 *
 * Main tab component for Step 3 in automatic mode.
 * Orchestrates all visualization panels for pitch detection and level generation.
 *
 * This is a pure visualization tab - all settings are in Step 1 (Analyze).
 * When auto mode is on, level generation starts automatically after rhythm generation.
 *
 * Features:
 * - Loading state with level generation progress indicator
 * - Error state with retry options
 * - Collapsible sections for visualization panels (future phases)
 * - Audio sync state shared with RhythmGenerationTab
 * - Default expanded: Final Level Output panel
 *
 * Task 2.1: Create PitchLevelTab Container Component
 */

import { useState, useCallback } from 'react';
import {
    AlertTriangle,
    CheckCircle,
    Music,
    Gamepad2,
    Activity,
    ArrowRight,
    RefreshCw,
} from 'lucide-react';
import './PitchLevelTab.css';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { CollapsibleSection } from '../Party/CollapsibleSection';
import { LevelGenerationDebugPanel } from '../ui/BeatDetectionTab/RhythmGenerationTab/LevelGenerationDebugPanel';
import { LevelGenerationProgress } from '../ui/LevelGenerationProgress';
import { PitchDetectionPanel } from '../ui/PitchDetectionPanel';
import { MelodyContourPanel } from '../ui/MelodyContourPanel';
import { ButtonMappingPanel } from '../ui/ButtonMappingPanel';
import {
    useGeneratedRhythm,
    useGeneratedLevel,
    useAllDifficultyLevels,
    useLevelGenerationProgress,
    useBeatDetectionActions,
} from '../../store/beatDetectionStore';
// Note: useAudioPlayerStore and usePlaylistStore will be imported in future phases
// when visualization panels with audio sync are implemented
import { cn } from '../../utils/cn';
import { logger } from '../../utils/logger';

// ============================================================
// Types
// ============================================================

export interface PitchLevelTabProps {
    /** Callback when user wants to retry level generation */
    onRetry?: () => void;
    /** Callback when user wants to proceed to Ready step */
    onProceed?: () => void;
    /** Callback when user wants to switch to manual mode */
    onSwitchToManual?: () => void;
    /** Pitch influence weight setting from Step 1 (0-1) */
    pitchInfluenceWeight?: number;
    /** Voicing threshold setting from Step 1 (0-1) */
    voicingThreshold?: number;
    /** Additional CSS class names */
    className?: string;
}

// Section identifiers for accordion behavior
type SectionId = 'final' | 'pitch' | 'melody' | 'buttons' | null;

// ============================================================
// Sub-components
// ============================================================

/**
 * Error state UI with retry option.
 */
interface PitchLevelErrorProps {
    error: string;
    onRetry?: () => void;
    onSwitchToManual?: () => void;
}

function PitchLevelError({ error, onRetry, onSwitchToManual }: PitchLevelErrorProps) {
    return (
        <div className="pitch-level-error">
            <div className="pitch-level-error-icon">
                <AlertTriangle size={32} />
            </div>
            <h4 className="pitch-level-error-title">Level Generation Failed</h4>
            <p className="pitch-level-error-message">{error}</p>
            <div className="pitch-level-error-actions">
                {onRetry && (
                    <Button variant="primary" onClick={onRetry}>
                        <RefreshCw size={16} />
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
 * Success state UI showing generated level metadata.
 */
interface PitchLevelResultProps {
    onProceed?: () => void;
    /** Pitch influence weight setting from Step 1 (0-1) */
    pitchInfluenceWeight?: number;
    /** Voicing threshold setting from Step 1 (0-1) */
    voicingThreshold?: number;
}

function PitchLevelResult({ onProceed, pitchInfluenceWeight, voicingThreshold }: PitchLevelResultProps) {
    // Accordion state - default to 'final' expanded
    const [openSection, setOpenSection] = useState<SectionId>('final');

    const handleSectionToggle = (sectionId: Exclude<SectionId, null>) => {
        if (openSection === sectionId) {
            setOpenSection(null);
        } else {
            setOpenSection(sectionId);
        }
    };

    return (
        <div className="pitch-level-result">
            <div className="pitch-level-result-header">
                <CheckCircle className="pitch-level-result-icon" size={24} />
                <h4 className="pitch-level-result-title">Levels Generated Successfully!</h4>
            </div>

            {/* Visualization panels with accordion behavior */}
            <div className="pitch-level-visualizations">
                {/* Final Level Output - Default expanded */}
                <CollapsibleSection
                    title="Final Level Output"
                    subtitle="Generated beat map preview"
                    icon={<Gamepad2 size={18} />}
                    collapsed={openSection !== 'final'}
                    onCollapsedChange={() => handleSectionToggle('final')}
                >
                    <div className="pitch-level-panel-placeholder">
                        <LevelGenerationDebugPanel />
                        <p className="pitch-level-panel-note">
                            <strong>Note:</strong> This is a temporary debug panel.
                            Full visualization will be added in Phase 7 (Tasks 7.1-7.5).
                        </p>
                    </div>
                </CollapsibleSection>

                {/* Pitch Detection - Phase 3 */}
                <CollapsibleSection
                    title="Pitch Detection"
                    subtitle="Per-beat pitch analysis"
                    icon={<Music size={18} />}
                    collapsed={openSection !== 'pitch'}
                    onCollapsedChange={() => handleSectionToggle('pitch')}
                >
                    <PitchDetectionPanel />
                </CollapsibleSection>

                {/* Melody Contour - Phase 5 (Task 5.1) */}
                <CollapsibleSection
                    title="Melody Contour"
                    subtitle="Direction and interval analysis"
                    icon={<Activity size={18} />}
                    collapsed={openSection !== 'melody'}
                    onCollapsedChange={() => handleSectionToggle('melody')}
                >
                    <MelodyContourPanel />
                </CollapsibleSection>

                {/* Button Mapping - Phase 6 (Task 6.1) */}
                <CollapsibleSection
                    title="Button Mapping"
                    subtitle="DDR/Guitar Hero button assignments"
                    icon={<Gamepad2 size={18} />}
                    collapsed={openSection !== 'buttons'}
                    onCollapsedChange={() => handleSectionToggle('buttons')}
                >
                    <ButtonMappingPanel
                        pitchInfluenceWeight={pitchInfluenceWeight}
                        voicingThreshold={voicingThreshold}
                    />
                </CollapsibleSection>
            </div>

            {/* Proceed button */}
            {onProceed && (
                <div className="pitch-level-proceed">
                    <Button variant="primary" onClick={onProceed}>
                        Go to Practice
                        <ArrowRight size={16} />
                    </Button>
                </div>
            )}
        </div>
    );
}

/**
 * Placeholder state when waiting for prerequisites.
 */
function PitchLevelPlaceholder() {
    return (
        <div className="pitch-level-placeholder">
            <div className="pitch-level-placeholder-icon">
                <Music size={32} />
            </div>
            <h4 className="pitch-level-placeholder-title">Ready for Level Generation</h4>
            <p className="pitch-level-placeholder-text">
                Complete Step 2 (Rhythm Generation) to start pitch detection and level generation.
            </p>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * PitchLevelTab
 *
 * Main tab component for the Pitch & Level step in automatic mode (Step 3).
 * This component handles:
 * - Loading states with level generation progress
 * - Error states with retry option
 * - Success states with visualization panels
 * - Audio sync with RhythmGenerationTab
 */
export function PitchLevelTab({
    onRetry,
    onProceed,
    onSwitchToManual,
    pitchInfluenceWeight,
    voicingThreshold,
    className,
}: PitchLevelTabProps) {
    const generatedRhythm = useGeneratedRhythm();
    const generatedLevel = useGeneratedLevel();
    const allDifficulties = useAllDifficultyLevels();
    const progress = useLevelGenerationProgress();
    const actions = useBeatDetectionActions();

    // Note: Audio player state for timeline sync will be added in future phases
    // when visualization panels are implemented (see Phase 3-7)

    // Determine the current state
    const isGenerating = progress !== null && !progress.message.startsWith('Error:') && progress.progress < 100;
    const hasError = progress?.message.startsWith('Error:') ?? false;
    const hasLevel = generatedLevel !== null || allDifficulties !== null;

    // Handle retry
    const handleRetry = useCallback(() => {
        logger.info('LevelGeneration', 'Retrying level generation from PitchLevelTab');
        if (onRetry) {
            onRetry();
        }
    }, [onRetry]);

    // Handle switch to manual
    const handleSwitchToManual = useCallback(() => {
        if (onSwitchToManual) {
            onSwitchToManual();
            actions.setGenerationMode('manual');
        }
    }, [onSwitchToManual, actions]);

    // Render based on state
    const renderContent = () => {
        // No rhythm generated yet - show placeholder
        if (!generatedRhythm) {
            return <PitchLevelPlaceholder />;
        }

        // Loading state - show progress
        if (isGenerating && progress) {
            return (
                <LevelGenerationProgress
                    progress={progress}
                    showTiming={true}
                />
            );
        }

        // Error state
        if (hasError && progress) {
            const errorMessage = progress.message.replace('Error: ', '');
            return (
                <PitchLevelError
                    error={errorMessage}
                    onRetry={handleRetry}
                    onSwitchToManual={handleSwitchToManual}
                />
            );
        }

        // Success state - show result
        if (hasLevel) {
            return (
                <PitchLevelResult
                    onProceed={onProceed}
                    pitchInfluenceWeight={pitchInfluenceWeight}
                    voicingThreshold={voicingThreshold}
                />
            );
        }

        // Default - waiting for level generation to start
        return (
            <div className="pitch-level-pending">
                <div className="pitch-level-pending-icon">
                    <Activity size={24} />
                </div>
                <p className="pitch-level-pending-text">
                    Waiting for level generation to start...
                </p>
            </div>
        );
    };

    return (
        <Card variant="elevated" padding="lg" className={cn('pitch-level-tab', className)}>
            <div className="pitch-level-section">
                <h3 className="pitch-level-title">
                    Pitch & Level Generation{' '}
                    <Tooltip content="Pitch detection and button mapping for the generated rhythm" />
                </h3>

                {renderContent()}
            </div>
        </Card>
    );
}

export default PitchLevelTab;
