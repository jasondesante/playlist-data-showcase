/**
 * PitchDetectionPanel Component
 *
 * Container component for displaying pitch detection results as part of
 * the Pitch & Level Generation feature (Phase 3).
 *
 * Features:
 * - Header showing dominant band selection
 * - Summary stats (voiced/unvoiced ratio, avg probability, pitch range)
 * - Band breakdown cards (Low/Mid/High bands with stats)
 * - Side panel for selected pitch details (always visible on right)
 *
 * Task 3.1: Create PitchDetectionPanel Component
 */

import { useState, useMemo, useCallback } from 'react';
import { Music, TrendingUp, TrendingDown, Minus, Circle, Star } from 'lucide-react';
import './PitchDetectionPanel.css';
import { cn } from '../../utils/cn';
import {
    useAllDifficultyLevels,
} from '../../store/beatDetectionStore';
import {
    useSelectedDifficulty,
} from '../../hooks/useLevelGeneration';
import type {
    PitchAtBeat,
    BandPitchAtBeat,
    PitchResult,
    AllDifficultiesWithNatural,
} from '../../types/levelGeneration';
import type { GeneratedLevel } from 'playlist-data-engine';

// ============================================================
// Types
// ============================================================

export interface PitchDetectionPanelProps {
    /** Additional CSS class names */
    className?: string;
}

/** Band name type from the engine */
type PitchBandName = 'low' | 'mid' | 'high';

/** Selected pitch data for the inspector */
interface SelectedPitch {
    beatIndex: number;
    timestamp: number;
    band: PitchBandName;
    pitch: PitchResult | null;
    direction: string;
    intervalFromPrevious: number;
}

/** Band configuration for display */
interface BandConfig {
    name: PitchBandName;
    label: string;
    frequencyRange: string;
    color: string;
}

// ============================================================
// Constants
// ============================================================

const BAND_CONFIGS: BandConfig[] = [
    { name: 'low', label: 'Low', frequencyRange: '20-500Hz', color: 'blue' },
    { name: 'mid', label: 'Mid', frequencyRange: '500-2kHz', color: 'green' },
    { name: 'high', label: 'High', frequencyRange: '2k-20kHz', color: 'orange' },
];

// ============================================================
// Helper Functions
// ============================================================

/**
 * Calculate band statistics from BandPitchAtBeat data.
 */
function calculateBandStats(bandData: BandPitchAtBeat | undefined): {
    voicedCount: number;
    totalCount: number;
    avgProbability: number;
    minNote: string | null;
    maxNote: string | null;
} {
    if (!bandData) {
        return { voicedCount: 0, totalCount: 0, avgProbability: 0, minNote: null, maxNote: null };
    }

    const voicedCount = bandData.voicedBeatCount;
    const totalCount = bandData.totalBeatCount;
    const avgProbability = bandData.avgProbability;

    // Find min/max notes from pitches
    let minNote: string | null = null;
    let maxNote: string | null = null;
    const notes: string[] = [];

    bandData.pitches.forEach(p => {
        if (p.pitch?.noteName) {
            notes.push(p.pitch.noteName);
        }
    });

    if (notes.length > 0) {
        // Simple alphabetical sort works for note names (A#4 > A4 > G#4 > G4)
        notes.sort();
        minNote = notes[0];
        maxNote = notes[notes.length - 1];
    }

    return { voicedCount, totalCount, avgProbability, minNote, maxNote };
}

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
 * Format a timestamp in seconds.
 */
function formatTimestamp(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================================
// Sub-components
// ============================================================

interface SummaryStatsProps {
    totalBeats: number;
    voicedBeats: number;
    dominantBand: PitchBandName | null;
    avgProbability: number;
    pitchRange: { minNote: string; maxNote: string } | null;
}

function SummaryStats({ totalBeats, voicedBeats, dominantBand, avgProbability, pitchRange }: SummaryStatsProps) {
    const voicedPercent = totalBeats > 0 ? Math.round((voicedBeats / totalBeats) * 100) : 0;
    const dominantBandLabel = BAND_CONFIGS.find(b => b.name === dominantBand)?.label ?? 'N/A';

    return (
        <div className="pitch-summary-stats">
            <div className="pitch-summary-item">
                <span className="pitch-summary-value">{totalBeats}</span>
                <span className="pitch-summary-label">Total Beats</span>
            </div>
            <div className="pitch-summary-item">
                <span className="pitch-summary-value pitch-voiced-percent">{voicedPercent}%</span>
                <span className="pitch-summary-label">Voiced</span>
            </div>
            <div className="pitch-summary-item">
                <span className="pitch-summary-value pitch-probability">{formatProbability(avgProbability)}</span>
                <span className="pitch-summary-label">Avg Probability</span>
            </div>
            <div className="pitch-summary-item pitch-summary-dominant">
                <span className="pitch-summary-value">
                    {dominantBandLabel}
                    {dominantBand && <Star size={12} className="pitch-dominant-star" />}
                </span>
                <span className="pitch-summary-label">Dominant Band</span>
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

interface BandBreakdownCardProps {
    band: BandConfig;
    bandData: BandPitchAtBeat | undefined;
    isDominant: boolean;
    onSelectBand: (band: PitchBandName) => void;
    isSelected: boolean;
}

function BandBreakdownCard({ band, bandData, isDominant, onSelectBand, isSelected }: BandBreakdownCardProps) {
    const stats = calculateBandStats(bandData);
    const voicedPercent = stats.totalCount > 0 ? Math.round((stats.voicedCount / stats.totalCount) * 100) : 0;

    return (
        <div
            className={cn(
                'pitch-band-card',
                `pitch-band-${band.color}`,
                isDominant && 'pitch-band-dominant',
                isSelected && 'pitch-band-selected'
            )}
            onClick={() => onSelectBand(band.name)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onSelectBand(band.name)}
            aria-label={`${band.label} band: ${stats.voicedCount} voiced beats, ${formatProbability(stats.avgProbability)} average probability`}
        >
            <div className="pitch-band-header">
                <span className="pitch-band-name">{band.label}</span>
                <span className="pitch-band-range">{band.frequencyRange}</span>
                {isDominant && (
                    <span className="pitch-band-badge" aria-label="Dominant band">
                        <Star size={10} />
                    </span>
                )}
            </div>
            <div className="pitch-band-stats">
                <div className="pitch-band-stat">
                    <span className="pitch-band-stat-value">{stats.voicedCount}</span>
                    <span className="pitch-band-stat-label">Voiced</span>
                </div>
                <div className="pitch-band-stat">
                    <span className="pitch-band-stat-value">{voicedPercent}%</span>
                    <span className="pitch-band-stat-label">Ratio</span>
                </div>
                <div className="pitch-band-stat">
                    <span className="pitch-band-stat-value">{formatProbability(stats.avgProbability)}</span>
                    <span className="pitch-band-stat-label">Avg Prob</span>
                </div>
            </div>
            {stats.minNote && stats.maxNote && (
                <div className="pitch-band-notes">
                    <span className="pitch-band-note-label">Range:</span>
                    <span className="pitch-band-note-value">{stats.minNote} - {stats.maxNote}</span>
                </div>
            )}
        </div>
    );
}

interface PitchInspectorProps {
    selectedPitch: SelectedPitch | null;
    selectedBand: PitchBandName;
}

function PitchInspector({ selectedPitch, selectedBand }: PitchInspectorProps) {
    const bandConfig = BAND_CONFIGS.find(b => b.name === selectedBand);

    if (!selectedPitch) {
        return (
            <div className="pitch-inspector pitch-inspector-empty">
                <div className="pitch-inspector-header">
                    <Music size={16} />
                    <span>Pitch Inspector</span>
                </div>
                <div className="pitch-insicator-content">
                    <p className="pitch-inspector-placeholder">
                        Click on a pitch in the timeline to view details
                    </p>
                    <div className="pitch-inspector-band-indicator">
                        <span className={cn('pitch-band-dot', `pitch-band-dot-${selectedBand}`)} />
                        <span>Viewing {bandConfig?.label} band</span>
                    </div>
                </div>
            </div>
        );
    }

    const { beatIndex, timestamp, pitch, direction, intervalFromPrevious } = selectedPitch;

    return (
        <div className="pitch-inspector">
            <div className="pitch-inspector-header">
                <Music size={16} />
                <span>Pitch Inspector</span>
            </div>
            <div className="pitch-inspector-content">
                <div className="pitch-inspector-row">
                    <span className="pitch-inspector-label">Beat Index</span>
                    <span className="pitch-inspector-value">{beatIndex}</span>
                </div>
                <div className="pitch-inspector-row">
                    <span className="pitch-inspector-label">Timestamp</span>
                    <span className="pitch-inspector-value">{formatTimestamp(timestamp)}</span>
                </div>

                <div className="pitch-inspector-divider" />

                {pitch ? (
                    <>
                        <div className="pitch-inspector-row">
                            <span className="pitch-inspector-label">Note</span>
                            <span className="pitch-inspector-value pitch-note-name">
                                {pitch.noteName ?? 'N/A'}
                            </span>
                        </div>
                        <div className="pitch-inspector-row">
                            <span className="pitch-inspector-label">Frequency</span>
                            <span className="pitch-inspector-value">
                                {pitch.frequency > 0 ? `${pitch.frequency.toFixed(1)} Hz` : 'N/A'}
                            </span>
                        </div>
                        <div className="pitch-inspector-row">
                            <span className="pitch-inspector-label">MIDI Note</span>
                            <span className="pitch-inspector-value">
                                {pitch.midiNote ?? 'N/A'}
                            </span>
                        </div>
                        <div className="pitch-inspector-row">
                            <span className="pitch-inspector-label">Probability</span>
                            <span className={cn(
                                'pitch-inspector-value',
                                'pitch-probability-badge',
                                pitch.probability > 0.8 ? 'pitch-prob-high' :
                                pitch.probability > 0.5 ? 'pitch-prob-medium' : 'pitch-prob-low'
                            )}>
                                {formatProbability(pitch.probability)}
                            </span>
                        </div>
                        <div className="pitch-inspector-row">
                            <span className="pitch-inspector-label">Voiced</span>
                            <span className={cn(
                                'pitch-inspector-value',
                                'pitch-voiced-badge',
                                pitch.isVoiced ? 'pitch-voiced-yes' : 'pitch-voiced-no'
                            )}>
                                {pitch.isVoiced ? 'Yes' : 'No'}
                            </span>
                        </div>

                        <div className="pitch-inspector-divider" />

                        <div className="pitch-inspector-row">
                            <span className="pitch-inspector-label">Direction</span>
                            <span className="pitch-inspector-value pitch-direction-value">
                                {getDirectionIcon(direction)}
                                <span>{direction}</span>
                            </span>
                        </div>
                        <div className="pitch-inspector-row">
                            <span className="pitch-inspector-label">Interval</span>
                            <span className="pitch-inspector-value">
                                {intervalFromPrevious > 0 ? '+' : ''}{intervalFromPrevious} semitones
                            </span>
                        </div>
                    </>
                ) : (
                    <div className="pitch-inspector-no-pitch">
                        <Circle size={24} className="pitch-no-pitch-icon" />
                        <p>No pitch detected at this beat</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================
// Main Component
// ============================================================

export function PitchDetectionPanel({ className }: PitchDetectionPanelProps) {
    // Get data from store
    const allDifficulties = useAllDifficultyLevels();
    const selectedDifficulty = useSelectedDifficulty();

    // Get pitch analysis from the selected difficulty level
    const pitchAnalysis = useMemo(() => {
        const levels = allDifficulties as AllDifficultiesWithNatural | null;
        const level = levels?.[selectedDifficulty as keyof AllDifficultiesWithNatural] as GeneratedLevel | undefined;
        return level?.pitchAnalysis ?? null;
    }, [allDifficulties, selectedDifficulty]);

    // State for selected band and pitch
    const [selectedBand, setSelectedBand] = useState<PitchBandName>('mid');
    const [selectedPitch, setSelectedPitch] = useState<SelectedPitch | null>(null);

    // Extract band data from pitch analysis
    const bandDataMap = useMemo((): Map<PitchBandName, BandPitchAtBeat> => {
        if (!pitchAnalysis?.bandPitches) return new Map<PitchBandName, BandPitchAtBeat>();

        // Convert the Map if it's a plain object (from serialization)
        if (pitchAnalysis.bandPitches instanceof Map) {
            return pitchAnalysis.bandPitches as Map<PitchBandName, BandPitchAtBeat>;
        }

        // Handle case where Map was serialized as object
        const map = new Map<PitchBandName, BandPitchAtBeat>();
        const bandPitches = pitchAnalysis.bandPitches as Record<string, BandPitchAtBeat>;
        if (bandPitches) {
            Object.entries(bandPitches).forEach(([key, value]: [string, BandPitchAtBeat]) => {
                map.set(key as PitchBandName, value);
            });
        }
        return map;
    }, [pitchAnalysis]);

    // Get dominant band from analysis
    const dominantBand = (pitchAnalysis?.dominantBand as PitchBandName) ?? null;

    // Calculate overall stats
    const overallStats = useMemo(() => {
        if (!pitchAnalysis) {
            return {
                totalBeats: 0,
                voicedBeats: 0,
                avgProbability: 0,
                pitchRange: null,
            };
        }

        // Get stats from metadata
        const totalBeats = pitchAnalysis.metadata?.totalBeats ?? pitchAnalysis.pitchByBeat?.length ?? 0;
        const voicedBeats = pitchAnalysis.metadata?.voicedBeats ?? 0;

        // Calculate average probability from band data
        let totalProb = 0;
        let probCount = 0;
        bandDataMap.forEach((bandData) => {
            if (bandData.avgProbability > 0) {
                totalProb += bandData.avgProbability;
                probCount++;
            }
        });
        const avgProbability = probCount > 0 ? totalProb / probCount : 0;

        // Get pitch range
        let pitchRange: { minNote: string; maxNote: string } | null = null;
        if (dominantBand) {
            const dominantData = bandDataMap.get(dominantBand);
            const stats = calculateBandStats(dominantData);
            if (stats.minNote && stats.maxNote) {
                pitchRange = { minNote: stats.minNote, maxNote: stats.maxNote };
            }
        }

        return { totalBeats, voicedBeats, avgProbability, pitchRange };
    }, [pitchAnalysis, bandDataMap, dominantBand]);

    // Get pitches for selected band
    const selectedBandPitches = useMemo((): PitchAtBeat[] => {
        const bandData = bandDataMap.get(selectedBand);
        return bandData?.pitches ?? [];
    }, [bandDataMap, selectedBand]);

    // Handle band selection
    const handleSelectBand = useCallback((band: PitchBandName) => {
        setSelectedBand(band);
        setSelectedPitch(null); // Clear selected pitch when changing bands
    }, []);

    // Handle pitch selection (will be connected to timeline in Task 3.2)
    const handleSelectPitch = useCallback((pitch: PitchAtBeat) => {
        setSelectedPitch({
            beatIndex: pitch.beatIndex,
            timestamp: pitch.timestamp,
            band: pitch.band as PitchBandName,
            pitch: pitch.pitch,
            direction: pitch.direction,
            intervalFromPrevious: pitch.intervalFromPrevious,
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

                {/* Summary Stats */}
                <SummaryStats
                    totalBeats={overallStats.totalBeats}
                    voicedBeats={overallStats.voicedBeats}
                    dominantBand={dominantBand}
                    avgProbability={overallStats.avgProbability}
                    pitchRange={overallStats.pitchRange}
                />

                {/* Band Breakdown Cards */}
                <div className="pitch-band-breakdown">
                    <h4 className="pitch-band-breakdown-title">Band Breakdown</h4>
                    <div className="pitch-band-cards">
                        {BAND_CONFIGS.map((band) => (
                            <BandBreakdownCard
                                key={band.name}
                                band={band}
                                bandData={bandDataMap.get(band.name)}
                                isDominant={dominantBand === band.name}
                                isSelected={selectedBand === band.name}
                                onSelectBand={handleSelectBand}
                            />
                        ))}
                    </div>
                </div>

                {/* Pitch Timeline Placeholder (Task 3.2) */}
                <div className="pitch-timeline-section">
                    <h4 className="pitch-timeline-title">
                        Pitch Timeline
                        <span className="pitch-timeline-band-label">
                            ({BAND_CONFIGS.find(b => b.name === selectedBand)?.label} band)
                    </span>
                    </h4>
                    <div className="pitch-timeline-placeholder">
                        <p className="pitch-timeline-placeholder-text">
                            Pitch timeline visualization will be added in Task 3.2.
                        </p>
                        <p className="pitch-timeline-placeholder-detail">
                            {selectedBandPitches.length} pitches available for display.
                        </p>
                        {/* Quick preview of pitches */}
                        <div className="pitch-timeline-preview">
                            {selectedBandPitches.slice(0, 10).map((p, i) => (
                                <div
                                    key={i}
                                    className={cn(
                                        'pitch-preview-dot',
                                        p.pitch?.isVoiced ? 'pitch-preview-voiced' : 'pitch-preview-unvoiced'
                                    )}
                                    onClick={() => handleSelectPitch(p)}
                                    title={p.pitch?.noteName ?? 'No pitch'}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSelectPitch(p)}
                                >
                                    {p.pitch?.noteName?.replace(/\d+$/, '') ?? '○'}
                                </div>
                            ))}
                            {selectedBandPitches.length > 10 && (
                                <span className="pitch-preview-more">
                                    +{selectedBandPitches.length - 10} more
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Side Panel - Pitch Inspector */}
            <PitchInspector
                selectedPitch={selectedPitch}
                selectedBand={selectedBand}
            />
        </div>
    );
}

export default PitchDetectionPanel;
