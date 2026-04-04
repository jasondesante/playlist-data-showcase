/**
 * PitchDetectionPanel Component
 *
 * Container component for displaying pitch detection results as part of
 * the Pitch & Level Generation feature (Phase 3).
 *
 * Features:
 * - Header showing pitch detection status
 * - Summary stats (voiced/unvoiced ratio, avg probability, pitch range)
 * - Composite stream pitch timeline
 * - Side panel for selected pitch details (always visible on right)
 *
 * Pitch detection runs full-spectrum on the unfiltered audio signal,
 * then links pitch results to the composite rhythm stream (the actual
 * playable beat sequence). Band streams are used only for beat iteration,
 * not for filtered audio analysis.
 */

import { useState, useMemo, useCallback } from 'react';
import { Music } from 'lucide-react';
import './PitchDetectionPanel.css';
import { cn } from '../../utils/cn';
import {
    useAllDifficultyLevels,
    useCustomDensityLevel,
    useAutoSubMode,
} from '../../store/beatDetectionStore';
import {
    useSelectedDifficulty,
} from '../../hooks/useLevelGeneration';
import type {
    PitchAtBeat,
    AllDifficultiesWithNatural,
} from '../../types/levelGeneration';
import type { PitchAlgorithm } from '../../types/rhythmGeneration';
import type { GeneratedLevel } from 'playlist-data-engine';

/** Human-readable label for each pitch algorithm value. */
const PITCH_ALGORITHM_LABELS: Record<PitchAlgorithm, string> = {
    pyin_legacy: 'pYIN (Legacy)',
    pitch_melodia: 'Pitch Melodia',
    predominant_melodia: 'Predominant Melodia',
    pitch_yin_probabilistic: 'Pitch YIN (Probabilistic)',
    multipitch_melodia: 'MultiPitch Melodia',
    multipitch_klapuri: 'MultiPitch Klapuri',
    pitch_crepe: 'CREPE (Neural Net)',
};
import { PitchTimeline } from './PitchTimeline';
import { PitchInspector, type SelectedPitchData } from './PitchInspector';
import { PitchProbabilityHistogram } from './PitchProbabilityHistogram';

// ============================================================
// Types
// ============================================================

export interface PitchDetectionPanelProps {
    /** Additional CSS class names */
    className?: string;
    /** Voicing threshold used during generation (0-1) */
    voicingThreshold?: number;
    /** Pitch detection algorithm used for generation */
    pitchAlgorithm?: PitchAlgorithm;
}

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate composite stream pitch statistics from PitchAtBeat data.
 */
function calculateCompositeStats(pitches: PitchAtBeat[] | undefined): {
    voicedCount: number;
    totalCount: number;
    avgProbability: number;
    minNote: string | null;
    maxNote: string | null;
    commonNotes: string[];
} {
    if (!pitches || pitches.length === 0) {
        return { voicedCount: 0, totalCount: 0, avgProbability: 0, minNote: null, maxNote: null, commonNotes: [] };
    }

    const voicedCount = pitches.filter(p => p.pitch?.isVoiced).length;
    const totalCount = pitches.length;
    const voicedPitches = pitches.filter(p => p.pitch?.isVoiced);
    const avgProbability = voicedPitches.length > 0
        ? voicedPitches.reduce((sum, p) => sum + p.pitch!.probability, 0) / voicedPitches.length
        : 0;

    // Find min/max notes and count occurrences
    let minNote: string | null = null;
    let maxNote: string | null = null;
    const noteCounts: Map<string, number> = new Map();

    for (const p of voicedPitches) {
        if (p.pitch?.noteName) {
            noteCounts.set(p.pitch.noteName, (noteCounts.get(p.pitch.noteName) ?? 0) + 1);
            if (!minNote || p.pitch.noteName < minNote) minNote = p.pitch.noteName;
            if (!maxNote || p.pitch.noteName > maxNote) maxNote = p.pitch.noteName;
        }
    }

    // Get the 3 most common notes
    const commonNotes = Array.from(noteCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([note]) => note);

    return { voicedCount, totalCount, avgProbability, minNote, maxNote, commonNotes };
}

/**
 * Format a probability value as a percentage.
 */
function formatProbability(prob: number): string {
    return `${Math.round(prob * 100)}%`;
}

// ============================================================
// Sub-components
// ============================================================

interface CompositeSummaryStatsProps {
    pitches: PitchAtBeat[] | undefined;
    avgProbability: number;
    pitchRange: { minNote: string; maxNote: string } | null;
}

function CompositeSummaryStats({ pitches, avgProbability, pitchRange }: CompositeSummaryStatsProps) {
    const stats = calculateCompositeStats(pitches);
    const voicedPercent = stats.totalCount > 0 ? Math.round((stats.voicedCount / stats.totalCount) * 100) : 0;

    return (
        <div className="pitch-summary-stats">
            <div className="pitch-summary-item">
                <span className="pitch-summary-value">{stats.totalCount}</span>
                <span className="pitch-summary-label">Composite Beats</span>
            </div>
            <div className="pitch-summary-item">
                <span className="pitch-summary-value pitch-voiced-percent">{voicedPercent}%</span>
                <span className="pitch-summary-label">Voiced</span>
            </div>
            <div className="pitch-summary-item">
                <span className="pitch-summary-value pitch-probability">{formatProbability(avgProbability)}</span>
                <span className="pitch-summary-label">Avg Probability</span>
            </div>
            {pitchRange && (
                <div className="pitch-summary-item pitch-summary-range">
                    <span className="pitch-summary-value">{pitchRange.minNote} - {pitchRange.maxNote}</span>
                    <span className="pitch-summary-label">Pitch Range</span>
                </div>
            )}
        </div>
    );
}

interface CompositePitchDetailProps {
    pitches: PitchAtBeat[] | undefined;
}

function CompositePitchDetail({ pitches }: CompositePitchDetailProps) {
    const stats = calculateCompositeStats(pitches);

    if (stats.totalCount === 0) {
        return null;
    }

    return (
        <div className="pitch-composite-detail">
            {stats.minNote && stats.maxNote && (
                <div className="pitch-band-notes">
                    <span className="pitch-band-note-label">Range:</span>
                    <span className="pitch-band-note-value">{stats.minNote} - {stats.maxNote}</span>
                </div>
            )}
            {stats.commonNotes.length > 0 && (
                <div className="pitch-band-common-notes">
                    <span className="pitch-band-note-label">Common Notes:</span>
                    <div className="pitch-band-common-notes-list">
                        {stats.commonNotes.map((note) => (
                            <span key={note} className="pitch-band-common-note">
                                {note}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function PitchDetectionPanel({ className, voicingThreshold = 0.2, pitchAlgorithm = 'pitch_melodia' }: PitchDetectionPanelProps) {
    // Get data from store
    const allDifficulties = useAllDifficultyLevels();
    const customDensityLevel = useCustomDensityLevel();
    const autoSubMode = useAutoSubMode();
    const selectedDifficulty = useSelectedDifficulty();
    const isDensityMode = autoSubMode === 'customDensity';

    // Get pitch analysis from the active level (preset or density)
    const pitchAnalysis = useMemo(() => {
        if (isDensityMode) return customDensityLevel?.pitchAnalysis ?? null;
        const levels = allDifficulties as AllDifficultiesWithNatural | null;
        const level = levels?.[selectedDifficulty as keyof AllDifficultiesWithNatural] as GeneratedLevel | undefined;
        return level?.pitchAnalysis ?? null;
    }, [isDensityMode, customDensityLevel, allDifficulties, selectedDifficulty]);

    // State for selected pitch
    const [selectedPitch, setSelectedPitch] = useState<SelectedPitchData | null>(null);

    // Get pitches from the analysis (pitchByBeat contains variant pitches for gameplay)
    const compositePitches = useMemo((): PitchAtBeat[] => {
        if (!pitchAnalysis?.pitchByBeat) return [];
        const pb = pitchAnalysis.pitchByBeat;
        if (Array.isArray(pb)) return pb;
        return [];
    }, [pitchAnalysis]);

    // Calculate overall stats from composite pitches
    const overallStats = useMemo(() => {
        if (!pitchAnalysis) {
            return {
                totalBeats: 0,
                voicedBeats: 0,
                avgProbability: 0,
                pitchRange: null,
            };
        }

        const totalBeats = compositePitches.length;
        const voicedBeats = compositePitches.filter(p => p.pitch?.isVoiced).length;
        const avgProbability = voicedBeats > 0
            ? compositePitches.filter(p => p.pitch?.isVoiced).reduce((sum, p) => sum + p.pitch!.probability, 0) / voicedBeats
            : 0;

        const stats = calculateCompositeStats(compositePitches);
        const pitchRange = stats.minNote && stats.maxNote
            ? { minNote: stats.minNote, maxNote: stats.maxNote }
            : null;

        return { totalBeats, voicedBeats, avgProbability, pitchRange };
    }, [pitchAnalysis, compositePitches]);

    // Handle pitch selection
    const handleSelectPitch = useCallback((pitch: PitchAtBeat) => {
        setSelectedPitch({
            beatIndex: pitch.beatIndex,
            timestamp: pitch.timestamp,
            pitch: pitch.pitch,
            direction: pitch.direction,
            intervalFromPrevious: pitch.intervalFromPrevious,
            intervalCategory: pitch.intervalCategory as any,
        });
    }, []);

    // Don't render if no pitch analysis available
    if (!pitchAnalysis) {
        return (
            <div className={cn('pitch-detection-panel', 'pitch-detection-panel-empty', className)}>
                <div className="pitch-panel-header">
                    <Music size={20} className="pitch-panel-icon" />
                    <h3 className="pitch-panel-title">Pitch Detection</h3>
                </div>
                <div className="pitch-panel-empty-content">
                    <p>No pitch analysis available.</p>
                    <p className="pitch-panel-empty-hint">
                        Pitch detection runs automatically during level generation.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cn('pitch-detection-panel', className)}>
            {/* Main Content Area */}
            <div className="pitch-panel-main">
                {/* Header */}
                <div className="pitch-panel-header">
                    <Music size={20} className="pitch-panel-icon" />
                    <h3 className="pitch-panel-title">Pitch Detection</h3>
                </div>

                {/* Description */}
                <p className="pitch-panel-description">
                    Pitch detected on the <strong>full unfiltered audio signal</strong> using
                    <strong> {PITCH_ALGORITHM_LABELS[pitchAlgorithm]}</strong>, then linked directly to the <strong>composite rhythm
                    stream</strong> — the actual beat sequence used for gameplay. Band streams are used only
                    for beat iteration, not for filtered audio analysis.
                </p>

                {/* Summary Stats */}
                <CompositeSummaryStats
                    pitches={compositePitches}
                    avgProbability={overallStats.avgProbability}
                    pitchRange={overallStats.pitchRange}
                />

                {/* Composite Pitch Detail */}
                <CompositePitchDetail pitches={compositePitches} />

                {/* Probability Distribution Histogram */}
                <div className="pitch-histogram-section">
                    <PitchProbabilityHistogram
                        pitches={compositePitches}
                        voicingThreshold={voicingThreshold}
                        binCount={10}
                        height={140}
                    />
                </div>

                {/* Pitch Timeline */}
                <div className="pitch-timeline-section">
                    <h4 className="pitch-timeline-title">
                        Pitch Timeline
                        <span className="pitch-timeline-band-label">
                            (composite stream)
                        </span>
                    </h4>
                    <PitchTimeline
                        pitches={compositePitches}
                        onPitchClick={handleSelectPitch}
                        selectedPitchIndex={selectedPitch?.beatIndex}
                        anticipationWindow={3.0}
                        pastWindow={3.0}
                    />
                </div>
            </div>

            {/* Side Panel - Pitch Inspector */}
            <PitchInspector
                selectedPitch={selectedPitch}
            />
        </div>
    );
}

export default PitchDetectionPanel;
