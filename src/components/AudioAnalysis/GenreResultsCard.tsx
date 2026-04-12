import { useMemo, useCallback } from 'react';
import { Music, AlertCircle, RefreshCw, Clock, Tag, TrendingUp, Wifi, Cpu, FileAudio, Download, Heart, Zap, Smile, Activity } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { GenreBarChart } from '../ui/GenreBarChart';
import type { MusicClassificationProfile, ClassificationTag, VibeMetrics } from '@/types';
import type { ClassificationError, ClassificationErrorType } from '@/hooks/useMusicClassifier';
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
 * Export data structure for music classification profile
 */
export interface MusicClassificationExport {
    /** Schema version for future migrations */
    version: 2;
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
        /** Detected moods/themes with confidence scores */
        moods: Array<{
            name: string;
            confidence: number;
        }>;
        /** Mood tags (keyword strings) */
        moodTags: string[];
        /** Vibe metrics */
        vibeMetrics?: {
            danceability?: number;
            energy?: number;
            valence?: number;
        };
        /** Analysis metadata */
        metadata?: {
            durationAnalyzed?: number;
            analyzedAt?: string;
            modelsUsed?: string[];
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
    /** The full music classification profile (genres, moods, vibe metrics) */
    profile?: MusicClassificationProfile | null;
    /** Whether analysis is currently in progress */
    isAnalyzing?: boolean;
    /** Whether the ML model is being loaded (first-time initialization) */
    isModelLoading?: boolean;
    /** Analysis progress percentage (0-100) */
    progress?: number;
    /** Error information if analysis failed */
    error?: ClassificationError | null;
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
    name: 'Discogs-EffNet (Discogs400)',
    source: 'https://arweave.net/tVO0RIu2Ly_Di5cZccw_wB3x6Vs_2KSqxhl8bdhhimE/model.json',
};

/**
 * Export music classification profile as JSON file
 */
const exportMusicClassification = (
    profile: MusicClassificationProfile,
    trackInfo?: GenreTrackInfo
): void => {
    const exportData: MusicClassificationExport = {
        version: 2,
        exportedAt: new Date().toISOString(),
        track: {
            title: trackInfo?.title,
            artist: trackInfo?.artist,
            url: trackInfo?.url,
        },
        analysis: {
            primaryGenre: profile.primary_genre,
            genres: profile.genres.map(g => ({
                name: g.name,
                confidence: g.confidence,
            })),
            moods: profile.moods.map(m => ({
                name: m.name,
                confidence: m.confidence,
            })),
            moodTags: profile.mood_tags,
            vibeMetrics: profile.vibe_metrics ? {
                danceability: profile.vibe_metrics.danceability,
                energy: profile.vibe_metrics.energy,
                valence: profile.vibe_metrics.valence,
            } : undefined,
            metadata: {
                durationAnalyzed: profile.analysis_metadata?.duration_analyzed,
                analyzedAt: profile.analysis_metadata?.analyzed_at,
                modelsUsed: profile.analysis_metadata?.models_used,
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
        : `music_${profile.primary_genre}`;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${baseName}_classification_${timestamp}.json`;

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
 * Format a decimal value as a percentage
 */
const formatPercent = (value: number | undefined): string => {
    if (value === undefined) return '--';
    return `${Math.round(value * 100)}%`;
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
 * Displays an error message with a retry button
 */
function ErrorState({ error, onRetry }: { error: ClassificationError; onRetry?: () => void }) {
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
                <h4 className="genre-results-model-loading-title">Loading ML Models...</h4>
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
 * Shows during music classification with progress percentage
 */
function AnalysisProgressIndicator({ progress }: { progress: number }) {
    return (
        <div className="genre-results-analysis-progress">
            <div className="genre-results-analysis-progress-header">
                <div className="genre-results-analysis-progress-icon">
                    <Music className="genre-results-analysis-progress-icon-inner" size={24} />
                </div>
                <div className="genre-results-analysis-progress-text">
                    <h4 className="genre-results-analysis-progress-title">Analyzing Music...</h4>
                    <p className="genre-results-analysis-progress-desc">
                        Classifying genres, moods, and vibe metrics
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
 * Mood Tags Component
 * Displays mood/theme tags as colored chips
 */
function MoodTagsSection({ moods, moodTags }: { moods: ClassificationTag[]; moodTags: string[] }) {
    if (moods.length === 0 && moodTags.length === 0) return null;

    return (
        <div className="genre-results-moods">
            <h4 className="genre-results-section-title">
                <Heart size={16} className="genre-results-section-icon" />
                Moods & Themes
            </h4>
            <div className="genre-results-mood-tags">
                {moodTags.slice(0, 8).map((tag, index) => (
                    <span key={index} className="genre-results-mood-tag">
                        {formatGenreName(tag)}
                    </span>
                ))}
            </div>
            {/* Show all moods with confidence scores */}
            {moods.length > 1 && (
                <div className="genre-results-mood-confidence">
                    <h5 className="genre-results-section-subtitle">
                        Confidence Scores ({moods.length} detected)
                    </h5>
                    <div className="genre-results-mood-list">
                        {moods.map((mood, index) => (
                            <div key={index} className="genre-results-mood-item">
                                <span className="genre-results-mood-name">
                                    {formatGenreName(mood.name)}
                                </span>
                                <span className="genre-results-mood-confidence-bar">
                                    <div
                                        className="genre-results-mood-confidence-fill"
                                        style={{ width: `${mood.confidence * 100}%` }}
                                    />
                                </span>
                                <span className="genre-results-mood-confidence-value">
                                    {Math.round(mood.confidence * 100)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Vibe Metrics Component
 * Displays danceability, energy, and other vibe metrics as progress bars
 */
function VibeMetricsSection({ vibeMetrics }: { vibeMetrics?: VibeMetrics }) {
    if (!vibeMetrics) return null;

    const metrics = [
        { key: 'danceability', label: 'Danceability', value: vibeMetrics.danceability, icon: Activity, color: '#10b981' },
        { key: 'energy', label: 'Energy', value: vibeMetrics.energy, icon: Zap, color: '#f59e0b' },
        { key: 'valence', label: 'Positivity', value: vibeMetrics.valence, icon: Smile, color: '#ec4899' },
    ].filter(m => m.value !== undefined);

    if (metrics.length === 0) return null;

    return (
        <div className="genre-results-vibe">
            <h4 className="genre-results-section-title">
                <Activity size={16} className="genre-results-section-icon" />
                Vibe Metrics
            </h4>
            <div className="genre-results-vibe-metrics">
                {metrics.map(({ key, label, value, icon: Icon, color }) => (
                    <div key={key} className="genre-results-vibe-item">
                        <div className="genre-results-vibe-header">
                            <Icon size={14} style={{ color }} />
                            <span className="genre-results-vibe-label">{label}</span>
                            <span className="genre-results-vibe-value">{formatPercent(value)}</span>
                        </div>
                        <div className="genre-results-vibe-bar">
                            <div
                                className="genre-results-vibe-bar-fill"
                                style={{ width: `${(value ?? 0) * 100}%`, backgroundColor: color }}
                            />
                        </div>
                    </div>
                ))}
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
    moodCount,
    threshold
}: {
    duration?: number;
    timestamp?: string;
    genreCount: number;
    moodCount?: number;
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
            {moodCount !== undefined && moodCount > 0 && (
                <div className="genre-results-metadata-item">
                    <Heart size={14} className="genre-results-metadata-icon" />
                    <span className="genre-results-metadata-label">Moods</span>
                    <span className="genre-results-metadata-value">{moodCount}</span>
                </div>
            )}
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
 * Displays the results of ML-based music classification for an audio track.
 * Shows the primary genre, moods, vibe metrics (danceability, energy, etc.),
 * and a bar chart of all detected genres.
 *
 * Features:
 * - Primary genre highlight with confidence score
 * - Mood/theme tags and confidence scores
 * - Vibe metrics visualization (danceability, energy, positivity, acoustic)
 * - GenreBarChart visualization for all detected genres
 * - Analysis metadata (duration, timestamp, counts)
 * - Loading skeleton state while analyzing
 * - Error state with retry option
 * - Model loading indicator for first-time ML initialization
 * - Export to JSON functionality
 *
 * @example
 * ```tsx
 * <GenreResultsCard
 *   profile={musicClassification}
 *   isAnalyzing={isAnalyzing}
 *   progress={progress}
 *   error={error}
 *   onRetry={handleRetry}
 *   threshold={0.05}
 * />
 * ```
 */
export function GenreResultsCard({
    profile,
    isAnalyzing = false,
    isModelLoading = false,
    progress = 0,
    error = null,
    onRetry,
    threshold,
    trackInfo,
    className = '',
}: GenreResultsCardProps) {
    // Extract metadata from classification profile
    const metadata = useMemo(() => {
        if (!profile) return null;

        return {
            primaryGenre: profile.primary_genre,
            genres: profile.genres,
            moods: profile.moods,
            moodTags: profile.mood_tags,
            vibeMetrics: profile.vibe_metrics,
            duration: profile.analysis_metadata?.duration_analyzed,
            timestamp: profile.analysis_metadata?.analyzed_at,
        };
    }, [profile]);

    // Get primary genre confidence
    const primaryGenreConfidence = useMemo(() => {
        if (!metadata?.primaryGenre || !metadata?.genres) return 0;
        const primary = metadata.genres.find((g: ClassificationTag) => g.name === metadata.primaryGenre);
        return primary?.confidence ?? 0;
    }, [metadata]);

    // Handle export button click
    const handleExport = useCallback(() => {
        if (profile) {
            exportMusicClassification(profile, trackInfo);
        }
    }, [profile, trackInfo]);

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
    if (!profile || !metadata) {
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
                <h3 className="genre-results-title">Music Classification</h3>
                <span className="genre-results-badge">ML Analysis</span>
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
                    maxBars={metadata.genres.length}
                />
            </div>

            {/* Mood Tags */}
            <MoodTagsSection moods={metadata.moods} moodTags={metadata.moodTags} />

            {/* Vibe Metrics */}
            <VibeMetricsSection vibeMetrics={metadata.vibeMetrics} />

            {/* Metadata */}
            <MetadataRow
                duration={metadata.duration}
                timestamp={metadata.timestamp}
                genreCount={metadata.genres.length}
                moodCount={metadata.moods.length}
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
                    Export Classification
                </Button>
            </div>
        </Card>
    );
}

export default GenreResultsCard;
