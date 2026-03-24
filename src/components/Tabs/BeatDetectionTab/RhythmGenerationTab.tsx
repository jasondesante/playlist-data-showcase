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

import { useState, useMemo, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle, Music, Zap, Layers, Grid3X3, GitCompare, Combine, GitBranch } from 'lucide-react';
import './RhythmGenerationTab.css';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { Tooltip } from '../../ui/Tooltip';
import { CollapsibleSection } from '../../Party/CollapsibleSection';
import { RhythmGenerationProgress } from '../../ui/BeatDetectionTab/RhythmGenerationTab/RhythmGenerationProgress';
import { TransientDetectionPanel } from '../../ui/BeatDetectionTab/RhythmGenerationTab/TransientDetectionPanel';
import { MultiBandVisualization } from '../../ui/BeatDetectionTab/RhythmGenerationTab/MultiBandVisualization';
import { QuantizationPanel } from '../../ui/BeatDetectionTab/RhythmGenerationTab/QuantizationPanel';
import { CompositeStreamPanel } from '../../ui/BeatDetectionTab/RhythmGenerationTab/CompositeStreamPanel';
import { DifficultyConversionPanel } from '../../ui/BeatDetectionTab/RhythmGenerationTab/DifficultyConversionPanel';
import { VariantComparisonView } from '../../ui/BeatDetectionTab/RhythmGenerationTab/VariantComparisonView';
import { PhraseDetectionPanel } from '../../ui/BeatDetectionTab/RhythmGenerationTab/PhraseDetectionPanel';
import { TimelineControls } from '../../ui/BeatDetectionTab/RhythmGenerationTab/TimelineControls';
import {
    useGeneratedRhythm,
    useRhythmGenerationProgress,
    useBeatDetectionActions,
} from '../../../store/beatDetectionStore';
import { useAudioPlayerStore } from '../../../store/audioPlayerStore';
import { usePlaylistStore } from '../../../store/playlistStore';
import type {
    GeneratedRhythm,
    RhythmicPhrase,
    HighlightedRegion,
    BandTransientConfigOverrides,
    StreamScorerConfig,
} from '../../../types/rhythmGeneration';
import { getPhraseHighlightColor } from '../../../types/rhythmGeneration';
import { cn } from '../../../utils/cn';

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
    /** Per-band transient detection configuration from Step 1 */
    transientConfig?: BandTransientConfigOverrides;
    /** Whether density validation was enabled during generation */
    enableDensityValidation?: boolean;
    /** Stream scoring configuration (factor weights and band bias) from Step 1 */
    scoringConfig?: Partial<StreamScorerConfig>;
    /** Callback when user wants to switch to manual mode */
    onSwitchToManual?: () => void;
    /** Callback when user wants to retry generation */
    onRetry?: () => void;
    /** Callback when user wants to re-generate with a new intensity threshold */
    onRegenerateWithThreshold?: (threshold: number) => void;
    /** Callback when generation is complete and user wants to proceed */
    onProceed?: () => void;
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Sub-components
// ============================================================

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
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Total audio duration in seconds */
    duration?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Callback to toggle play/pause */
    onPlayPause?: () => void;
    /** The intensity threshold that was used during generation */
    originalIntensityThreshold?: number;
    /** Per-band transient detection config that was used during generation */
    transientConfig?: BandTransientConfigOverrides;
    /** Callback to re-run generation with a new threshold */
    onRegenerateWithThreshold?: (threshold: number) => void;
    /** Whether regeneration is in progress */
    isRegenerating?: boolean;
    /** Whether density validation was enabled during generation */
    enableDensityValidation?: boolean;
    /** Stream scoring configuration (factor weights and band bias) that was used during generation */
    scoringConfig?: Partial<StreamScorerConfig>;
}

// Section identifiers for accordion behavior
type SectionId = 'transients' | 'multiband' | 'quantization' | 'composite' | 'conversion' | 'comparison' | 'phrases' | null;

function RhythmGenerationResult({
    rhythm,
    onProceed,
    currentTime = 0,
    duration = 0,
    isPlaying = false,
    onSeek,
    onPlayPause,
    originalIntensityThreshold = 0,
    transientConfig,
    onRegenerateWithThreshold,
    isRegenerating = false,
    enableDensityValidation = false,
    scoringConfig,
}: RhythmGenerationResultProps) {
    const { metadata } = rhythm;

    // ========================================
    // Accordion State - Only one section open at a time
    // ========================================

    const [openSection, setOpenSection] = useState<SectionId>('transients');

    // Refs for each section to enable scroll-into-view
    const sectionRefs = useRef<Record<Exclude<SectionId, null>, HTMLDivElement | null>>({
        transients: null,
        multiband: null,
        quantization: null,
        composite: null,
        conversion: null,
        comparison: null,
        phrases: null,
    });

    const handleSectionToggle = (sectionId: Exclude<SectionId, null>) => {
        const prevSection = openSection;
        if (prevSection === sectionId) {
            // Clicking the same section that's open - close it
            setOpenSection(null);
        } else {
            // Clicking a different section - open it
            setOpenSection(sectionId);
            // Scroll the newly opened section into view after a brief delay for the animation
            setTimeout(() => {
                sectionRefs.current[sectionId]?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                });
            }, 100);
        }
    };

    // ========================================
    // Phrase Selection State for Highlighting
    // ========================================

    const [selectedPhrase, setSelectedPhrase] = useState<RhythmicPhrase | null>(null);

    // Compute highlighted regions from selected phrase
    const highlightedRegions = useMemo((): HighlightedRegion[] => {
        if (!selectedPhrase) return [];

        // Find the phrase index for color generation
        const phraseIndex = rhythm.analysis.phraseAnalysis.phrases.findIndex(
            p => p.id === selectedPhrase.id
        );

        const color = getPhraseHighlightColor(phraseIndex >= 0 ? phraseIndex : 0);

        // Convert phrase occurrences to highlighted regions
        return selectedPhrase.occurrences.map((occurrence, idx) => ({
            id: `${selectedPhrase.id}-occurrence-${idx}`,
            startTimestamp: occurrence.startTimestamp,
            endTimestamp: occurrence.endTimestamp,
            color,
            label: `Phrase: ${selectedPhrase.sizeInBeats} beats (${idx + 1}/${selectedPhrase.occurrences.length})`,
        }));
    }, [selectedPhrase, rhythm.analysis.phraseAnalysis.phrases]);

    // Handle phrase selection from PhraseDetectionPanel
    const handlePhraseSelect = (phrase: RhythmicPhrase | null) => {
        setSelectedPhrase(phrase);
    };

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
                    <span className="rhythm-generation-stat-label">Total Beats</span>
                    <span className="rhythm-generation-stat-value">
                        {metadata.totalBeats}
                    </span>
                </div>
            </div>

            {/* Timeline Controls - Part of Task 9.3 */}
            {/* Note: Zoom controls moved to individual timeline sections for better UX */}
            {onPlayPause && onSeek && (
                <div className="rhythm-generation-timeline-controls">
                    <TimelineControls
                        currentTime={currentTime}
                        duration={duration}
                        isPlaying={isPlaying}
                        onPlayPause={onPlayPause}
                        onSeek={onSeek}
                        showSkipButtons={true}
                        skipInterval={10}
                    />
                </div>
            )}

            {/* Visualization panels with accordion behavior - only one open at a time */}
            <div className="rhythm-generation-visualizations">
                <div ref={(el) => { sectionRefs.current.transients = el; }}>
                    <CollapsibleSection
                        title="Transient Detection"
                        subtitle="Raw transient analysis results"
                        icon={<Zap size={18} />}
                        badge={metadata.transientsDetected}
                        collapsed={openSection !== 'transients'}
                        onCollapsedChange={() => handleSectionToggle('transients')}
                    >
                        <TransientDetectionPanel
                            rhythm={rhythm}
                            currentTime={currentTime}
                            onSeek={onSeek}
                            originalIntensityThreshold={originalIntensityThreshold}
                            transientConfig={transientConfig}
                            onRegenerateWithThreshold={onRegenerateWithThreshold}
                            isRegenerating={isRegenerating}
                        />
                    </CollapsibleSection>
                </div>

                <div ref={(el) => { sectionRefs.current.multiband = el; }}>
                    <CollapsibleSection
                        title="Multi-Band Analysis"
                        subtitle="Frequency band breakdown"
                        icon={<Layers size={18} />}
                        collapsed={openSection !== 'multiband'}
                        onCollapsedChange={() => handleSectionToggle('multiband')}
                    >
                        <MultiBandVisualization
                            rhythm={rhythm}
                            currentTime={currentTime}
                            duration={duration}
                            isPlaying={isPlaying}
                            onSeek={onSeek}
                        />
                    </CollapsibleSection>
                </div>

                <div ref={(el) => { sectionRefs.current.quantization = el; }}>
                    <CollapsibleSection
                        title="Quantization"
                        subtitle="Beat grid quantization results"
                        icon={<Grid3X3 size={18} />}
                        collapsed={openSection !== 'quantization'}
                        onCollapsedChange={() => handleSectionToggle('quantization')}
                    >
                        <QuantizationPanel
                            rhythm={rhythm}
                            currentTime={currentTime}
                            duration={duration}
                            isPlaying={isPlaying}
                            onSeek={onSeek}
                            highlightedRegions={highlightedRegions}
                            enableDensityValidation={enableDensityValidation}
                        />
                    </CollapsibleSection>
                </div>

                <div ref={(el) => { sectionRefs.current.composite = el; }}>
                    <CollapsibleSection
                        title="Composite Stream"
                        subtitle="Combined band streams with section analysis"
                        icon={<Combine size={18} />}
                        badge={rhythm.composite.beats.length}
                        collapsed={openSection !== 'composite'}
                        onCollapsedChange={() => handleSectionToggle('composite')}
                    >
                        <CompositeStreamPanel
                            rhythm={rhythm}
                            currentTime={currentTime}
                            duration={duration}
                            isPlaying={isPlaying}
                            onSeek={onSeek}
                            scoringConfig={scoringConfig}
                        />
                    </CollapsibleSection>
                </div>

                <div ref={(el) => { sectionRefs.current.conversion = el; }}>
                    <CollapsibleSection
                        title="Difficulty Conversion"
                        subtitle="How composite becomes Easy/Medium/Hard"
                        icon={<GitBranch size={18} />}
                        collapsed={openSection !== 'conversion'}
                        onCollapsedChange={() => handleSectionToggle('conversion')}
                    >
                        <DifficultyConversionPanel
                            rhythm={rhythm}
                            currentTime={currentTime}
                            duration={duration}
                            isPlaying={isPlaying}
                            onSeek={onSeek}
                        />
                    </CollapsibleSection>
                </div>


                <div ref={(el) => { sectionRefs.current.comparison = el; }}>
                    <CollapsibleSection
                        title="Difficulty Comparison"
                        subtitle="Stacked view with shared zoom/scroll"
                        icon={<GitCompare size={18} />}
                        collapsed={openSection !== 'comparison'}
                        onCollapsedChange={() => handleSectionToggle('comparison')}
                    >
                        <VariantComparisonView
                            rhythm={rhythm}
                            currentTime={currentTime}
                            duration={duration}
                            isPlaying={isPlaying}
                            onSeek={onSeek}
                        />
                    </CollapsibleSection>
                </div>

                <div ref={(el) => { sectionRefs.current.phrases = el; }}>
                    <CollapsibleSection
                        title="Phrase Detection"
                        subtitle="Detected rhythmic patterns"
                        icon={<Music size={18} />}
                        badge={metadata.phrasesDetected}
                        collapsed={openSection !== 'phrases'}
                        onCollapsedChange={() => handleSectionToggle('phrases')}
                    >
                        <PhraseDetectionPanel
                            rhythm={rhythm}
                            currentTime={currentTime}
                            isPlaying={isPlaying}
                            onSeek={onSeek}
                            onPhraseSelect={handlePhraseSelect}
                            selectedPhrase={selectedPhrase}
                        />
                    </CollapsibleSection>
                </div>
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
    intensityThreshold = 0.2,
    transientConfig,
    enableDensityValidation = false,
    scoringConfig,
    onSwitchToManual,
    onRetry,
    onRegenerateWithThreshold,
    onProceed,
    className,
}: RhythmGenerationTabProps) {
    const generatedRhythm = useGeneratedRhythm();
    const progress = useRhythmGenerationProgress();
    const actions = useBeatDetectionActions();

    // Get audio player state for timeline sync
    const currentTime = useAudioPlayerStore((state) => state.currentTime);
    const duration = useAudioPlayerStore((state) => state.duration);
    const playbackState = useAudioPlayerStore((state) => state.playbackState);
    const seek = useAudioPlayerStore((state) => state.seek);
    const pause = useAudioPlayerStore((state) => state.pause);
    const resume = useAudioPlayerStore((state) => state.resume);
    const play = useAudioPlayerStore((state) => state.play);
    const currentUrl = useAudioPlayerStore((state) => state.currentUrl);
    const isPlaying = playbackState === 'playing';

    // Get selected track from playlist store (for initiating playback when audio not loaded)
    const { selectedTrack } = usePlaylistStore();

    // Compute duration with fallback to track duration when audio hasn't loaded yet
    // This matches the pattern used in AppHeader's mini player
    const effectiveDuration = Number.isFinite(duration) && duration > 0
        ? duration
        : (selectedTrack?.duration || 0);

    // Determine the current state
    // Note: isGenerating is false when progress reaches 100% (completion) to allow transition to results view
    const isGenerating = progress !== null && !progress.message.startsWith('Error:') && progress.progress < 100;
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

    // Handle seek from visualization panels
    // Smart seek: loads audio first if not loaded, then seeks to target position
    const handleSeek = useCallback((time: number) => {
        seek(time, currentUrl || selectedTrack?.audio_url);
    }, [currentUrl, selectedTrack, seek]);

    // Handle play/pause toggle (Part of Task 9.3)
    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else if (currentUrl) {
            // Audio already loaded - resume playback
            resume();
        } else if (selectedTrack?.audio_url) {
            // No audio loaded yet, but we have a selected track - start playback
            play(selectedTrack.audio_url);
        }
    }, [isPlaying, pause, resume, currentUrl, selectedTrack, play]);

    // Handle re-generate with new threshold from TransientDetectionPanel
    const handleRegenerateWithThreshold = useCallback((newThreshold: number) => {
        if (onRegenerateWithThreshold) {
            onRegenerateWithThreshold(newThreshold);
        }
    }, [onRegenerateWithThreshold]);    // Render based on state
    const renderContent = () => {
        // Loading state - show progress
        if (isGenerating && progress) {
            return <RhythmGenerationProgress progress={progress} />;
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

        // Success state - show result with audio sync
        if (hasRhythm && generatedRhythm) {
            return (
                <RhythmGenerationResult
                    rhythm={generatedRhythm}
                    onProceed={onProceed}
                    currentTime={currentTime}
                    duration={effectiveDuration}
                    isPlaying={isPlaying}
                    onSeek={handleSeek}
                    onPlayPause={handlePlayPause}
                    originalIntensityThreshold={intensityThreshold}
                    transientConfig={transientConfig}
                    onRegenerateWithThreshold={handleRegenerateWithThreshold}
                    isRegenerating={isGenerating}
                    enableDensityValidation={enableDensityValidation}
                    scoringConfig={scoringConfig}
                />
            );
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
