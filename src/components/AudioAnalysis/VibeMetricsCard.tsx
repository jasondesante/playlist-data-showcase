import { useMemo, useCallback } from 'react';
import { Activity, Zap, Smile, Clock, Download } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { MusicClassificationProfile } from '@/types';
import type { GenreTrackInfo } from './GenreResultsCard';
import './VibeMetricsCard.css';

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
 * Format a decimal value as a percentage
 */
const formatPercent = (value: number | undefined): string => {
    if (value === undefined) return '--';
    return `${Math.round(value * 100)}%`;
};

/**
 * Default model information for export
 */
const DEFAULT_MODEL_INFO = {
    name: 'Discogs-EffNet + MTG Jamendo',
    source: '/models/discogs-effnet-bs64-1.json',
};

/**
 * Export data structure for music classification profile
 */
export interface MusicClassificationExport {
    version: number;
    exportedAt: string;
    track: {
        title?: string;
        artist?: string;
        url?: string;
    };
    analysis: {
        primaryGenre: string;
        genres: Array<{ name: string; confidence: number }>;
        moods: Array<{ name: string; confidence: number }>;
        moodTags: string[];
        vibeMetrics?: {
            danceability?: number;
            energy?: number;
            valence?: number;
        };
        metadata?: {
            durationAnalyzed?: number;
            analyzedAt?: string;
            modelsUsed?: string[];
        };
    };
    model: {
        name: string;
        source: string;
    };
}

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

    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const baseName = trackInfo?.title
        ? trackInfo.title.replace(/[^a-z0-9]/gi, '_').slice(0, 50)
        : `music_${profile.primary_genre}`;
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${baseName}_classification_${timestamp}.json`;

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Props for the VibeMetricsCard component
 */
export interface VibeMetricsCardProps {
    /** The full music classification profile */
    profile?: MusicClassificationProfile | null;
    /** Track information for export metadata */
    trackInfo?: GenreTrackInfo;
    /** The confidence threshold used for filtering */
    threshold?: number;
    /** Optional additional CSS class name */
    className?: string;
}

/**
 * VibeMetricsCard Component
 *
 * Displays vibe metrics (danceability, energy, positivity) along with
 * analysis metadata and export functionality.
 */
export function VibeMetricsCard({
    profile,
    trackInfo,
    threshold,
    className = '',
}: VibeMetricsCardProps) {
    // Extract vibe metrics and metadata
    const data = useMemo(() => {
        if (!profile) return null;

        return {
            vibeMetrics: profile.vibe_metrics,
            duration: profile.analysis_metadata?.duration_analyzed,
            timestamp: profile.analysis_metadata?.analyzed_at,
            genreCount: profile.genres.length,
            moodCount: profile.moods.length,
        };
    }, [profile]);

    // Handle export
    const handleExport = useCallback(() => {
        if (profile) {
            exportMusicClassification(profile, trackInfo);
        }
    }, [profile, trackInfo]);

    // No data state
    if (!profile || !data) {
        return null;
    }

    // Check if we have any vibe metrics
    const hasVibeMetrics = data.vibeMetrics && (
        data.vibeMetrics.danceability !== undefined ||
        data.vibeMetrics.energy !== undefined ||
        data.vibeMetrics.valence !== undefined
    );

    const metrics = hasVibeMetrics && data.vibeMetrics ? [
        { key: 'danceability', label: 'Danceability', value: data.vibeMetrics.danceability, icon: Activity, color: '#10b981' },
        { key: 'energy', label: 'Energy', value: data.vibeMetrics.energy, icon: Zap, color: '#f59e0b' },
        { key: 'valence', label: 'Positivity', value: data.vibeMetrics.valence, icon: Smile, color: '#ec4899' },
    ].filter(m => m.value !== undefined) : [];

    return (
        <Card
            variant="elevated"
            padding="md"
            className={`vibe-metrics-card ${className}`}
        >
            {/* Header */}
            <div className="vibe-metrics-header">
                <Activity size={16} className="vibe-metrics-header-icon" />
                <h3 className="vibe-metrics-title">Vibe Metrics</h3>
            </div>

            {/* Vibe Metrics Bars */}
            {metrics && metrics.length > 0 && (
                <div className="vibe-metrics-bars">
                    {metrics.map(({ key, label, value, icon: Icon, color }) => (
                        <div key={key} className="vibe-metrics-item">
                            <div className="vibe-metrics-item-header">
                                <Icon size={14} style={{ color }} />
                                <span className="vibe-metrics-item-label">{label}</span>
                                <span className="vibe-metrics-item-value">{formatPercent(value)}</span>
                            </div>
                            <div className="vibe-metrics-item-bar">
                                <div
                                    className="vibe-metrics-item-bar-fill"
                                    style={{ width: `${(value ?? 0) * 100}%`, backgroundColor: color }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* No vibe metrics message */}
            {!hasVibeMetrics && (
                <div className="vibe-metrics-empty">
                    <span className="vibe-metrics-empty-text">No vibe metrics available</span>
                </div>
            )}

            {/* Metadata Row */}
            <div className="vibe-metrics-metadata">
                {data.duration !== undefined && (
                    <div className="vibe-metrics-metadata-item">
                        <Clock size={14} className="vibe-metrics-metadata-icon" />
                        <span className="vibe-metrics-metadata-label">Duration</span>
                        <span className="vibe-metrics-metadata-value">{formatDuration(data.duration)}</span>
                    </div>
                )}
                {data.timestamp && (
                    <div className="vibe-metrics-metadata-item">
                        <span className="vibe-metrics-metadata-label">Analyzed</span>
                        <span className="vibe-metrics-metadata-value">{formatTimestamp(data.timestamp)}</span>
                    </div>
                )}
                <div className="vibe-metrics-metadata-item">
                    <span className="vibe-metrics-metadata-label">Genres</span>
                    <span className="vibe-metrics-metadata-value">{data.genreCount}</span>
                </div>
                {data.moodCount > 0 && (
                    <div className="vibe-metrics-metadata-item">
                        <span className="vibe-metrics-metadata-label">Moods</span>
                        <span className="vibe-metrics-metadata-value">{data.moodCount}</span>
                    </div>
                )}
                {threshold !== undefined && (
                    <div className="vibe-metrics-metadata-item">
                        <span className="vibe-metrics-metadata-label">Threshold</span>
                        <span className="vibe-metrics-metadata-value">{(threshold * 100).toFixed(0)}%</span>
                    </div>
                )}
            </div>

            {/* Export Button */}
            <div className="vibe-metrics-actions">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    leftIcon={Download}
                    className="vibe-metrics-export-btn"
                >
                    Export Classification
                </Button>
            </div>
        </Card>
    );
}

export default VibeMetricsCard;
