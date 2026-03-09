/**
 * BeatInterpolationSettings Component
 *
 * A settings panel for configuring beat interpolation parameters.
 * Part of Task 3.1: Create BeatInterpolationSettings Component
 *
 * Features:
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
    useShowGridOverlay,
    useShowTempoDriftVisualization,
    useAutoMultiTempo,
} from '../../store/beatDetectionStore';

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
 * Renders settings for beat interpolation including visualization toggles
 * and advanced options via AdvancedInterpolationOptions.
 */
export function BeatInterpolationSettings({ disabled = false }: BeatInterpolationSettingsProps) {
    const interpolationOptions = useInterpolationOptions();
    const showGridOverlay = useShowGridOverlay();
    const showTempoDriftVisualization = useShowTempoDriftVisualization();
    const autoMultiTempo = useAutoMultiTempo();

    const setInterpolationOptions = useBeatDetectionStore((state) => state.actions.setInterpolationOptions);
    const toggleGridOverlay = useBeatDetectionStore((state) => state.actions.toggleGridOverlay);
    const toggleTempoDriftVisualization = useBeatDetectionStore((state) => state.actions.toggleTempoDriftVisualization);
    const setAutoMultiTempo = useBeatDetectionStore((state) => state.actions.setAutoMultiTempo);

    return (
        <div className="beat-interpolation-settings">
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
             * AUTO MULTI-TEMPO DETECTION TOGGLE (Task 2.1)
             * ============================================================ */}
            <div className="beat-interpolation-settings-section">
                <label className="beat-interpolation-checkbox-label">
                    <input
                        type="checkbox"
                        checked={autoMultiTempo}
                        onChange={(e) => setAutoMultiTempo(e.target.checked)}
                        disabled={disabled}
                        className="beat-interpolation-checkbox"
                    />
                    <span className="beat-interpolation-checkbox-text">Auto Multi-Tempo Detection</span>
                    <Tooltip content="Automatically analyze tracks with multiple tempo sections. When enabled, distinct tempo changes will be detected and applied for more accurate beat mapping." />
                </label>
                <div className="beat-interpolation-checkbox-description">
                    {autoMultiTempo
                        ? 'Multi-tempo analysis enabled (recommended)'
                        : 'Single tempo mode - may be less accurate for variable tempo tracks'}
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
