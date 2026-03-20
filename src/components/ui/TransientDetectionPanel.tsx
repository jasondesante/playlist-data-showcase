/**
 * TransientDetectionPanel Component
 *
 * Container for transient detection visualizations in the rhythm generation feature.
 * Displays:
 * - Header with total transient count
 * - Intensity filter slider (filters displayed transients)
 * - "Show all bands" toggle
 * - Band breakdown cards (placeholder for Task 4.3)
 * - Timeline visualization (placeholder for Task 4.2)
 * - Inspector for selected transient (placeholder for Task 4.4)
 *
 * Part of Phase 4: Transient Detection Visualization (Task 4.1)
 */

import { useState, useMemo } from 'react';
import { Zap, Filter, Layers } from 'lucide-react';
import './TransientDetectionPanel.css';
import { TransientTimeline } from './TransientTimeline';
import { TransientInspector } from './TransientInspector';
import type { GeneratedRhythm, TransientResult, Band } from '../../types/rhythmGeneration';

// ============================================================
// Types
// ============================================================

export interface TransientDetectionPanelProps {
    /** The generated rhythm containing transient analysis */
    rhythm: GeneratedRhythm;
    /** Current audio playback time in seconds (for timeline sync) */
    currentTime?: number;
    /** Whether audio is currently playing */
    isPlaying?: boolean;
    /** Callback when user seeks to a time position */
    onSeek?: (time: number) => void;
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
 * Frequency range labels for each band
 */
const BAND_RANGES: Record<Band, string> = {
    low: '20-500 Hz',
    mid: '500-2000 Hz',
    high: '2000-20000 Hz',
};

/**
 * Detection method display names
 */
const DETECTION_METHOD_LABELS: Record<string, string> = {
    energy: 'Energy',
    spectral_flux: 'Spectral Flux',
    hfc: 'HFC',
};

// ============================================================
// Sub-components
// ============================================================

/**
 * Intensity filter slider component
 */
interface IntensityFilterProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

function IntensityFilter({ value, onChange, min = 0, max = 1, step = 0.05 }: IntensityFilterProps) {
    return (
        <div className="transient-intensity-filter">
            <label className="transient-intensity-label">
                <Filter size={14} />
                <span>Intensity Threshold</span>
                <span className="transient-intensity-value">{(value * 100).toFixed(0)}%</span>
            </label>
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="transient-intensity-slider"
                aria-label="Filter transients by intensity"
            />
            <div className="transient-intensity-range">
                <span>0%</span>
                <span>100%</span>
            </div>
        </div>
    );
}

/**
 * Toggle for showing/hiding bands
 */
interface BandToggleProps {
    showAllBands: boolean;
    onChange: (value: boolean) => void;
    activeBand: Band | 'all';
    onBandChange: (band: Band | 'all') => void;
}

function BandToggle({ showAllBands: _showAllBands, onChange, activeBand, onBandChange }: BandToggleProps) {
    const bands: (Band | 'all')[] = ['all', 'low', 'mid', 'high'];

    return (
        <div className="transient-band-toggle">
            <label className="transient-band-toggle-label">
                <Layers size={14} />
                <span>Show Bands</span>
            </label>
            <div className="transient-band-buttons">
                {bands.map((band) => (
                    <button
                        key={band}
                        className={`transient-band-button ${activeBand === band ? 'active' : ''}`}
                        onClick={() => {
                            onBandChange(band);
                            onChange(band === 'all');
                        }}
                        style={band !== 'all' ? { '--band-color': BAND_COLORS[band] } as React.CSSProperties : {}}
                        aria-pressed={activeBand === band}
                    >
                        {band === 'all' ? 'All' : band.charAt(0).toUpperCase() + band.slice(1)}
                    </button>
                ))}
            </div>
        </div>
    );
}

/**
 * Band breakdown card showing statistics for a single band
 */
interface BandBreakdownCardProps {
    band: Band;
    transients: TransientResult[];
    color: string;
    frequencyRange: string;
}

function BandBreakdownCard({ band, transients, color, frequencyRange }: BandBreakdownCardProps) {
    // Calculate statistics
    const count = transients.length;
    const avgIntensity = count > 0
        ? transients.reduce((sum, t) => sum + t.intensity, 0) / count
        : 0;

    // Get detection method breakdown
    const methodCounts = transients.reduce((acc, t) => {
        acc[t.detectionMethod] = (acc[t.detectionMethod] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const primaryMethod = Object.entries(methodCounts)
        .sort((a, b) => b[1] - a[1])[0];

    return (
        <div className="transient-band-card" style={{ '--band-color': color } as React.CSSProperties}>
            <div className="transient-band-card-header">
                <span className="transient-band-card-name">{band.charAt(0).toUpperCase() + band.slice(1)}</span>
                <span className="transient-band-card-count">{count}</span>
            </div>
            <div className="transient-band-card-range">{frequencyRange}</div>
            <div className="transient-band-card-stats">
                <div className="transient-band-card-stat">
                    <span className="transient-band-card-stat-label">Avg Intensity</span>
                    <span className="transient-band-card-stat-value">{(avgIntensity * 100).toFixed(0)}%</span>
                </div>
                {primaryMethod && (
                    <div className="transient-band-card-stat">
                        <span className="transient-band-card-stat-label">Method</span>
                        <span className="transient-band-card-stat-badge">
                            {DETECTION_METHOD_LABELS[primaryMethod[0]] || primaryMethod[0]}
                        </span>
                    </div>
                )}
            </div>
            <div className="transient-band-card-indicator" style={{ backgroundColor: color }} />
        </div>
    );
}


// ============================================================
// Main Component
// ============================================================

/**
 * TransientDetectionPanel
 *
 * Main container for transient detection visualizations.
 * Provides filtering controls and displays band breakdowns and timeline.
 */
export function TransientDetectionPanel({
    rhythm,
    currentTime = 0,
    isPlaying = false,
    onSeek,
    className,
}: TransientDetectionPanelProps) {
    // Get transient analysis from the rhythm
    const transientAnalysis = rhythm.analysis.transientAnalysis;
    const allTransients = transientAnalysis.transients;

    // Get duration from metadata or estimate from last transient
    const duration = rhythm.metadata.duration > 0
        ? rhythm.metadata.duration
        : Math.max(...allTransients.map(t => t.timestamp), 0) + 1;

    // Filter state
    const [intensityThreshold, setIntensityThreshold] = useState(0);
    const [activeBand, setActiveBand] = useState<Band | 'all'>('all');

    // Selected transient state for inspector
    const [selectedTransient, setSelectedTransient] = useState<TransientResult | null>(null);
    const [selectedTransientIndex, setSelectedTransientIndex] = useState<number | null>(null);

    // Group transients by band for breakdown cards
    const transientsByBand = useMemo(() => {
        const groups: Record<Band, TransientResult[]> = {
            low: [],
            mid: [],
            high: [],
        };
        allTransients.forEach((t) => {
            groups[t.band].push(t);
        });
        return groups;
    }, [allTransients]);

    // Calculate total count
    const totalCount = allTransients.length;

    // Handle transient click for inspector
    const handleTransientClick = (transient: TransientResult, index: number) => {
        setSelectedTransient(transient);
        setSelectedTransientIndex(index);
    };

    return (
        <div className={`transient-detection-panel ${className || ''}`}>
            {/* Header with total count */}
            <div className="transient-detection-header">
                <div className="transient-detection-title">
                    <Zap size={18} />
                    <span>Transient Detection</span>
                </div>
                <div className="transient-detection-count">
                    <span className="transient-detection-count-value">{totalCount}</span>
                    <span className="transient-detection-count-label">transients detected</span>
                </div>
            </div>

            {/* Filter controls */}
            <div className="transient-detection-controls">
                <IntensityFilter
                    value={intensityThreshold}
                    onChange={setIntensityThreshold}
                />
                <BandToggle
                    showAllBands={activeBand === 'all'}
                    onChange={(showAll) => setActiveBand(showAll ? 'all' : 'low')}
                    activeBand={activeBand}
                    onBandChange={setActiveBand}
                />
            </div>

            {/* Band breakdown cards */}
            <div className="transient-detection-bands">
                {(Object.keys(transientsByBand) as Band[]).map((band) => (
                    <BandBreakdownCard
                        key={band}
                        band={band}
                        transients={transientsByBand[band]}
                        color={BAND_COLORS[band]}
                        frequencyRange={BAND_RANGES[band]}
                    />
                ))}
            </div>

            {/* Transient Timeline (Task 4.2) */}
            <div className="transient-timeline-section">
                <TransientTimeline
                    transients={allTransients}
                    currentTime={currentTime}
                    duration={duration}
                    isPlaying={isPlaying}
                    onSeek={onSeek}
                    onTransientClick={handleTransientClick}
                    selectedTransientIndex={selectedTransientIndex}
                    filterBand={activeBand}
                    intensityThreshold={intensityThreshold}
                />
            </div>

            {/* Inspector (Task 4.4) */}
            <TransientInspector
                selectedTransient={selectedTransient}
                selectedIndex={selectedTransientIndex}
                currentTime={currentTime}
                onClear={() => {
                    setSelectedTransient(null);
                    setSelectedTransientIndex(null);
                }}
                onSeek={onSeek}
            />
        </div>
    );
}

export default TransientDetectionPanel;
