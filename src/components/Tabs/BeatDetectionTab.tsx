import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import { Music, Sparkles, Drum, Download, ArrowRight, SkipForward } from 'lucide-react';
import './BeatDetectionTab.css';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useBeatDetection } from '../../hooks/useBeatDetection';
import { StatusIndicator } from '../ui/StatusIndicator';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { BeatMapSummarySkeleton } from '../ui/Skeleton';
import { ArweaveImage } from '../shared/ArweaveImage';
import { BeatDetectionSettings } from '../ui/BeatDetectionSettings';
import { SubdivisionSettings } from '../ui/SubdivisionSettings';
import { ChartEditor } from '../ui/ChartEditor';
import { ChartEditorToolbar } from '../ui/ChartEditorToolbar';
import { BeatMapSummary } from '../ui/BeatMapSummary';
import { BeatPracticeView } from '../ui/BeatPracticeView';
import { StepCompletionPrompt } from '../ui/StepCompletionPrompt';
import { useBeatDetectionStore, useInterpolatedBeatMap, useSubdividedBeatMap, useSubdivisionConfig, useChartStyle, useChartStatistics, useCurrentStep, useStepCompletion, useStepAvailability, useStepNavigationDirection } from '../../store/beatDetectionStore';
import { StepNav, type Step } from '../ui/StepNav';
import { logger } from '../../utils/logger';

/**
 * BeatDetectionTab Component
 *
 * Provides beat detection and rhythm analysis functionality:
 * 1. Requires a selected track from the Playlist tab
 * 2. Generates beat maps using the BeatDetection engine
 * 3. Displays beat map summary (BPM, phase information, beat count)
 * 4. Provides subdivision settings for beat refinement
 * 5. Includes chart editor for beat visualization and editing
 * 6. Practice mode for playing along with detected beats
 * 7. Export beat maps for use in other applications
 */
export function BeatDetectionTab() {
    const { selectedTrack } = usePlaylistStore();
    const { duration } = useAudioPlayerStore();

    // Beat detection hook for beat map generation
    const {
        generateBeatMap,
        isGenerating: isBeatGenerating,
        progress: beatProgress,
        beatMap,
        error: beatError,
    } = useBeatDetection();

    // Beat detection store for practice mode
    const startPracticeMode = useBeatDetectionStore((state) => state.actions.startPracticeMode);
    const stopPracticeMode = useBeatDetectionStore((state) => state.actions.stopPracticeMode);
    const clearStorageError = useBeatDetectionStore((state) => state.actions.clearStorageError);
    const clearOldestCachedBeatMaps = useBeatDetectionStore((state) => state.actions.clearOldestCachedBeatMaps);
    const loadCachedBeatMap = useBeatDetectionStore((state) => state.actions.loadCachedBeatMap);
    const clearBeatMap = useBeatDetectionStore((state) => state.actions.clearBeatMap);
    const setCurrentStep = useBeatDetectionStore((state) => state.actions.setCurrentStep);
    const practiceModeActive = useBeatDetectionStore((state) => state.practiceModeActive);
    const storageError = useBeatDetectionStore((state) => state.storageError);
    const interpolatedBeatMap = useInterpolatedBeatMap();
    const subdividedBeatMap = useSubdividedBeatMap();
    const subdivisionConfig = useSubdivisionConfig();
    const chartStyle = useChartStyle();
    const chartStatistics = useChartStatistics();

    // Step navigation state
    const currentStep = useCurrentStep();
    const stepCompletion = useStepCompletion();
    const availableSteps = useStepAvailability();
    const navigationDirection = useStepNavigationDirection();

    // Track if we were generating to detect analysis completion
    const wasGeneratingRef = useRef(isBeatGenerating);

    // Step configuration for StepNav
    const steps: Step[] = [
        { id: 1, label: 'Analyze' },
        { id: 2, label: 'Subdivide' },
        { id: 3, label: 'Chart' },
        { id: 4, label: 'Ready', dynamicLabel: { available: 'Ready', disabled: 'Not Ready' } },
    ];

    // Compute completed steps set
    const completedSteps = useMemo(() => {
        const completed = new Set<number>();
        if (stepCompletion.step1) completed.add(1);
        if (stepCompletion.step2) completed.add(2);
        if (stepCompletion.step3) completed.add(3);
        return completed;
    }, [stepCompletion]);

    // Handle step click
    const handleStepClick = useCallback((step: number) => {
        setCurrentStep(step as 1 | 2 | 3 | 4);
    }, [setCurrentStep]);

    // Compute animation class based on navigation direction
    const animationClass = useMemo(() => {
        switch (navigationDirection) {
            case 'forward':
                return 'step-content-enter-forward';
            case 'backward':
                return 'step-content-enter-backward';
            default:
                return 'step-content-fade-in';
        }
    }, [navigationDirection]);

    /**
     * Export interpolated beat map as JSON for debugging/analysis
     * Includes subdivision data when a SubdividedBeatMap has been generated.
     * Includes chart data (requiredKey on beats, chart metadata) when keys are assigned.
     */
    const handleExportBeatMap = useCallback(() => {
        if (!interpolatedBeatMap || !beatMap) return;

        const exportData = {
            exportTimestamp: new Date().toISOString(),
            beatMapDuration: beatMap.duration,
            quarterNoteBpm: interpolatedBeatMap.quarterNoteBpm,
            quarterNoteConfidence: interpolatedBeatMap.quarterNoteConfidence,
            detectedBeats: interpolatedBeatMap.detectedBeats.map(b => ({
                timestamp: b.timestamp,
                isDownbeat: b.isDownbeat,
                confidence: b.confidence,
                beatInMeasure: b.beatInMeasure,
                measureNumber: b.measureNumber,
                intensity: b.intensity,
            })),
            mergedBeats: interpolatedBeatMap.mergedBeats.map(b => ({
                timestamp: b.timestamp,
                source: b.source,
                confidence: b.confidence,
                isDownbeat: b.isDownbeat,
                beatInMeasure: b.beatInMeasure,
                measureNumber: b.measureNumber,
                intensity: b.intensity,
                distanceToAnchor: b.distanceToAnchor,
                nearestAnchorTimestamp: b.nearestAnchorTimestamp,
            })),
            metadata: {
                interpolatedBeatCount: interpolatedBeatMap.interpolationMetadata.interpolatedBeatCount,
                detectedBeatCount: interpolatedBeatMap.interpolationMetadata.detectedBeatCount,
                totalBeatCount: interpolatedBeatMap.interpolationMetadata.totalBeatCount,
                interpolationRatio: interpolatedBeatMap.interpolationMetadata.interpolationRatio,
                avgInterpolatedConfidence: interpolatedBeatMap.interpolationMetadata.avgInterpolatedConfidence,
                tempoDriftRatio: interpolatedBeatMap.interpolationMetadata.tempoDriftRatio,
                quarterNoteDetection: {
                    intervalSeconds: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.intervalSeconds,
                    bpm: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.bpm,
                    confidence: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.confidence,
                    method: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.method,
                    denseSectionCount: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.denseSectionCount,
                    denseSectionBeats: interpolatedBeatMap.interpolationMetadata.quarterNoteDetection.denseSectionBeats,
                },
                gapAnalysis: {
                    totalGaps: interpolatedBeatMap.interpolationMetadata.gapAnalysis.totalGaps,
                    halfNoteGaps: interpolatedBeatMap.interpolationMetadata.gapAnalysis.halfNoteGaps,
                    anomalies: interpolatedBeatMap.interpolationMetadata.gapAnalysis.anomalies,
                    avgGapSize: interpolatedBeatMap.interpolationMetadata.gapAnalysis.avgGapSize,
                    gridAlignmentScore: interpolatedBeatMap.interpolationMetadata.gapAnalysis.gridAlignmentScore,
                },
            },
            // Subdivision configuration (always included)
            subdivision: {
                config: subdivisionConfig,
                // Include SubdividedBeatMap if generated
                ...(subdividedBeatMap ? {
                    beatMap: {
                        audioId: subdividedBeatMap.audioId,
                        duration: subdividedBeatMap.duration,
                        beats: subdividedBeatMap.beats.map(b => ({
                            timestamp: b.timestamp,
                            beatInMeasure: b.beatInMeasure,
                            isDownbeat: b.isDownbeat,
                            measureNumber: b.measureNumber,
                            intensity: b.intensity,
                            confidence: b.confidence,
                            isDetected: b.isDetected,
                            originalBeatIndex: b.originalBeatIndex,
                            subdivisionType: b.subdivisionType,
                            // Include requiredKey if assigned (for chart/rhythm game data)
                            ...(b.requiredKey !== undefined && { requiredKey: b.requiredKey }),
                        })),
                        detectedBeatIndices: subdividedBeatMap.detectedBeatIndices,
                    },
                    metadata: {
                        originalBeatCount: subdividedBeatMap.subdivisionMetadata.originalBeatCount,
                        subdividedBeatCount: subdividedBeatMap.subdivisionMetadata.subdividedBeatCount,
                        averageDensityMultiplier: subdividedBeatMap.subdivisionMetadata.averageDensityMultiplier,
                        explicitBeatCount: subdividedBeatMap.subdivisionMetadata.explicitBeatCount,
                        subdivisionsUsed: subdividedBeatMap.subdivisionMetadata.subdivisionsUsed,
                        hasMultipleTempos: subdividedBeatMap.subdivisionMetadata.hasMultipleTempos,
                        maxDensity: subdividedBeatMap.subdivisionMetadata.maxDensity,
                    },
                } : null),
            },
            // Chart metadata (when keys are assigned)
            ...(chartStatistics.keyCount > 0 && {
                chart: {
                    style: chartStyle,
                    keyCount: chartStatistics.keyCount,
                    usedKeys: chartStatistics.usedKeys,
                },
            }),
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        link.download = `interpolated-beatmap-${timestamp}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [interpolatedBeatMap, beatMap, subdivisionConfig, subdividedBeatMap, chartStyle, chartStatistics]);

    /**
     * Load cached beat map when the selected track changes.
     * This ensures that previously analyzed tracks show their cached beat map
     * immediately when selected, without requiring the user to click "Analyze Beats" again.
     * Always resets to Step 1 on track change to provide a fresh starting point.
     */
    useEffect(() => {
        // Only run when in beat mode or when track changes
        if (!selectedTrack) {
            return;
        }

        const audioId = selectedTrack.id || selectedTrack.audio_url;

        // Try to load cached beat map for this track
        const cached = loadCachedBeatMap(audioId);

        if (cached) {
            logger.info('BeatDetection', 'Loaded cached beat map for track', { audioId });
            // Reset to Step 1 even when loading cached beat map
            // This ensures users start from the beginning when switching tracks
            setCurrentStep(1);
        } else {
            // Clear the current beat map if no cached version exists for this track
            // This prevents showing stale beat map data from a previous track
            // Note: clearBeatMap() also resets currentStep to 1
            clearBeatMap();
        }
    }, [selectedTrack?.id, selectedTrack?.audio_url, loadCachedBeatMap, clearBeatMap, setCurrentStep]);

    /**
     * Auto-advance to Step 2 after analysis completes.
     * Only triggers when transitioning from generating (true) to not generating (false)
     * AND a beatMap exists (indicating successful analysis).
     * Does not trigger when loading from cache or returning to Step 1.
     */
    useEffect(() => {
        // Check if we just finished generating
        if (wasGeneratingRef.current && !isBeatGenerating && beatMap) {
            // Auto-advance to Step 2 (Subdivide) after successful analysis
            setCurrentStep(2);
        }
        // Update the ref for the next render
        wasGeneratingRef.current = isBeatGenerating;
    }, [isBeatGenerating, beatMap, setCurrentStep]);

    /**
     * Map beat generation phases to human-readable labels
     */
    const getPhaseLabel = (phase: string): string => {
        switch (phase) {
            case 'loading':
                return 'Loading audio...';
            case 'preprocessing':
                return 'Preprocessing...';
            case 'ose_calculation':
                return 'Computing onset envelope...';
            case 'tempo_estimation':
                return 'Detecting tempo...';
            case 'beat_tracking':
                return 'Tracking beats...';
            case 'measure_labeling':
                return 'Applying measure labels...';
            case 'finalizing':
                return 'Finalizing...';
            case 'complete':
                return 'Complete!';
            case 'error':
                return 'Error';
            default:
                return 'Processing...';
        }
    };

    /**
     * Handle beat map generation for beat detection mode.
     * Uses the beat detection store to generate a beat map from the audio.
     */
    const handleBeatAnalysis = useCallback(async () => {
        if (!selectedTrack?.audio_url) return;

        // Use track ID or URL as audio ID for caching
        const audioId = selectedTrack.id || selectedTrack.audio_url;

        // Force regenerate if we already have a beat map (re-analyze)
        const forceRegenerate = !!beatMap;

        await generateBeatMap(selectedTrack.audio_url, audioId, undefined, forceRegenerate);
    }, [selectedTrack, generateBeatMap, beatMap]);

    /**
     * Handle starting practice mode after beat map generation.
     */
    const handleStartPracticeMode = useCallback(() => {
        startPracticeMode();
    }, [startPracticeMode]);

    /**
     * Handle exiting practice mode.
     * Intelligently returns to the appropriate step based on current state:
     * - If keys are assigned (chartStatistics.keyCount > 0) → Step 3 (Chart)
     * - Else if subdivisions exist (subdividedBeatMap) → Step 2 (Subdivide)
     * - Else → Step 4 (Practice/Export)
     */
    const handleExitPracticeMode = useCallback(() => {
        stopPracticeMode();

        // Intelligently return to appropriate step
        if (chartStatistics.keyCount > 0) {
            setCurrentStep(3); // Step 3 (Chart)
        } else if (subdividedBeatMap) {
            setCurrentStep(2); // Step 2 (Subdivide)
        } else {
            setCurrentStep(4); // Step 4 (Practice/Export)
        }
    }, [stopPracticeMode, setCurrentStep, chartStatistics, subdividedBeatMap]);

    // Determine status indicator based on current state
    const getAnalysisStatus = (): 'healthy' | 'degraded' | 'error' => {
        if (beatMap) return 'healthy';
        if (isBeatGenerating) return 'degraded';
        if (beatError) return 'error';
        if (selectedTrack) return 'degraded';
        return 'error';
    };

    const getStatusLabel = (): string => {
        if (beatMap) return 'Beat Map Ready';
        if (isBeatGenerating) return 'Analyzing...';
        if (beatError) return 'Error';
        if (selectedTrack) return 'Ready';
        return 'No Track';
    };

    /**
     * Render content for the active step only.
     * Each step's content is wrapped with animation classes for smooth transitions.
     */
    const renderStepContent = useCallback(() => {
        // Don't render step content if no track is selected or during practice mode
        if (!selectedTrack || practiceModeActive) {
            return null;
        }

        // Common wrapper with animation class
        const wrapContent = (content: React.ReactNode) => (
            <div className={`step-content ${animationClass}`}>
                {content}
            </div>
        );

        switch (currentStep) {
            case 1:
                // Step 1: Analyze - Primary Card with song info, settings, analyze button
                return wrapContent(
                    <Card variant="elevated" padding="lg" className="audio-analysis-primary-card">
                        <div className="audio-analysis-primary-layout">
                            {/* Song Display Section */}
                            <div className="audio-analysis-song-display">
                                <div className="audio-analysis-song-artwork">
                                    {selectedTrack.image_url ? (
                                        <ArweaveImage
                                            src={selectedTrack.image_url}
                                            alt={selectedTrack.title}
                                            className="audio-analysis-artwork-image"
                                            fallback={<Music className="audio-analysis-ready-fallback" />}
                                        />
                                    ) : (
                                        <Music className="audio-analysis-ready-fallback" />
                                    )}
                                    {isBeatGenerating && (
                                        <div className="audio-analysis-artwork-overlay">
                                            <Sparkles className="audio-analysis-sparkle-icon" />
                                        </div>
                                    )}
                                </div>
                                <div className="audio-analysis-song-meta">
                                    <div className="audio-analysis-song-title-large">{selectedTrack.title}</div>
                                    <div className="audio-analysis-song-artist-large">{selectedTrack.artist}</div>
                                    <div className="audio-analysis-song-status-badge">
                                        <StatusIndicator status={getAnalysisStatus()} label={getStatusLabel()} />
                                    </div>
                                </div>
                            </div>

                            {/* Beat Detection Settings */}
                            <div className="audio-analysis-mode-card">
                                <BeatDetectionSettings disabled={isBeatGenerating} />
                                {!beatMap && !isBeatGenerating && duration > 0 && duration < 5 && (
                                    <div className="audio-analysis-short-track-warning">
                                        <span className="audio-analysis-short-track-warning-icon">⚠️</span>
                                        <span className="audio-analysis-short-track-warning-text">
                                            This track is short ({duration.toFixed(1)}s). Beat detection works best with tracks longer than 5 seconds.
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Action Section */}
                            <div className="audio-analysis-action-integration">
                                <Button
                                    onClick={handleBeatAnalysis}
                                    disabled={isBeatGenerating}
                                    isLoading={isBeatGenerating}
                                    variant="primary"
                                    size="lg"
                                    className="audio-analysis-primary-action-button"
                                >
                                    {isBeatGenerating && beatProgress
                                        ? `${beatProgress.progress}% - ${getPhaseLabel(beatProgress.phase)}`
                                        : beatMap ? 'Re-Analyze' : 'Analyze Beats'}
                                </Button>
                                {beatError && (
                                    <div className="audio-analysis-error-message">
                                        {beatError}
                                    </div>
                                )}
                                {storageError && (
                                    <div className="audio-analysis-storage-warning">
                                        <span className="audio-analysis-storage-warning-text">{storageError}</span>
                                        <div className="audio-analysis-storage-warning-actions">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    clearOldestCachedBeatMaps(3);
                                                    clearStorageError();
                                                }}
                                            >
                                                Clear Old Caches
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={clearStorageError}
                                            >
                                                Dismiss
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Post-completion prompt for Step 1 */}
                        <StepCompletionPrompt
                            message="Analysis complete!"
                            visible={stepCompletion.step1 && !isBeatGenerating}
                            actions={[
                                {
                                    label: 'Go to Subdivide',
                                    onClick: () => setCurrentStep(2),
                                    variant: 'primary',
                                    icon: ArrowRight,
                                },
                                {
                                    label: 'Skip to practice/export',
                                    onClick: () => setCurrentStep(4),
                                    variant: 'secondary',
                                    icon: SkipForward,
                                },
                            ]}
                        />
                    </Card>
                );

            case 2:
                // Step 2: Subdivide - Subdivision settings card
                if (!beatMap || isBeatGenerating) {
                    return wrapContent(
                        <Card variant="elevated" padding="lg" className="audio-analysis-subdivision-timeline-card">
                            <div className="audio-analysis-step-placeholder">
                                <div className="audio-analysis-step-placeholder-icon">🔄</div>
                                <h4 className="audio-analysis-step-placeholder-title">Beat Map Required</h4>
                                <p className="audio-analysis-step-placeholder-text">
                                    Complete Step 1 (Analyze) to access subdivision settings.
                                </p>
                            </div>
                        </Card>
                    );
                }
                return wrapContent(
                    <Card variant="elevated" padding="lg" className="audio-analysis-subdivision-timeline-card">
                        <div className="audio-analysis-subdivision-section">
                            <h3 className="audio-analysis-step-title">Subdivisions</h3>
                            <SubdivisionSettings disabled={isBeatGenerating} />
                        </div>

                        {/* Post-completion prompt for Step 2 */}
                        <StepCompletionPrompt
                            message="Subdivisions configured!"
                            visible={stepCompletion.step2 && !isBeatGenerating}
                            actions={[
                                {
                                    label: 'Go to Chart',
                                    onClick: () => setCurrentStep(3),
                                    variant: 'primary',
                                    icon: ArrowRight,
                                },
                                {
                                    label: 'Skip to practice',
                                    onClick: () => setCurrentStep(4),
                                    variant: 'secondary',
                                    icon: SkipForward,
                                },
                            ]}
                        />
                    </Card>
                );

            case 3:
                // Step 3: Chart Editor - Key assignment for rhythm game
                // Note: Step 3 is disabled in StepNav when subdividedBeatMap is null,
                // so this content is only rendered when the step is available.
                return wrapContent(
                    <Card variant="elevated" padding="lg" className="audio-analysis-chart-editor-card">
                        <div className="audio-analysis-chart-editor-section">
                            <h3 className="audio-analysis-step-title">Chart Editor</h3>
                            <ChartEditorToolbar
                                disabled={isBeatGenerating}
                                audioTitle={selectedTrack?.title}
                            />
                            <ChartEditor disabled={isBeatGenerating} />
                        </div>

                        {/* Post-completion prompt for Step 3 */}
                        <StepCompletionPrompt
                            message={`Keys assigned! ${chartStatistics.keyCount} keys configured.`}
                            visible={stepCompletion.step3 && !isBeatGenerating}
                            actions={[
                                {
                                    label: 'Practice or Export',
                                    onClick: () => setCurrentStep(4),
                                    variant: 'primary',
                                    icon: ArrowRight,
                                },
                            ]}
                        />
                    </Card>
                );

            case 4:
                // Step 4: Ready/Practice - Beat map summary, practice mode, export
                if (!beatMap) {
                    return wrapContent(
                        <Card variant="elevated" padding="lg" className="beat-detection-results-card">
                            <div className="audio-analysis-step-placeholder">
                                <div className="audio-analysis-step-placeholder-icon">🎯</div>
                                <h4 className="audio-analysis-step-placeholder-title">Not Ready</h4>
                                <p className="audio-analysis-step-placeholder-text">
                                    Complete Step 1 (Analyze) to access practice mode and export options.
                                </p>
                            </div>
                        </Card>
                    );
                }
                return wrapContent(
                    <Card variant="elevated" padding="lg" className="beat-detection-results-card">
                        {isBeatGenerating ? (
                            <BeatMapSummarySkeleton />
                        ) : (
                            <>
                                <BeatMapSummary
                                    beatMap={beatMap}
                                    onStartPractice={handleStartPracticeMode}
                                />
                                {interpolatedBeatMap && (
                                    <div className="audio-analysis-export-section">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleExportBeatMap}
                                            leftIcon={Download}
                                            className="audio-analysis-export-btn"
                                        >
                                            Export Beat Map
                                        </Button>
                                        <span className="audio-analysis-export-hint">
                                            {subdividedBeatMap
                                                ? 'Download beat map with subdivision data as JSON'
                                                : 'Download interpolated beat map data as JSON'}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </Card>
                );

            default:
                return null;
        }
    }, [
        selectedTrack,
        practiceModeActive,
        currentStep,
        animationClass,
        beatMap,
        isBeatGenerating,
        subdividedBeatMap,
        interpolatedBeatMap,
        beatProgress,
        beatError,
        storageError,
        duration,
        selectedTrack?.title,
        handleBeatAnalysis,
        handleStartPracticeMode,
        handleExportBeatMap,
        clearOldestCachedBeatMaps,
        clearStorageError,
        getAnalysisStatus,
        getStatusLabel,
        getPhaseLabel,
        stepCompletion,
        chartStatistics,
    ]);

    return (
        <div className="audio-analysis-container">
            {/* Header with Icon Badge, Title, Selected Song, and Status */}
            <div className="audio-analysis-header">
                <div className="audio-analysis-header-left">
                    <div className="audio-analysis-header-title-row">
                        <div className="audio-analysis-header-icon-wrapper">
                            <Drum className="audio-analysis-header-icon" />
                        </div>
                        <div className="audio-analysis-header-titles">
                            <h2 className="audio-analysis-header-title">Beat Detection</h2>
                            <div className="audio-analysis-header-subtitle">Analyze rhythm and generate beat maps</div>
                        </div>
                    </div>
                </div>
                <div className="audio-analysis-header-right">
                    <StatusIndicator status={getAnalysisStatus()} label={getStatusLabel()} />
                </div>
            </div>

            {/* Step Navigation - Hidden during practice mode */}
            {selectedTrack && !practiceModeActive && (
                <StepNav
                    steps={steps}
                    currentStep={currentStep}
                    completedSteps={completedSteps}
                    availableSteps={availableSteps}
                    onStepClick={handleStepClick}
                    className="beat-detection-step-nav"
                />
            )}

            {/* Empty State - No Track Selected */}
            {!selectedTrack && (
                <div className="audio-analysis-empty-state">
                    <div className="audio-analysis-empty-icon">🎵</div>
                    <h2 className="audio-analysis-empty-title">Select a Track</h2>
                    <p className="audio-analysis-empty-subtitle">Choose from the Playlist tab to begin</p>
                </div>
            )}

            {/* Step Content Container - Renders only the active step's content */}
            {selectedTrack && !practiceModeActive && (
                <div className="step-content-container">
                    {renderStepContent()}
                </div>
            )}

            {/* Beat Practice View - Full-width immersive experience */}
            {selectedTrack && practiceModeActive && beatMap && (
                <BeatPracticeView onExit={handleExitPracticeMode} />
            )}
        </div>
    );
}

export default BeatDetectionTab;
