/**
 * DominantBandSelector Component (Task 4.3)
 *
 * Visual comparison of all bands with scores for selecting the dominant band.
 * Shows scoring metrics:
 * - Average probability (70% weight)
 * - Voiced/total ratio (30% weight)
 * Highlights the winner with explanation.
 * Displays as horizontal bar comparison.
 *
 * The dominant band is selected by the pitch analysis engine based on:
 * - Higher average pitch probability across beats
 * - Higher ratio of voiced (pitch-detected) beats to total beats
 */

import { useMemo } from 'react';
import { Trophy, Info } from 'lucide-react';
import './DominantBandSelector.css';
import { BAND_COLORS, BAND_RANGES, type Band } from './BandPitchTimeline';
import type { BandPitchAtBeat } from '../../types/levelGeneration';
import { cn } from '../../utils/cn';

// ============================================================
// Types
// ============================================================

export interface DominantBandSelectorProps {
    /** Band pitch data from the pitch analysis */
    bandPitches: Map<string, BandPitchAtBeat> | Record<string, BandPitchAtBeat> | null;
    /** The dominant band determined by the engine */
    dominantBand?: Band | null;
    /** Additional CSS class names */
    className?: string;
}

/** Band scoring details */
interface BandScore {
    band: Band;
    avgProbability: number;
    voicedRatio: number;
    weightedScore: number;
    voicedCount: number;
    totalCount: number;
}

// ============================================================
// Constants
// ============================================================

/** Weight for average probability in scoring (70%) */
const PROBABILITY_WEIGHT = 0.7;

/** Weight for voiced ratio in scoring (30%) */
const VOICED_RATIO_WEIGHT = 0.3;

/** Bands in display order */
const BANDS: Band[] = ['low', 'mid', 'high'];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Normalize bandPitches from potential object to Map
 */
function normalizeBandPitches(
    bandPitches: Map<string, BandPitchAtBeat> | Record<string, BandPitchAtBeat> | null
): Map<Band, BandPitchAtBeat> {
    const map = new Map<Band, BandPitchAtBeat>();

    if (!bandPitches) return map;

    if (bandPitches instanceof Map) {
        bandPitches.forEach((value, key) => {
            map.set(key as Band, value);
        });
    } else {
        Object.entries(bandPitches).forEach(([key, value]) => {
            map.set(key as Band, value);
        });
    }

    return map;
}

/**
 * Calculate weighted score for a band
 * Score = (avgProbability * 0.7) + (voicedRatio * 0.3)
 */
function calculateBandScore(bandData: BandPitchAtBeat | undefined): {
    avgProbability: number;
    voicedRatio: number;
    weightedScore: number;
    voicedCount: number;
    totalCount: number;
} {
    if (!bandData) {
        return {
            avgProbability: 0,
            voicedRatio: 0,
            weightedScore: 0,
            voicedCount: 0,
            totalCount: 0,
        };
    }

    const avgProbability = bandData.avgProbability;
    const voicedRatio = bandData.totalBeatCount > 0
        ? bandData.voicedBeatCount / bandData.totalBeatCount
        : 0;
    const weightedScore = (avgProbability * PROBABILITY_WEIGHT) + (voicedRatio * VOICED_RATIO_WEIGHT);

    return {
        avgProbability,
        voicedRatio,
        weightedScore,
        voicedCount: bandData.voicedBeatCount,
        totalCount: bandData.totalBeatCount,
    };
}

/**
 * Format a score as percentage
 */
function formatPercent(value: number): string {
    return `${Math.round(value * 100)}%`;
}

// ============================================================
// Sub-components
// ============================================================

interface BandScoreBarProps {
    band: Band;
    score: BandScore;
    isWinner: boolean;
    maxScore: number;
}

function BandScoreBar({ band, score, isWinner, maxScore }: BandScoreBarProps) {
    const color = BAND_COLORS[band];
    const range = BAND_RANGES[band];
    const barWidth = maxScore > 0 ? (score.weightedScore / maxScore) * 100 : 0;

    return (
        <div
            className={cn(
                'dominant-band-score-bar',
                isWinner && 'dominant-band-score-bar--winner'
            )}
        >
            {/* Band label */}
            <div className="dominant-band-label">
                <div
                    className="dominant-band-marker"
                    style={{ backgroundColor: color }}
                />
                <span className="dominant-band-name">
                    {band.charAt(0).toUpperCase() + band.slice(1)}
                </span>
                <span className="dominant-band-range">{range}</span>
                {isWinner && (
                    <span className="dominant-band-winner-badge" title="Selected as dominant band">
                        <Trophy size={12} />
                    </span>
                )}
            </div>

            {/* Score bar container */}
            <div className="dominant-bar-container">
                <div
                    className="dominant-bar-fill"
                    style={{
                        width: `${barWidth}%`,
                        backgroundColor: color,
                    }}
                />
                <div className="dominant-bar-score">
                    {formatPercent(score.weightedScore)}
                </div>
            </div>

            {/* Score breakdown */}
            <div className="dominant-score-breakdown">
                <div className="dominant-score-item">
                    <span className="dominant-score-label">Avg Prob</span>
                    <span
                        className={cn(
                            'dominant-score-value',
                            score.avgProbability >= 0.7 && 'dominant-score-value--high',
                            score.avgProbability < 0.5 && 'dominant-score-value--low'
                        )}
                    >
                        {formatPercent(score.avgProbability)}
                    </span>
                    <span className="dominant-score-weight">(70%)</span>
                </div>
                <div className="dominant-score-item">
                    <span className="dominant-score-label">Voiced</span>
                    <span
                        className={cn(
                            'dominant-score-value',
                            score.voicedRatio >= 0.7 && 'dominant-score-value--high',
                            score.voicedRatio < 0.5 && 'dominant-score-value--low'
                        )}
                    >
                        {score.voicedCount}/{score.totalCount}
                    </span>
                    <span className="dominant-score-weight">(30%)</span>
                </div>
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function DominantBandSelector({
    bandPitches: bandPitchesProp,
    dominantBand,
    className,
}: DominantBandSelectorProps) {
    // Normalize band pitches to Map
    const bandPitchesMap = useMemo(
        () => normalizeBandPitches(bandPitchesProp),
        [bandPitchesProp]
    );

    // Calculate scores for all bands
    const bandScores = useMemo((): BandScore[] => {
        return BANDS.map((band) => {
            const bandData = bandPitchesMap.get(band);
            const scoreData = calculateBandScore(bandData);
            return {
                band,
                ...scoreData,
            };
        });
    }, [bandPitchesMap]);

    // Find max score for scaling bars
    const maxScore = useMemo(() => {
        return Math.max(...bandScores.map((s) => s.weightedScore), 0.01);
    }, [bandScores]);

    // Check if we have any data
    const hasData = bandScores.some((s) => s.totalCount > 0);

    // Empty state
    if (!hasData) {
        return (
            <div className={cn('dominant-band-selector', 'dominant-band-selector--empty', className)}>
                <div className="dominant-band-header">
                    <div className="dominant-band-title">
                        <Trophy size={16} />
                        <span>Dominant Band Selection</span>
                    </div>
                </div>
                <div className="dominant-band-empty-content">
                    <p>No pitch data available for band selection</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('dominant-band-selector', className)}>
            {/* Header */}
            <div className="dominant-band-header">
                <div className="dominant-band-title">
                    <Trophy size={16} />
                    <span>Dominant Band Selection</span>
                </div>
                {dominantBand && (
                    <div className="dominant-band-winner">
                        <span className="dominant-band-winner-label">Selected:</span>
                        <span
                            className="dominant-band-winner-name"
                            style={{ color: BAND_COLORS[dominantBand] }}
                        >
                            {dominantBand.charAt(0).toUpperCase() + dominantBand.slice(1)}
                        </span>
                    </div>
                )}
            </div>

            {/* Scoring explanation */}
            <div className="dominant-band-explanation">
                <Info size={12} />
                <p>
                    The dominant band is selected based on a weighted score combining
                    average pitch probability ({Math.round(PROBABILITY_WEIGHT * 100)}% weight)
                    and voiced beat ratio ({Math.round(VOICED_RATIO_WEIGHT * 100)}% weight).
                </p>
            </div>

            {/* Score bars for each band */}
            <div className="dominant-band-scores">
                {bandScores.map((score) => (
                    <BandScoreBar
                        key={score.band}
                        band={score.band}
                        score={score}
                        isWinner={dominantBand === score.band}
                        maxScore={maxScore}
                    />
                ))}
            </div>

            {/* Winner explanation */}
            {dominantBand && (
                <div className="dominant-band-winner-explanation">
                    <p>
                        The <strong style={{ color: BAND_COLORS[dominantBand] }}>
                            {dominantBand.charAt(0).toUpperCase() + dominantBand.slice(1)}
                        </strong> band was selected because it has the highest combined score,
                        indicating more reliable pitch detection results for melody analysis.
                    </p>
                </div>
            )}
        </div>
    );
}

export default DominantBandSelector;
