import { useMemo } from 'react';
import type { ClassificationTag } from '@/types';
import './GenreBarChart.css';

/**
 * Props for the GenreBarChart component
 */
export interface GenreBarChartProps {
    /** Array of genre tags with confidence scores */
    genres: ClassificationTag[];
    /** The primary genre to highlight (optional) */
    primaryGenre?: string;
    /** Maximum number of bars to display (default: 10) */
    maxBars?: number;
    /** Optional additional CSS class name */
    className?: string;
}

/**
 * GenreBarChart Component
 *
 * Renders a horizontal bar chart for visualizing genre detection results.
 * Displays genres sorted by confidence percentage with visual bars.
 *
 * Features:
 * - Sorted by confidence (descending)
 * - Limitable to top N genres
 * - Primary genre highlighting with distinct styling
 * - Animated bars on load (CSS transitions)
 * - Hover states with exact percentage tooltip
 * - Responsive and scrollable layout
 * - Dark/light theme support via CSS variables
 *
 * @example
 * ```tsx
 * <GenreBarChart
 *   genres={[
 *     { name: 'rock', confidence: 0.85 },
 *     { name: 'alternative', confidence: 0.42 },
 *   ]}
 *   primaryGenre="rock"
 *   maxBars={10}
 * />
 * ```
 */
export function GenreBarChart({
    genres,
    primaryGenre,
    maxBars = 10,
    className = '',
}: GenreBarChartProps) {
    // Sort genres by confidence (descending) and limit to maxBars
    const sortedGenres = useMemo(() => {
        return [...genres]
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, maxBars);
    }, [genres, maxBars]);

    // Format confidence as percentage
    const formatPercent = (confidence: number): string => {
        return `${(confidence * 100).toFixed(1)}%`;
    };

    // Format genre name for display (capitalize, handle hyphens)
    const formatGenreName = (name: string): string => {
        return name
            .split(/[-_\s]+/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    if (genres.length === 0) {
        return (
            <div className={`genre-bar-chart genre-bar-chart-empty ${className}`}>
                <span className="genre-bar-chart-empty-text">No genres detected</span>
            </div>
        );
    }

    return (
        <div
            className={`genre-bar-chart ${className}`}
            role="list"
            aria-label="Detected genres"
        >
            {sortedGenres.map((genre, index) => {
                const isPrimary = genre.name === primaryGenre;
                const percent = genre.confidence * 100;

                return (
                    <div
                        key={`${genre.name}-${index}`}
                        className={`genre-bar-row ${isPrimary ? 'genre-bar-primary' : ''}`}
                        role="listitem"
                        aria-label={`${formatGenreName(genre.name)}: ${formatPercent(genre.confidence)}`}
                    >
                        {/* Genre name */}
                        <span className="genre-bar-label">
                            {isPrimary && (
                                <span className="genre-bar-primary-indicator" aria-hidden="true">
                                    *
                                </span>
                            )}
                            <span className="genre-bar-name">
                                {formatGenreName(genre.name)}
                            </span>
                        </span>

                        {/* Bar container */}
                        <div className="genre-bar-track">
                            <div
                                className={`genre-bar-fill ${isPrimary ? 'genre-bar-fill-primary' : ''}`}
                                style={{ '--fill-width': `${percent}%` } as React.CSSProperties}
                            >
                                {/* Animated shimmer effect for primary */}
                                {isPrimary && <div className="genre-bar-shimmer" />}
                            </div>
                        </div>

                        {/* Percentage value */}
                        <span className="genre-bar-value">
                            {formatPercent(genre.confidence)}
                        </span>
                    </div>
                );
            })}

            {/* Legend for primary genre indicator */}
            {primaryGenre && sortedGenres.some(g => g.name === primaryGenre) && (
                <div className="genre-bar-legend">
                    <span className="genre-bar-legend-item">
                        <span className="genre-bar-legend-indicator">*</span>
                        <span>Primary genre</span>
                    </span>
                </div>
            )}
        </div>
    );
}

export default GenreBarChart;
