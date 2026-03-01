/**
 * BeatInterpolationSettings Component
 *
 * A settings panel for configuring beat interpolation parameters.
 * Part of Task 3.1: Create BeatInterpolationSettings Component
 *
 * Features:
 * - Algorithm selector with three options
 * - Beat stream mode toggle
 * - Advanced options via AdvancedInterpolationOptions component (Task 8.1)
 * - Pure CSS styling (no Tailwind)
 *
 * @component
 */
import { Info, Star } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { AdvancedInterpolationOptions } from './AdvancedInterpolationOptions';
import './BeatInterpolationSettings.css';
import {
    useBeatDetectionStore,
    useInterpolationOptions,
    useSelectedAlgorithm,
    useBeatStreamMode,
    useShowGridOverlay,
    useShowTempoDriftVisualization,
} from '../../store/beatDetectionStore';
import type { InterpolationAlgorithm, BeatStreamMode } from '@/types';

/**
 * Algorithm configuration for display
 */
interface AlgorithmConfig {
    id: InterpolationAlgorithm;
    label: string;
    description: string;
    recommended?: boolean;
}

const ALGORITHMS: AlgorithmConfig[] = [
    {
        id: 'histogram-grid',
        label: 'Histogram Grid',
        description: 'Uses the most common interval as a rigid grid. Best for tracks with very stable tempo.',
    },
    {
        id: 'adaptive-phase-locked',
        label: 'Adaptive Phase-Locked',
        description: 'Adjusts tempo slightly at each detected beat anchor. Handles minor tempo drift.',
    },
    {
        id: 'dual-pass',
        label: 'Dual-Pass',
        description: 'Advanced algorithm with KDE peak finding and distributed error correction. Most robust.',
        recommended: true,
    },
];

/**
 * Beat stream mode configuration for display
 */
interface StreamModeConfig {
    id: BeatStreamMode;
    label: string;
    description: string;
}

const STREAM_MODES: StreamModeConfig[] = [
    {
        id: 'detected',
        label: 'Detected Only',
        description: 'Use only originally detected beats (original behavior)',
    },
    {
        id: 'merged',
        label: 'Merged',
        description: 'Use interpolated beats with detected beats as anchors (fills gaps)',
    },
];

/**
 * Props for the BeatInterpolationSettings component.
 */
interface BeatInterpolationSettingsProps {
    /**
     * Whether the settings controls should be disabled.
     * When true, all controls are non-interactive.
     * @default false
     */
    disabled?: boolean;
}

/**
 * BeatInterpolationSettings Component
 *
 * Renders settings for beat interpolation including algorithm selection,
 * beat stream mode, and advanced options via AdvancedInterpolationOptions.
 */
export function BeatInterpolationSettings({ disabled = false }: BeatInterpolationSettingsProps) {
    const interpolationOptions = useInterpolationOptions();
    const selectedAlgorithm = useSelectedAlgorithm();
    const beatStreamMode = useBeatStreamMode();
    const showGridOverlay = useShowGridOverlay();
    const showTempoDriftVisualization = useShowTempoDriftVisualization();

    const setInterpolationOptions = useBeatDetectionStore((state) => state.actions.setInterpolationOptions);
    const setSelectedAlgorithm = useBeatDetectionStore((state) => state.actions.setSelectedAlgorithm);
    const setBeatStreamMode = useBeatDetectionStore((state) => state.actions.setBeatStreamMode);
    const toggleGridOverlay = useBeatDetectionStore((state) => state.actions.toggleGridOverlay);
    const toggleTempoDriftVisualization = useBeatDetectionStore((state) => state.actions.toggleTempoDriftVisualization);

    // Handle algorithm change
    const handleAlgorithmChange = (algorithm: InterpolationAlgorithm) => {
        setSelectedAlgorithm(algorithm);
    };

    // Handle beat stream mode change
    const handleStreamModeChange = (mode: BeatStreamMode) => {
        setBeatStreamMode(mode);
    };

    // Generic keyboard navigation handler for toggle groups
    const createKeyboardNavHandler = <T extends string>(
        modes: T[],
        currentMode: T,
        onChangeMode: (mode: T) => void
    ) => (e: React.KeyboardEvent) => {
        const currentIndex = modes.indexOf(currentMode);
        let newIndex = currentIndex;

        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowUp':
                e.preventDefault();
                newIndex = currentIndex > 0 ? currentIndex - 1 : modes.length - 1;
                break;
            case 'ArrowRight':
            case 'ArrowDown':
                e.preventDefault();
                newIndex = currentIndex < modes.length - 1 ? currentIndex + 1 : 0;
                break;
            case 'Home':
                e.preventDefault();
                newIndex = 0;
                break;
            case 'End':
                e.preventDefault();
                newIndex = modes.length - 1;
                break;
            default:
                return;
        }

        onChangeMode(modes[newIndex]);

        // Focus the button for the new mode
        const container = e.currentTarget;
        const buttons = container.querySelectorAll('[data-mode-index]');
        const targetButton = buttons[newIndex] as HTMLElement;
        if (targetButton) {
            targetButton.focus();
        }
    };

    const getToggleTabIndex = <T extends string>(mode: T, currentMode: T): number => {
        return mode === currentMode ? 0 : -1;
    };

    return (
        <div className="beat-interpolation-settings">
            {/* ============================================================
             * ALGORITHM SELECTOR
             * ============================================================ */}
            <div className="beat-interpolation-settings-section">
                <div className="beat-interpolation-settings-header">
                    <div className="beat-interpolation-settings-label-with-tooltip">
                        <span className="beat-interpolation-settings-label">Algorithm</span>
                        <Tooltip content="Select the algorithm used to fill gaps between detected beats." />
                    </div>
                </div>
                <div
                    className="beat-interpolation-algorithm-toggles"
                    role="radiogroup"
                    aria-label="Interpolation algorithm"
                    onKeyDown={createKeyboardNavHandler(
                        ALGORITHMS.map(a => a.id),
                        selectedAlgorithm,
                        handleAlgorithmChange
                    )}
                >
                    {ALGORITHMS.map((algo, index) => {
                        const isSelected = selectedAlgorithm === algo.id;
                        return (
                            <button
                                key={algo.id}
                                type="button"
                                data-mode-index={index}
                                className={`beat-interpolation-algorithm-toggle ${isSelected ? 'beat-interpolation-algorithm-toggle--active' : ''}`}
                                onClick={() => handleAlgorithmChange(algo.id)}
                                disabled={disabled}
                                tabIndex={getToggleTabIndex(algo.id, selectedAlgorithm)}
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${algo.label}: ${algo.description}`}
                                title={algo.description}
                            >
                                <span className="beat-interpolation-algorithm-toggle-label">
                                    {algo.label}
                                    {algo.recommended && (
                                        <Star className="beat-interpolation-recommended-badge" size={10} />
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
                {/* Show description of selected algorithm */}
                <div className="beat-interpolation-algorithm-description">
                    {ALGORITHMS.find(a => a.id === selectedAlgorithm)?.description}
                </div>
            </div>

            {/* ============================================================
             * BEAT STREAM MODE
             * ============================================================ */}
            <div className="beat-interpolation-settings-section">
                <div className="beat-interpolation-settings-header">
                    <div className="beat-interpolation-settings-label-with-tooltip">
                        <span className="beat-interpolation-settings-label">Beat Stream</span>
                        <Tooltip content="Choose which beats to use during practice. 'Detected' uses only original beats; 'Merged' includes interpolated beats." />
                    </div>
                </div>
                <div
                    className="beat-interpolation-stream-toggles"
                    role="radiogroup"
                    aria-label="Beat stream mode"
                    onKeyDown={createKeyboardNavHandler(
                        STREAM_MODES.map(m => m.id),
                        beatStreamMode,
                        handleStreamModeChange
                    )}
                >
                    {STREAM_MODES.map((mode, index) => {
                        const isSelected = beatStreamMode === mode.id;
                        return (
                            <button
                                key={mode.id}
                                type="button"
                                data-mode-index={index}
                                className={`beat-interpolation-stream-toggle ${isSelected ? 'beat-interpolation-stream-toggle--active' : ''}`}
                                onClick={() => handleStreamModeChange(mode.id)}
                                disabled={disabled}
                                tabIndex={getToggleTabIndex(mode.id, beatStreamMode)}
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${mode.label}: ${mode.description}`}
                                title={mode.description}
                            >
                                <span className="beat-interpolation-stream-toggle-label">
                                    {mode.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <div className="beat-interpolation-stream-description">
                    {STREAM_MODES.find(m => m.id === beatStreamMode)?.description}
                </div>
            </div>

            {/* ============================================================
             * GRID OVERLAY TOGGLE (Task 5.3)
             * ============================================================ */}
            <div className="beat-interpolation-settings-section">
                <label className="beat-interpolation-checkbox-label">
                    <input
                        type="checkbox"
                        checked={showGridOverlay}
                        onChange={toggleGridOverlay}
                        disabled={disabled}
                        className="beat-interpolation-checkbox"
                    />
                    <span className="beat-interpolation-checkbox-text">Show Quarter Note Grid</span>
                    <Tooltip content="Display vertical lines at quarter note intervals on the timeline. Helps visualize beat alignment." />
                </label>
                <div className="beat-interpolation-checkbox-description">
                    {showGridOverlay
                        ? 'Grid lines visible on timeline'
                        : 'Enable to see beat grid alignment'}
                </div>
            </div>

            {/* ============================================================
             * TEMPO DRIFT VISUALIZATION TOGGLE (Task 5.4)
             * ============================================================ */}
            <div className="beat-interpolation-settings-section">
                <label className="beat-interpolation-checkbox-label">
                    <input
                        type="checkbox"
                        checked={showTempoDriftVisualization}
                        onChange={toggleTempoDriftVisualization}
                        disabled={disabled}
                        className="beat-interpolation-checkbox"
                    />
                    <span className="beat-interpolation-checkbox-text">Show Tempo Drift</span>
                    <Tooltip content="Display a tempo curve showing how tempo changes throughout the track. Highlights sections where tempo speeds up or slows down." />
                </label>
                <div className="beat-interpolation-checkbox-description">
                    {showTempoDriftVisualization
                        ? 'Tempo curve and drift sections visible'
                        : 'Enable to see tempo variations'}
                </div>
            </div>

            {/* ============================================================
             * ADVANCED OPTIONS - Using AdvancedInterpolationOptions Component
             * Task 8.1: Extracted to separate component
             * ============================================================ */}
            <AdvancedInterpolationOptions
                options={interpolationOptions}
                onOptionsChange={setInterpolationOptions}
                disabled={disabled}
            />

            {/* Note about interpolation */}
            <div className="beat-interpolation-settings-note">
                <Info className="beat-interpolation-settings-note-icon" />
                <span className="beat-interpolation-settings-note-text">
                    Interpolation fills gaps between detected beats using a tempo-aware grid. Best results with rhythmic music.
                </span>
            </div>
        </div>
    );
}

export default BeatInterpolationSettings;
