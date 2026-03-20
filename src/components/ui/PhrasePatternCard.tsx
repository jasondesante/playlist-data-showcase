/**
 * PhrasePatternCard Component
 *
 * Shows a single detected rhythmic pattern with:
 * - Visual representation of the rhythm (mini timeline/grid)
 * - Size (1/2/4/8 beats)
 * - Occurrence count
 * - Significance score
 * - Click to highlight all occurrences on main timeline
 *
 * Part of Phase 8: Phrase Detection Visualization (Task 8.2)
 */

import { useMemo } from 'react';
import { Layers } from 'lucide-react';
import './PhrasePatternCard.css';
import type { RhythmicPhrase, Band } from '../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface PhrasePatternCardProps {
    /** The phrase pattern to display */
    phrase: RhythmicPhrase;
    /** Index in the list (for display) */
    index: number;
    /** Whether this card is currently selected */
    isSelected: boolean;
    /** Callback when card is clicked */
    onSelect: () => void;
    /** Additional CSS class names */
    className?: string;
}

/**
 * Band color scheme (as defined in the plan)
 */
const BAND_COLORS: Record<Band, string> = {
    low: '#3b82f6',    // Blue
    mid: '#22c55e',    // Green
    high: '#f97316',   // Orange
};

/**
 * Size labels for phrase patterns
 */
const SIZE_LABELS: Record<number, string> = {
    1: '1 Beat',
    2: '2 Beats',
    4: '4 Beats',
    8: '8 Beats',
};

// ============================================================
// Sub-components
// ============================================================

/**
 * Mini rhythm pattern visualization
 * Shows a grid representation of the beats within the phrase
 */
interface MiniPatternProps {
    /** The beats in the pattern */
    beats: RhythmicPhrase['pattern'];
    /** Size of the phrase in beats */
    sizeInBeats: number;
    /** Color for the band */
    bandColor: string;
}

function MiniPattern({ beats, sizeInBeats, bandColor }: MiniPatternProps) {
    // Create a grid of cells representing subdivisions within the phrase
    const cellsPerBeat = 4; // 16th notes
    const totalCells = sizeInBeats * cellsPerBeat;

    // Map beats to cell positions
    const beatPositions = useMemo(() => {
        const positions = new Set<number>();
        beats.forEach(beat => {
            const beatOffset = beat.beatIndex * cellsPerBeat + beat.gridPosition;
            positions.add(beatOffset);
        });
        return positions;
    }, [beats]);

    return (
        <div className="phrase-mini-pattern">
            {Array.from({ length: totalCells }).map((_, index) => {
                const hasBeat = beatPositions.has(index);
                const isBeatStart = index % cellsPerBeat === 0;

                return (
                    <div
                        key={index}
                        className={`phrase-pattern-cell ${hasBeat ? 'has-beat' : ''} ${isBeatStart ? 'beat-start' : ''}`}
                        style={hasBeat ? { backgroundColor: bandColor } : undefined}
                    />
                );
            })}
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

/**
 * PhrasePatternCard
 *
 * Compact card displaying a single detected rhythmic phrase pattern.
 * Click to select and highlight all occurrences on the main timeline.
 */
export function PhrasePatternCard({
    phrase,
    index,
    isSelected,
    onSelect,
    className,
}: PhrasePatternCardProps) {
    const bandColor = BAND_COLORS[phrase.sourceBand];
    const sizeLabel = SIZE_LABELS[phrase.sizeInBeats] || `${phrase.sizeInBeats} beats`;

    return (
        <div
            className={`phrase-pattern-card ${isSelected ? 'selected' : ''} ${className || ''}`}
            onClick={onSelect}
            style={{ '--phrase-band-color': bandColor } as React.CSSProperties}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={`Phrase pattern ${index + 1}: ${sizeLabel}, ${phrase.occurrences.length} occurrences, significance ${phrase.significance.toFixed(2)}`}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect();
                }
            }}
        >
            {/* Left: Index and band indicator */}
            <div className="phrase-pattern-card-index">
                <span className="phrase-pattern-card-number">{index + 1}</span>
                <div
                    className="phrase-pattern-card-band-indicator"
                    style={{ backgroundColor: bandColor }}
                    title={`${phrase.sourceBand} band`}
                />
            </div>

            {/* Center: Pattern visualization and details */}
            <div className="phrase-pattern-card-content">
                <div className="phrase-pattern-card-header">
                    <span className="phrase-pattern-card-size">{sizeLabel}</span>
                    <span className="phrase-pattern-card-band">{phrase.sourceBand}</span>
                    {phrase.hasVariation && (
                        <span className="phrase-pattern-card-badge variation">Varied</span>
                    )}
                    {phrase.availableForReuse && (
                        <span className="phrase-pattern-card-badge reusable">Reusable</span>
                    )}
                </div>

                <MiniPattern
                    beats={phrase.pattern}
                    sizeInBeats={phrase.sizeInBeats}
                    bandColor={bandColor}
                />

                <div className="phrase-pattern-card-stats">
                    <div className="phrase-pattern-card-stat">
                        <span className="phrase-pattern-card-stat-label">Occurrences</span>
                        <span className="phrase-pattern-card-stat-value">{phrase.occurrences.length}</span>
                    </div>
                    <div className="phrase-pattern-card-stat">
                        <span className="phrase-pattern-card-stat-label">Significance</span>
                        <span className="phrase-pattern-card-stat-value">
                            {phrase.significance.toFixed(2)}
                        </span>
                    </div>
                    <div className="phrase-pattern-card-stat">
                        <span className="phrase-pattern-card-stat-label">Beats</span>
                        <span className="phrase-pattern-card-stat-value">{phrase.pattern.length}</span>
                    </div>
                </div>
            </div>

            {/* Right: Selection indicator */}
            {isSelected && (
                <div className="phrase-pattern-card-selected-indicator">
                    <Layers size={16} />
                </div>
            )}
        </div>
    );
}

export default PhrasePatternCard;
