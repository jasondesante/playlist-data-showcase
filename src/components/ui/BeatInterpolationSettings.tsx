/**
 * BeatInterpolationSettings Component
 *
 * A settings panel for configuring beat interpolation parameters.
 * Part of Task 3.1: Create BeatInterpolationSettings Component
 *
 * Features:
 * - Beat stream mode toggle
 * - Grid overlay and tempo drift visualization toggles
 * - Advanced options via AdvancedInterpolationOptions component (Task 8.1)
 * - Pure CSS styling (no Tailwind)
 *
 * @component
 */
import { Info } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { AdvancedInterpolationOptions } from './AdvancedInterpolationOptions';
import './BeatInterpolationSettings.css';
import {
    useBeatDetectionStore,
    useInterpolationOptions,
    useBeatStreamMode,
    useShowGridOverlay,
    useShowTempoDriftVisualization,
} from '../../store/beatDetectionStore';
import type { BeatStreamMode } from '@/types';

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
 * Renders settings for beat interpolation including beat stream mode,
 * visualization toggles, and advanced options via AdvancedInterpolationOptions.
 */
export function BeatInterpolationSettings({ disabled = false }: BeatInterpolationSettingsProps) {
    const interpolationOptions = useInterpolationOptions();
    const beatStreamMode = useBeatStreamMode();
    const showGridOverlay = useShowGridOverlay();
    const showTempoDriftVisualization = useShowTempoDriftVisualization();

    const setInterpolationOptions = useBeatDetectionStore((state) => state.actions.setInterpolationOptions);
    const setBeatStreamMode = useBeatDetectionStore((state) => state.actions.setBeatStreamMode);
    const toggleGridOverlay = useBeatDetectionStore((state) => state.actions.toggleGridOverlay);
    const toggleTempoDriftVisualization = useBeatDetectionStore((state) => state.actions.toggleTempoDriftVisualization);

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
