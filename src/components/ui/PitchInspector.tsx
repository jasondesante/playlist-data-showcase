/**
 * PitchInspector Component
 *
 * A fixed side panel that displays detailed information about a selected pitch.
 * Always visible on the right side of the PitchDetectionPanel.
 *
 * Features:
 * - Timestamp and beat index
 * - Frequency (Hz) and note name (e.g., "C4")
 * - Probability/confidence score with color coding
 * - Is voiced boolean
 * - MIDI note number
 * - Interval from previous beat (semitones and category)
 *
 * Task 3.4: PitchInspector Component (Side Panel)
 */

import { Music, TrendingUp, TrendingDown, Minus, Circle } from 'lucide-react';
import './PitchInspector.css';
import { cn } from '../../utils/cn';
import type { PitchResult, IntervalCategory } from '../../types/levelGeneration';

// ============================================================
// Types
// ============================================================

/** Selected pitch data for the inspector */
export interface SelectedPitchData {
    /** Beat index in the stream */
    beatIndex: number;
    /** Timestamp in seconds */
    timestamp: number;
    /** The pitch result (null if no pitch detected) */
    pitch: PitchResult | null;
    /** Direction of pitch change from previous beat */
    direction: 'up' | 'down' | 'stable' | 'none';
    /** Interval in semitones from previous beat */
    intervalFromPrevious: number;
    /** Categorized interval */
    intervalCategory?: IntervalCategory;
}

export interface PitchInspectorProps {
    /** The currently selected pitch (null if none selected) */
    selectedPitch: SelectedPitchData | null;
    /** Additional CSS class names */
    className?: string;
}

// ============================================================
// Constants
// ============================================================

/** Interval category display names and descriptions */
const INTERVAL_CATEGORY_INFO: Record<IntervalCategory, { label: string; description: string }> = {
    unison: { label: 'Unison', description: 'Same note (0 semitones)' },
    small: { label: 'Small', description: '1-2 semitones (minor/major 2nd)' },
    medium: { label: 'Medium', description: '3-4 semitones (minor/major 3rd)' },
    large: { label: 'Large', description: '5-7 semitones (4th/5th/tritone)' },
    very_large: { label: 'Very Large', description: '8+ semitones (6th or larger)' },
};

// ============================================================
// Helper Functions
// ============================================================

/**
 * Get direction icon component.
 */
function getDirectionIcon(direction: string): React.ReactNode {
    switch (direction) {
        case 'up':
            return <TrendingUp size={14} className="pitch-direction-icon pitch-direction-up" />;
        case 'down':
            return <TrendingDown size={14} className="pitch-direction-icon pitch-direction-down" />;
        case 'stable':
            return <Minus size={14} className="pitch-direction-icon pitch-direction-stable" />;
        default:
            return <Circle size={14} className="pitch-direction-icon pitch-direction-none" />;
    }
}

/**
 * Format a probability value as a percentage.
 */
function formatProbability(prob: number): string {
    return `${Math.round(prob * 100)}%`;
}

/**
 * Format timestamp with milliseconds for precision.
 */
function formatTimestampPrecise(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toFixed(2).padStart(5, '0')}`;
}

// ============================================================
// Main Component
// ============================================================

export function PitchInspector({
    selectedPitch,
    className,
}: PitchInspectorProps) {
    // Empty state - no pitch selected
    if (!selectedPitch) {
        return (
            <div className={cn('pitch-inspector', 'pitch-inspector--empty', className)}>
                <div className="pitch-inspector__header">
                    <Music size={16} />
                    <span>Pitch Inspector</span>
                </div>
                <div className="pitch-inspector__content">
                    <p className="pitch-inspector__placeholder">
                        Click on a pitch in the timeline to view details
                    </p>
                </div>
            </div>
        );
    }

    const { beatIndex, timestamp, pitch, direction, intervalFromPrevious, intervalCategory } = selectedPitch;

    // Get interval category info
    const categoryInfo = intervalCategory ? INTERVAL_CATEGORY_INFO[intervalCategory] : null;

    return (
        <div className={cn('pitch-inspector', className)}>
            <div className="pitch-inspector__header">
                <Music size={16} />
                <span>Pitch Inspector</span>
            </div>
            <div className="pitch-inspector__content">
                {/* Beat Information */}
                <div className="pitch-inspector__section">
                    <div className="pitch-inspector__row">
                        <span className="pitch-inspector__label">Beat Index</span>
                        <span className="pitch-inspector__value pitch-inspector__value--mono">
                            #{beatIndex}
                        </span>
                    </div>
                    <div className="pitch-inspector__row">
                        <span className="pitch-inspector__label">Timestamp</span>
                        <span className="pitch-inspector__value pitch-inspector__value--mono">
                            {formatTimestampPrecise(timestamp)}
                        </span>
                    </div>
                </div>

                <div className="pitch-inspector__divider" />

                {pitch ? (
                    <>
                        {/* Pitch Information */}
                        <div className="pitch-inspector__section">
                            <div className="pitch-inspector__row pitch-inspector__row--highlight">
                                <span className="pitch-inspector__label">Note</span>
                                <span className="pitch-inspector__value pitch-inspector__note-name">
                                    {pitch.noteName ?? 'N/A'}
                                </span>
                            </div>
                            <div className="pitch-inspector__row">
                                <span className="pitch-inspector__label">Frequency</span>
                                <span className="pitch-inspector__value pitch-inspector__value--mono">
                                    {pitch.frequency > 0 ? `${pitch.frequency.toFixed(1)} Hz` : 'N/A'}
                                </span>
                            </div>
                            <div className="pitch-inspector__row">
                                <span className="pitch-inspector__label">MIDI Note</span>
                                <span className="pitch-inspector__value pitch-inspector__value--mono">
                                    {pitch.midiNote ?? 'N/A'}
                                </span>
                            </div>
                            <div className="pitch-inspector__row">
                                <span className="pitch-inspector__label">Probability</span>
                                <span className={cn(
                                    'pitch-inspector__value',
                                    'pitch-inspector__probability',
                                    pitch.probability > 0.8 ? 'pitch-inspector__probability--high' :
                                    pitch.probability > 0.5 ? 'pitch-inspector__probability--medium' :
                                    'pitch-inspector__probability--low'
                                )}>
                                    {formatProbability(pitch.probability)}
                                </span>
                            </div>
                            <div className="pitch-inspector__row">
                                <span className="pitch-inspector__label">Voiced</span>
                                <span className={cn(
                                    'pitch-inspector__value',
                                    'pitch-inspector__voiced',
                                    pitch.isVoiced ? 'pitch-inspector__voiced--yes' : 'pitch-inspector__voiced--no'
                                )}>
                                    {pitch.isVoiced ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>

                        <div className="pitch-inspector__divider" />

                        {/* Melody Information */}
                        <div className="pitch-inspector__section">
                            <div className="pitch-inspector__row">
                                <span className="pitch-inspector__label">Direction</span>
                                <span className="pitch-inspector__value pitch-inspector__direction">
                                    {getDirectionIcon(direction)}
                                    <span className="pitch-inspector__direction-label">{direction}</span>
                                </span>
                            </div>
                            <div className="pitch-inspector__row">
                                <span className="pitch-inspector__label">Interval</span>
                                <span className="pitch-inspector__value pitch-inspector__value--mono">
                                    {intervalFromPrevious > 0 ? '+' : ''}{intervalFromPrevious} semitones
                                </span>
                            </div>
                            {categoryInfo && (
                                <div className="pitch-inspector__row pitch-inspector__row--category">
                                    <span className="pitch-inspector__label">Category</span>
                                    <div className="pitch-inspector__category">
                                        <span className={cn(
                                            'pitch-inspector__category-badge',
                                            `pitch-inspector__category-badge--${intervalCategory}`
                                        )}>
                                            {categoryInfo.label}
                                        </span>
                                        <span className="pitch-inspector__category-description">
                                            {categoryInfo.description}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="pitch-inspector__no-pitch">
                        <Circle size={24} className="pitch-inspector__no-pitch-icon" />
                        <p>No pitch detected at this beat</p>
                        <span className="pitch-inspector__no-pitch-hint">
                            The audio at this timestamp did not have a detectable fundamental frequency.
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PitchInspector;
