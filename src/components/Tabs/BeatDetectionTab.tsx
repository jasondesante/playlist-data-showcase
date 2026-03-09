import { useEffect, useCallback } from 'react';
import { Music, Sparkles, Drum, Download, ChevronDown } from 'lucide-react';
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
import { useBeatDetectionStore, useInterpolatedBeatMap, useSubdividedBeatMap, useSubdivisionConfig, useChartStyle, useChartStatistics } from '../../store/beatDetectionStore';
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
    const practiceModeActive = useBeatDetectionStore((state) => state.practiceModeActive);
    const storageError = useBeatDetectionStore((state) => state.storageError);
    const interpolatedBeatMap = useInterpolatedBeatMap();
    const subdividedBeatMap = useSubdividedBeatMap();
    const subdivisionConfig = useSubdivisionConfig();
    const chartStyle = useChartStyle();
    const chartStatistics = useChartStatistics();

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
        } else {
            // Clear the current beat map if no cached version exists for this track
            // This prevents showing stale beat map data from a previous track
            clearBeatMap();
        }
    }, [selectedTrack?.id, selectedTrack?.audio_url, loadCachedBeatMap, clearBeatMap]);

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
     */
    const handleExitPracticeMode = useCallback(() => {
        stopPracticeMode();
    }, [stopPracticeMode]);

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

            {/* Empty State - No Track Selected */}
            {!selectedTrack && (
                <div className="audio-analysis-empty-state">
                    <div className="audio-analysis-empty-icon">🎵</div>
                    <h2 className="audio-analysis-empty-title">Select a Track</h2>
                    <p className="audio-analysis-empty-subtitle">Choose from the Playlist tab to begin</p>
                </div>
            )}

            {/* Primary Control Card - Cohesive Song Info + EQ + Analysis Action */}
            {selectedTrack && (
                <Card variant="elevated" padding="lg" className="audio-analysis-primary-card">
                    <div className="audio-analysis-primary-layout">

                        {/* 1. Song Display Section */}
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

                        {/* 2. Beat Detection Settings */}
                        <div className="audio-analysis-mode-card">
                            <BeatDetectionSettings disabled={isBeatGenerating} />

                            {/* Short track warning for beat detection */}
                            {!beatMap && !isBeatGenerating && duration > 0 && duration < 5 && (
                                <div className="audio-analysis-short-track-warning">
                                    <span className="audio-analysis-short-track-warning-icon">⚠️</span>
                                    <span className="audio-analysis-short-track-warning-text">
                                        This track is short ({duration.toFixed(1)}s). Beat detection works best with tracks longer than 5 seconds.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* 3. Action Section */}
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
                            {/* Storage quota warning */}
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
                </Card>
            )}

            {/* Beat Subdivision Card - Full-width section for subdivision editing */}
            {selectedTrack && beatMap && !isBeatGenerating && !practiceModeActive && (
                <Card variant="elevated" padding="lg" className="audio-analysis-subdivision-timeline-card fade-in">
                    <details className="audio-analysis-subdivision-section" open>
                        <summary className="audio-analysis-subdivision-summary">
                            <span className="audio-analysis-subdivision-summary-text">Beat Subdivision</span>
                            {subdividedBeatMap && (
                                <span className="audio-analysis-subdivision-badge">Generated</span>
                            )}
                            <ChevronDown className="audio-analysis-subdivision-summary-icon" size={12} />
                        </summary>
                        <div className="audio-analysis-subdivision-content">
                            <SubdivisionSettings disabled={isBeatGenerating} />
                        </div>
                    </details>
                </Card>
            )}

            {/* Chart Editor Card - Full-width section for rhythm game key assignment */}
            {selectedTrack && subdividedBeatMap && !isBeatGenerating && !practiceModeActive && (
                <Card variant="elevated" padding="lg" className="audio-analysis-chart-editor-card fade-in">
                    <details className="audio-analysis-chart-editor-section" open>
                        <summary className="audio-analysis-chart-editor-summary">
                            <span className="audio-analysis-chart-editor-summary-text">Chart Editor</span>
                            <span className="audio-analysis-chart-editor-badge">Required Keys</span>
                            <ChevronDown className="audio-analysis-chart-editor-summary-icon" size={12} />
                        </summary>
                        <div className="audio-analysis-chart-editor-content">
                            <ChartEditorToolbar
                                disabled={isBeatGenerating}
                                audioTitle={selectedTrack?.title}
                            />
                            <ChartEditor disabled={isBeatGenerating} />
                        </div>
                    </details>
                </Card>
            )}

            {/* Chart Editor Placeholder - Shown when no subdivided beat map exists yet */}
            {selectedTrack && !subdividedBeatMap && interpolatedBeatMap && !isBeatGenerating && !practiceModeActive && (
                <Card variant="elevated" padding="lg" className="audio-analysis-chart-editor-card audio-analysis-chart-editor-placeholder fade-in">
                    <details className="audio-analysis-chart-editor-section">
                        <summary className="audio-analysis-chart-editor-summary">
                            <span className="audio-analysis-chart-editor-summary-text">Chart Editor</span>
                            <span className="audio-analysis-chart-editor-badge audio-analysis-chart-editor-badge--disabled">Required Keys</span>
                            <ChevronDown className="audio-analysis-chart-editor-summary-icon" size={12} />
                        </summary>
                        <div className="audio-analysis-chart-editor-placeholder-content">
                            <div className="audio-analysis-chart-editor-placeholder-icon">🎹</div>
                            <h4 className="audio-analysis-chart-editor-placeholder-title">Subdivided Beat Map Required</h4>
                            <p className="audio-analysis-chart-editor-placeholder-text">
                                The Chart Editor requires a <strong>subdivided beat map</strong> to assign keys to beats.
                                Generate a subdivided beat map in the Subdivision Settings above to enable chart editing.
                            </p>
                            <p className="audio-analysis-chart-editor-placeholder-hint">
                                💡 Tip: Subdivided beat maps work with specific rhythm patterns (8th notes, 16th notes, etc.)
                                which are required for creating rhythm game charts.
                            </p>
                        </div>
                    </details>
                </Card>
            )}

            {/* Beat Detection Results - Full-width section below primary card */}
            {selectedTrack && !practiceModeActive && (
                <Card variant="elevated" padding="lg" className="beat-detection-results-card fade-in">
                    {/* Beat Map Summary Skeleton - shown during generation */}
                    {isBeatGenerating && (
                        <BeatMapSummarySkeleton />
                    )}
                    {/* Beat Map Summary - shown after successful analysis */}
                    {beatMap && !isBeatGenerating && (
                        <BeatMapSummary
                            beatMap={beatMap}
                            onStartPractice={handleStartPracticeMode}
                        />
                    )}

                    {/* Export Button - shown after successful analysis */}
                    {beatMap && !isBeatGenerating && interpolatedBeatMap && (
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
                </Card>
            )}

            {/* Beat Practice View - Full-width immersive experience */}
            {selectedTrack && practiceModeActive && beatMap && (
                <BeatPracticeView onExit={handleExitPracticeMode} />
            )}
        </div>
    );
}

export default BeatDetectionTab;
