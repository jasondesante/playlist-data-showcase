import { useMemo, useCallback } from 'react';
import { Music, AlertCircle, RefreshCw, Clock, Tag, TrendingUp, Wifi, Cpu, FileAudio, Download } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GenreBarChart } from '../ui/GenreBarChart';
import type { GenreProfile, GenreTag } from '@/types';
import type { GenreError, GenreErrorType } from '@/hooks/useGenreAnalyzer';
import './GenreResultsCard.css';

/**
 * Track information for export metadata
 */
export interface GenreTrackInfo {
    /** Track title */
    title?: string;
    /** Track artist */
    artist?: string;
    /** Audio URL */
    url?: string;
}

/**
 * Export data structure for genre profile
 */
export interface GenreProfileExport {
    /** Schema version for future migrations */
    version: 1;
    /** Export timestamp (ISO string) */
    exportedAt: string;
    /** Track information */
    track: {
        title?: string;
        artist?: string;
        url?: string;
    };
    /** Analysis results */
    analysis: {
        /** Primary detected genre */
        primaryGenre: string;
        /** All detected genres with confidence scores */
        genres: Array<{
            name: string;
            confidence: number;
        }>;
        /** Analysis metadata */
        metadata?: {
            durationAnalyzed?: number;
            analyzedAt?: string;
        };
    };
    /** Model information */
    model: {
        /** ML model name */
        name: string;
        /** Model source URL */
        source: string;
    };
}

/**
 * Props for the GenreResultsCard component
 */
export interface GenreResultsCardProps {
    /** The genre profile data to display */
    genreProfile: GenreProfile | null;
    /** Whether analysis is currently in progress */
    isAnalyzing?: boolean;
    /** Whether the ML model is being loaded (first-time initialization) */
    isModelLoading?: boolean;
    /** Analysis progress percentage (0-100) */
    progress?: number;
    /** Error information if analysis failed */
    error?: GenreError | null;
    /** Callback to retry analysis when an error occurs */
    onRetry?: () => void;
    /** The confidence threshold used for filtering genres */
    threshold?: number;
    /** Track information for export metadata */
    trackInfo?: GenreTrackInfo;
    /** Optional additional CSS class name */
    className?: string;
}

/**
 * Format genre name for display (capitalize, handle hyphens)
 */
const formatGenreName = (name: string): string => {
    return name
        .split(/[-_\s]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
};

/**
 * Format a timestamp for display
 */
const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/**
 * Default model information for export
 */
const DEFAULT_MODEL_INFO = {
    name: 'MTG Jamendo Genre Classifier',
    source: 'https://cdn.jsdelivr.net/gh/MTG/essentia.js/examples/models/mtg_jamendo_genre/model.json',
};

/**
 * Export genre profile as JSON file
 */
const exportGenreProfile = (
    genreProfile: GenreProfile,
    trackInfo?: GenreTrackInfo
): void => {
    const exportData: GenreProfileExport = {
        version: 1,
        exportedAt: new Date().toISOString(),
        track: {
            title: trackInfo?.title,
            artist: trackInfo?.artist,
            url: trackInfo?.url,
        },
        analysis: {
            primaryGenre: genreProfile.primary_genre,
            genres: genreProfile.genres.map(g => ({
                name: g.name,
                confidence: g.confidence,
            })),
            metadata: {
                durationAnalyzed: genreProfile.analysis_metadata?.duration_analyzed,
                analyzedAt: genreProfile.analysis_metadata?.analyzed_at,
            },
        },
        model: DEFAULT_MODEL_INFO,
    };

    // Create JSON blob and download
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Generate filename from track info or primary genre
    const baseName = trackInfo?.title
        ? trackInfo.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)
        : `genre_${genreProfile.primary_genre}`;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${baseName}_genre_profile_${timestamp}.json`;

    // Create temporary link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Format duration in seconds to a readable string
 */
const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Get icon for error type
 */
const getErrorIcon = (type: GenreErrorType) => {
    switch (type) {
        case 'network':
            return Wifi;
        case 'model_load':
            return Cpu;
        case 'audio_decode':
            return FileAudio;
        default:
            return AlertCircle;
    }
};

/**
 * Get title for error type
 */
const getErrorTitle = (type: GenreErrorType): string => {
    switch (type) {
        case 'network':
            return 'Network Error';
        case 'model_load':
            return 'Model Loading Failed';
        case 'audio_decode':
            return 'Audio Processing Error';
        default:
            return 'Analysis Failed';
    }
};

/**
 * Error State Component
 * Displays an error message with a retry button
 */
function ErrorState({ error, onRetry }: { error: GenreError; onRetry?: () => void }) {
    const Icon = getErrorIcon(error.type);
    const title = getErrorTitle(error.type);

    return (
        <div className="genre-results-error" role="alert">
            <Icon className="genre-results-error-icon" size={24} />
            <div className="genre-results-error-content">
                <h4 className="genre-results-error-title">{title}</h4>
                <p className="genre-results-error-message">{error.message}</p>
                {error.technicalMessage && (
                    <details className="genre-results-error-details">
                        <summary>Technical Details</summary>
                        <code className="genre-results-error-technical">{error.technicalMessage}</code>
                    </details>
                )}
            </div>
            {onRetry && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    leftIcon={RefreshCw}
                    className="genre-results-error-retry"
                >
                    Retry
                </Button>
            )}
        </div>
    );
}

/**
 * Model Loading Indicator
 * Shows when the ML model is being loaded for the first time
 */
function ModelLoadingIndicator({ progress }: { progress: number }) {
    return (
        <div className="genre-results-model-loading">
            <div className="genre-results-model-loading-icon">
                <Music className="genre-results-model-loading-icon-inner" size={32} />
            </div>
            <div className="genre-results-model-loading-content">
                <h4 className="genre-results-model-loading-title">Loading ML Model...</h4>
                <p className="genre-results-model-loading-desc">
                    First-time setup may take 5-10 seconds
                </p>
                <div className="genre-results-model-loading-progress">
                    <div
                        className="genre-results-model-loading-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Analysis Progress Indicator
 * Shows during genre analysis with progress percentage
 */
function AnalysisProgressIndicator({ progress }: { progress: number }) {
    return (
        <div className="genre-results-analysis-progress">
            <div className="genre-results-analysis-progress-header">
                <div className="genre-results-analysis-progress-icon">
                    <Music className="genre-results-analysis-progress-icon-inner" size={24} />
                </div>
                <div className="genre-results-analysis-progress-text">
                    <h4 className="genre-results-analysis-progress-title">Analyzing Genre...</h4>
                    <p className="genre-results-analysis-progress-desc">
                        Processing audio with ML classification
                    </p>
                </div>
                <div className="genre-results-analysis-progress-percent">
                    {Math.round(progress)}%
                </div>
            </div>
            <div className="genre-results-analysis-progress-bar-container">
                <div
                    className="genre-results-analysis-progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

/**
 * Primary Genre Highlight Component
 * Displays the primary genre prominently with confidence score
 */
function PrimaryGenreHighlight({ genre, confidence }: { genre: string; confidence: number }) {
    const percentConfidence = useMemo(() => (confidence * 100).toFixed(1), [confidence]);

    return (
        <div className="genre-results-primary">
            <div className="genre-results-primary-badge">Primary Genre</div>
            <div className="genre-results-primary-name">{formatGenreName(genre)}</div>
            <div className="genre-results-primary-confidence">
                <TrendingUp size={14} className="genre-results-primary-confidence-icon" />
                <span className="genre-results-primary-confidence-value">{percentConfidence}%</span>
                <span className="genre-results-primary-confidence-label">confidence</span>
            </div>
        </div>
    );
}

/**
 * Metadata Row Component
 * Displays analysis metadata in a compact row
 */
function MetadataRow({
    duration,
    timestamp,
    genreCount,
    threshold
}: {
    duration?: number;
    timestamp?: string;
    genreCount: number;
    threshold?: number;
}) {
    return (
        <div className="genre-results-metadata">
            {duration !== undefined && (
                <div className="genre-results-metadata-item">
                    <Clock size={14} className="genre-results-metadata-icon" />
                    <span className="genre-results-metadata-label">Duration</span>
                    <span className="genre-results-metadata-value">{formatDuration(duration)}</span>
                </div>
            )}
            {timestamp && (
                <div className="genre-results-metadata-item">
                    <span className="genre-results-metadata-label">Analyzed</span>
                    <span className="genre-results-metadata-value">{formatTimestamp(timestamp)}</span>
                </div>
            )}
            <div className="genre-results-metadata-item">
                <Tag size={14} className="genre-results-metadata-icon" />
                <span className="genre-results-metadata-label">Genres</span>
                <span className="genre-results-metadata-value">{genreCount}</span>
            </div>
            {threshold !== undefined && (
                <div className="genre-results-metadata-item">
                    <span className="genre-results-metadata-label">Threshold</span>
                    <span className="genre-results-metadata-value">{(threshold * 100).toFixed(0)}%</span>
                </div>
            )}
        </div>
    );
}

/**
 * GenreResultsCard Component
 *
 * Displays the results of ML-based genre analysis for an audio track.
 * Shows the primary genre prominently, followed by a bar chart of all detected genres,
 * analysis metadata, and the confidence threshold used.
 *
 * Features:
 * - Primary genre highlight with confidence score
 * - GenreBarChart visualization for all detected genres
 * - Analysis metadata (duration, timestamp, genre count)
 * - Loading skeleton state while analyzing
 * - Error state with retry option
 * - Model loading indicator for first-time ML initialization
 *
 * @example
 * ```tsx
 * <GenreResultsCard
 *   genreProfile={genreProfile}
 *   isAnalyzing={isAnalyzing}
 *   progress={progress}
 *   error={error}
 *   onRetry={handleRetry}
 *   threshold={0.05}
 * />
 * ```
 */
export function GenreResultsCard({
    genreProfile,
    isAnalyzing = false,
    isModelLoading = false,
    progress = 0,
    error = null,
    onRetry,
    threshold,
    trackInfo,
    className = '',
}: GenreResultsCardProps) {
    // Extract metadata from genre profile
    const metadata = useMemo(() => {
        if (!genreProfile) return null;

        return {
            primaryGenre: genreProfile.primary_genre,
            genres: genreProfile.genres,
            duration: genreProfile.analysis_metadata?.duration_analyzed,
            timestamp: genreProfile.analysis_metadata?.analyzed_at,
        };
    }, [genreProfile]);

    // Get primary genre confidence
    const primaryGenreConfidence = useMemo(() => {
        if (!metadata?.primaryGenre || !metadata?.genres) return 0;
        const primary = metadata.genres.find((g: GenreTag) => g.name === metadata.primaryGenre);
        return primary?.confidence ?? 0;
    }, [metadata]);

    // Handle export button click
    const handleExport = useCallback(() => {
        if (genreProfile) {
            exportGenreProfile(genreProfile, trackInfo);
        }
    }, [genreProfile, trackInfo]);

    // Show loading state
    if (isAnalyzing || isModelLoading) {
        return (
            <Card
                variant="elevated"
                padding="lg"
                className={`genre-results-card ${className}`}
            >
                {isModelLoading ? (
                    <ModelLoadingIndicator progress={progress} />
                ) : (
                    <AnalysisProgressIndicator progress={progress} />
                )}
            </Card>
        );
    }

    // Show error state
    if (error) {
        return (
            <Card
                variant="elevated"
                padding="lg"
                className={`genre-results-card ${className}`}
            >
                <ErrorState error={error} onRetry={onRetry} />
            </Card>
        );
    }

    // No data state
    if (!genreProfile || !metadata) {
        return null;
    }

    return (
        <Card
            variant="elevated"
            padding="lg"
            className={`genre-results-card ${className}`}
        >
            {/* Header */}
            <div className="genre-results-header">
                <h3 className="genre-results-title">Genre Analysis</h3>
                <span className="genre-results-badge">ML Classification</span>
            </div>

            {/* Primary Genre Highlight */}
            {metadata.primaryGenre && (
                <PrimaryGenreHighlight
                    genre={metadata.primaryGenre}
                    confidence={primaryGenreConfidence}
                />
            )}

            {/* Genre Bar Chart */}
            <div className="genre-results-chart-container">
                <GenreBarChart
                    genres={metadata.genres}
                    primaryGenre={metadata.primaryGenre}
                    maxBars={10}
                />
            </div>

            {/* Metadata */}
            <MetadataRow
                duration={metadata.duration}
                timestamp={metadata.timestamp}
                genreCount={metadata.genres.length}
                threshold={threshold}
            />

            {/* Export Button */}
            <div className="genre-results-actions">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    leftIcon={Download}
                    className="genre-results-export-btn"
                >
                    Export Genre Profile
                </Button>
            </div>
        </Card>
    );
}

export default GenreResultsCard;
