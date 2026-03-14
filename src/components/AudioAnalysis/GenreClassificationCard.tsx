import { useMemo } from 'react';
import { Music, TrendingUp, Tag, AlertCircle, RefreshCw, Wifi, Cpu, FileAudio } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GenreBarChart } from '../ui/GenreBarChart';
import type { MusicClassificationProfile, ClassificationTag } from '@/types';
import type { ClassificationError, ClassificationErrorType } from '@/hooks/useMusicClassifier';
import './GenreClassificationCard.css';

/**
 * Props for the GenreClassificationCard component
 */
export interface GenreClassificationCardProps {
    /** The full music classification profile */
    profile?: MusicClassificationProfile | null;
    /** Whether analysis is currently in progress */
    isAnalyzing?: boolean;
    /** Whether the ML model is being loaded */
    isModelLoading?: boolean;
    /** Analysis progress percentage (0-100) */
    progress?: number;
    /** Error information if analysis failed */
    error?: ClassificationError | null;
    /** Callback to retry analysis */
    onRetry?: () => void;
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
 * Get icon for error type
 */
const getErrorIcon = (type: ClassificationErrorType) => {
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
const getErrorTitle = (type: ClassificationErrorType): string => {
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
 */
function ErrorState({ error, onRetry }: { error: ClassificationError; onRetry?: () => void }) {
    const Icon = getErrorIcon(error.type);
    const title = getErrorTitle(error.type);

    return (
        <div className="genre-card-error" role="alert">
            <Icon className="genre-card-error-icon" size={24} />
            <div className="genre-card-error-content">
                <h4 className="genre-card-error-title">{title}</h4>
                <p className="genre-card-error-message">{error.message}</p>
            </div>
            {onRetry && (
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    leftIcon={RefreshCw}
                    className="genre-card-error-retry"
                >
                    Retry
                </Button>
            )}
        </div>
    );
}

/**
 * Model Loading Indicator
 */
function ModelLoadingIndicator({ progress }: { progress: number }) {
    return (
        <div className="genre-card-loading">
            <div className="genre-card-loading-icon">
                <Music className="genre-card-loading-icon-inner" size={32} />
            </div>
            <div className="genre-card-loading-content">
                <h4 className="genre-card-loading-title">Loading ML Models...</h4>
                <p className="genre-card-loading-desc">First-time setup may take 5-10 seconds</p>
                <div className="genre-card-loading-progress">
                    <div
                        className="genre-card-loading-progress-bar"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

/**
 * Analysis Progress Indicator
 */
function AnalysisProgressIndicator({ progress }: { progress: number }) {
    return (
        <div className="genre-card-progress">
            <div className="genre-card-progress-header">
                <div className="genre-card-progress-icon">
                    <Music className="genre-card-progress-icon-inner" size={24} />
                </div>
                <div className="genre-card-progress-text">
                    <h4 className="genre-card-progress-title">Analyzing Genres...</h4>
                    <p className="genre-card-progress-desc">Classifying music style and genre</p>
                </div>
                <div className="genre-card-progress-percent">{Math.round(progress)}%</div>
            </div>
            <div className="genre-card-progress-bar-container">
                <div
                    className="genre-card-progress-bar"
                    style={{ width: `${progress}%` }}
                />
            </div>
        </div>
    );
}

/**
 * GenreClassificationCard Component
 *
 * Displays the primary genre and bar chart of all detected genres.
 * This is the left card in the 2-column genre results layout.
 */
export function GenreClassificationCard({
    profile,
    isAnalyzing = false,
    isModelLoading = false,
    progress = 0,
    error = null,
    onRetry,
    className = '',
}: GenreClassificationCardProps) {
    // Extract genre data from classification profile
    const genreData = useMemo(() => {
        if (!profile) return null;

        return {
            primaryGenre: profile.primary_genre,
            genres: profile.genres,
        };
    }, [profile]);

    // Get primary genre confidence
    const primaryGenreConfidence = useMemo(() => {
        if (!genreData?.primaryGenre || !genreData?.genres) return 0;
        const primary = genreData.genres.find((g: ClassificationTag) => g.name === genreData.primaryGenre);
        return primary?.confidence ?? 0;
    }, [genreData]);

    // Show loading state
    if (isAnalyzing || isModelLoading) {
        return (
            <Card variant="elevated" padding="lg" className={`genre-classification-card ${className}`}>
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
            <Card variant="elevated" padding="lg" className={`genre-classification-card ${className}`}>
                <ErrorState error={error} onRetry={onRetry} />
            </Card>
        );
    }

    // No data state
    if (!profile || !genreData) {
        return null;
    }

    return (
        <Card
            variant="elevated"
            padding="md"
            className={`genre-classification-card ${className}`}
        >
            {/* Header */}
            <div className="genre-classification-header">
                <div className="genre-classification-title-row">
                    <Music size={16} className="genre-classification-title-icon" />
                    <h3 className="genre-classification-title">Genre Classification</h3>
                </div>
                <span className="genre-classification-badge">ML Analysis</span>
            </div>

            {/* Primary Genre Highlight */}
            {genreData.primaryGenre && (
                <div className="genre-classification-primary">
                    <div className="genre-classification-primary-badge">Primary</div>
                    <div className="genre-classification-primary-name">{formatGenreName(genreData.primaryGenre)}</div>
                    <div className="genre-classification-primary-confidence">
                        <TrendingUp size={14} className="genre-classification-primary-confidence-icon" />
                        <span className="genre-classification-primary-confidence-value">
                            {(primaryGenreConfidence * 100).toFixed(1)}%
                        </span>
                        <span className="genre-classification-primary-confidence-label">confidence</span>
                    </div>
                </div>
            )}

            {/* Genre Bar Chart */}
            <div className="genre-classification-chart-container">
                <div className="genre-classification-chart-header">
                    <Tag size={14} className="genre-classification-chart-icon" />
                    <span className="genre-classification-chart-label">
                        {genreData.genres.length} genres detected
                    </span>
                </div>
                <GenreBarChart
                    genres={genreData.genres}
                    primaryGenre={genreData.primaryGenre}
                    maxBars={genreData.genres.length}
                />
            </div>
        </Card>
    );
}

export default GenreClassificationCard;
