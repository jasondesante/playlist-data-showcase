/**
 * PhraseDetectionPanel Component
 *
 * Container for phrase detection visualizations in the rhythm generation feature.
 * Displays:
 * - Header with total phrase count
 * - Sort control (by significance, occurrences, size)
 * - List of phrase pattern cards
 * - Click to highlight all occurrences on timeline
 *
 * Part of Phase 8: Phrase Detection Visualization (Task 8.1)
 */

import { useState, useMemo } from 'react';
import { Music, TrendingUp, Hash, Clock, Layers, ChevronUp, ChevronDown } from 'lucide-react';
import { PhrasePatternCard } from '../../PhrasePatternCard';
import './PhraseDetectionPanel.css';
import type {
    GeneratedRhythm,
    RhythmicPhrase,
    Band,
} from '../../../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface PhraseDetectionPanelProps {
    /** The generated rhythm containing phrase analysis */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
    /** Callback when a phrase is selected for highlighting */
    onPhraseSelect?: (phrase: RhythmicPhrase | null) => void;
    /** Currently selected phrase (for external control) */
    selectedPhrase?: RhythmicPhrase | null;
    /** Additional CSS class names */
    className?: string;
}

type SortOption = 'significance' | 'occurrences' | 'size';
type SortDirection = 'asc' | 'desc';

// ============================================================
// Sub-components
// ============================================================

/**
 * Sort control component
 */
interface SortControlProps {
    sortBy: SortOption;
    sortDirection: SortDirection;
    onSortChange: (option: SortOption, direction: SortDirection) => void;
}

function SortControl({ sortBy, sortDirection, onSortChange }: SortControlProps) {
    const handleSortClick = (option: SortOption) => {
        if (sortBy === option) {
            // Toggle direction
            onSortChange(option, sortDirection === 'desc' ? 'asc' : 'desc');
        } else {
            // New sort option, default to descending
            onSortChange(option, 'desc');
        }
    };

    return (
        <div className="phrase-sort-control">
            <span className="phrase-sort-label">Sort by:</span>
            <button
                className={`phrase-sort-button ${sortBy === 'significance' ? 'active' : ''}`}
                onClick={() => handleSortClick('significance')}
                title="Sort by significance score"
            >
                <TrendingUp size={14} />
                <span>Significance</span>
                {sortBy === 'significance' && (
                    sortDirection === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                )}
            </button>
            <button
                className={`phrase-sort-button ${sortBy === 'occurrences' ? 'active' : ''}`}
                onClick={() => handleSortClick('occurrences')}
                title="Sort by occurrence count"
            >
                <Hash size={14} />
                <span>Occurrences</span>
                {sortBy === 'occurrences' && (
                    sortDirection === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                )}
            </button>
            <button
                className={`phrase-sort-button ${sortBy === 'size' ? 'active' : ''}`}
                onClick={() => handleSortClick('size')}
                title="Sort by pattern size"
            >
                <Clock size={14} />
                <span>Size</span>
                {sortBy === 'size' && (
                    sortDirection === 'desc' ? <ChevronDown size={12} /> : <ChevronUp size={12} />
                )}
            </button>
        </div>
    );
}

/**
 * Empty state when no phrases detected
 */
function EmptyState() {
    return (
        <div className="phrase-empty-state">
            <Music size={32} className="phrase-empty-icon" />
            <h4 className="phrase-empty-title">No Phrases Detected</h4>
            <p className="phrase-empty-text">
                No recurring rhythmic patterns were found in this track.
                This could indicate a very sparse or highly irregular rhythm.
            </p>
        </div>
    );
}

/**
 * Summary statistics for all phrases
 */
interface SummaryStatsProps {
    phrases: RhythmicPhrase[];
}

function SummaryStats({ phrases }: SummaryStatsProps) {
    const stats = useMemo(() => {
        const totalOccurrences = phrases.reduce((sum, p) => sum + p.occurrences.length, 0);
        const avgSignificance = phrases.length > 0
            ? phrases.reduce((sum, p) => sum + p.significance, 0) / phrases.length
            : 0;
        const variedCount = phrases.filter(p => p.hasVariation).length;
        const reusableCount = phrases.filter(p => p.availableForReuse).length;

        // Count by size
        const sizeCounts: Record<number, number> = {};
        phrases.forEach(p => {
            sizeCounts[p.sizeInBeats] = (sizeCounts[p.sizeInBeats] || 0) + 1;
        });

        // Count by band
        const bandCounts: Record<Band, number> = { low: 0, mid: 0, high: 0 };
        phrases.forEach(p => {
            bandCounts[p.sourceBand]++;
        });

        return {
            totalOccurrences,
            avgSignificance,
            variedCount,
            reusableCount,
            sizeCounts,
            bandCounts,
        };
    }, [phrases]);

    return (
        <div className="phrase-summary-stats">
            <div className="phrase-summary-stat">
                <span className="phrase-summary-stat-value">{stats.totalOccurrences}</span>
                <span className="phrase-summary-stat-label">Total Occurrences</span>
            </div>
            <div className="phrase-summary-stat">
                <span className="phrase-summary-stat-value">
                    {stats.avgSignificance.toFixed(2)}
                </span>
                <span className="phrase-summary-stat-label">Avg Significance</span>
            </div>
            <div className="phrase-summary-stat">
                <span className="phrase-summary-stat-value">{stats.variedCount}</span>
                <span className="phrase-summary-stat-label">Varied Patterns</span>
            </div>
            <div className="phrase-summary-stat">
                <span className="phrase-summary-stat-value">{stats.reusableCount}</span>
                <span className="phrase-summary-stat-label">Reusable</span>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * PhraseDetectionPanel
 *
 * Main container for phrase detection visualizations.
 * Provides sorting controls and displays phrase pattern cards.
 */
export function PhraseDetectionPanel({
    rhythm,
    currentTime: _currentTime = 0,
    isPlaying: _isPlaying = false,
    onSeek: _onSeek,
    onPhraseSelect,
    selectedPhrase: externalSelectedPhrase,
    className,
}: PhraseDetectionPanelProps) {
    // Get phrase analysis from the rhythm
    const phraseAnalysis = rhythm.analysis.phraseAnalysis;
    const allPhrases = phraseAnalysis.phrases;

    // Sort state
    const [sortBy, setSortBy] = useState<SortOption>('significance');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Internal selection state (used if no external control)
    const [internalSelectedPhrase, setInternalSelectedPhrase] = useState<RhythmicPhrase | null>(null);

    // Use external or internal selection
    const selectedPhrase = externalSelectedPhrase !== undefined
        ? externalSelectedPhrase
        : internalSelectedPhrase;

    // Sort phrases
    const sortedPhrases = useMemo(() => {
        const sorted = [...allPhrases];

        sorted.sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'significance':
                    comparison = a.significance - b.significance;
                    break;
                case 'occurrences':
                    comparison = a.occurrences.length - b.occurrences.length;
                    break;
                case 'size':
                    comparison = a.sizeInBeats - b.sizeInBeats;
                    break;
            }

            return sortDirection === 'desc' ? -comparison : comparison;
        });

        return sorted;
    }, [allPhrases, sortBy, sortDirection]);

    // Handle sort change
    const handleSortChange = (option: SortOption, direction: SortDirection) => {
        setSortBy(option);
        setSortDirection(direction);
    };

    // Handle phrase selection
    const handlePhraseSelect = (phrase: RhythmicPhrase) => {
        const newSelection = selectedPhrase?.id === phrase.id ? null : phrase;

        if (externalSelectedPhrase === undefined) {
            setInternalSelectedPhrase(newSelection);
        }

        if (onPhraseSelect) {
            onPhraseSelect(newSelection);
        }
    };

    return (
        <div className={`phrase-detection-panel ${className || ''}`}>
            {/* Header with total count */}
            <div className="phrase-detection-header">
                <div className="phrase-detection-title">
                    <Music size={18} />
                    <span>Phrase Detection</span>
                </div>
                <div className="phrase-detection-count">
                    <span className="phrase-detection-count-value">{allPhrases.length}</span>
                    <span className="phrase-detection-count-label">
                        {allPhrases.length === 1 ? 'pattern' : 'patterns'} detected
                    </span>
                </div>
            </div>

            {allPhrases.length > 0 ? (
                <>
                    {/* Summary statistics */}
                    <SummaryStats phrases={allPhrases} />

                    {/* Sort controls */}
                    <SortControl
                        sortBy={sortBy}
                        sortDirection={sortDirection}
                        onSortChange={handleSortChange}
                    />

                    {/* Phrase list using extracted PhrasePatternCard component */}
                    <div className="phrase-list">
                        {sortedPhrases.map((phrase, index) => (
                            <PhrasePatternCard
                                key={phrase.id}
                                phrase={phrase}
                                index={index}
                                isSelected={selectedPhrase?.id === phrase.id}
                                onSelect={() => handlePhraseSelect(phrase)}
                            />
                        ))}
                    </div>

                    {/* Selection hint */}
                    {selectedPhrase && (
                        <div className="phrase-selection-hint">
                            <Layers size={14} />
                            <span>
                                Phrase selected: {selectedPhrase.occurrences.length} occurrences
                                highlighted on timeline
                            </span>
                        </div>
                    )}
                </>
            ) : (
                <EmptyState />
            )}
        </div>
    );
}

export default PhraseDetectionPanel;
