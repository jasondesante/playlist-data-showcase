import { useMemo } from 'react';
import { Music, AlertCircle, RefreshCw, Clock, Tag, TrendingUp } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GenreBarChart } from '../ui/GenreBarChart';
import type { GenreProfile, GenreTag } from '@/types';
import './GenreResultsCard.css';

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
    /** Error message if analysis failed */
    error?: string | null;
    /** Callback to retry analysis when an error occurs */
    onRetry?: () => void;
    /** The confidence threshold used for filtering genres */
    threshold?: number;
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
 * Format duration in seconds to a readable string
 */
const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Loading Skeleton Component
 * Displays animated placeholder bars while analysis is in progress
 */
function LoadingSkeleton() {
    return (
        <div className="genre-results-skeleton" aria-label="Loading genre analysis">
            <div className="genre-results-skeleton-header">
                <div className="genre-results-skeleton-title" />
                <div className="genre-results-skeleton-badge" />
            </div>
            <div className="genre-results-skeleton-bars">
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="genre-results-skeleton-bar">
                        <div className="genre-results-skeleton-label" />
                        <div className="genre-results-skeleton-track">
                            <div
                                className="genre-results-skeleton-fill"
                                style={{ width: `${Math.random() * 60 + 20}%` }}
                            />
                        </div>
                        <div className="genre-results-skeleton-value" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Error State Component
 * Displays an error message with a retry button
 */
function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
    return (
        <div className="genre-results-error" role="alert">
            <AlertCircle className="genre-results-error-icon" size={24} />
            <div className="genre-results-error-content">
                <h4 className="genre-results-error-title">Analysis Failed</h4>
                <p className="genre-results-error-message">{error}</p>
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
                    <LoadingSkeleton />
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
        </Card>
    );
}

export default GenreResultsCard;
