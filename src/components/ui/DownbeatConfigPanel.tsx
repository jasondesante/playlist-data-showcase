/**
 * DownbeatConfigPanel Component
 *
 * Panel for configuring downbeat position and time signature.
 * Appears inside BeatMapSummary after beat analysis completes.
 *
 * Features:
 * - Time signature selector (3/4, 4/4, 5/4, 6/4, 7/4, 8/4)
 * - Downbeat position input (beat index)
 * - "Modified" badge when config differs from default
 * - Collapsible panel
 * - Multi-segment support for time signature changes
 *
 * Part of Manual Downbeat Configuration UI - Phase 2
 * Task 2.1: Create DownbeatConfigPanel component
 */
import { useState } from 'react';
import { Settings, ChevronDown, RotateCcw, Info } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import {
    useDownbeatConfig,
    useTimeSignature,
    useDownbeatSegmentCount,
    useHasCustomDownbeatConfig,
    useBeatMap,
    useBeatDetectionStore,
} from '../../store/beatDetectionStore';
import './DownbeatConfigPanel.css';

/** Common time signature options */
const TIME_SIGNATURES = [3, 4, 5, 6, 7, 8] as const;
type TimeSignatureValue = typeof TIME_SIGNATURES[number];

/**
 * Handle keyboard navigation for time signature toggle buttons.
 * Implements standard radiogroup behavior with arrow keys.
 */
const handleTimeSigKeyDown = (
    e: React.KeyboardEvent,
    currentTimeSig: TimeSignatureValue,
    onSelect: (beats: TimeSignatureValue) => void
) => {
    const currentIndex = TIME_SIGNATURES.indexOf(currentTimeSig);
    let newIndex = currentIndex;

    switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
            e.preventDefault();
            newIndex = currentIndex > 0 ? currentIndex - 1 : TIME_SIGNATURES.length - 1;
            break;
        case 'ArrowRight':
        case 'ArrowDown':
            e.preventDefault();
            newIndex = currentIndex < TIME_SIGNATURES.length - 1 ? currentIndex + 1 : 0;
            break;
        case 'Home':
            e.preventDefault();
            newIndex = 0;
            break;
        case 'End':
            e.preventDefault();
            newIndex = TIME_SIGNATURES.length - 1;
            break;
        default:
            return;
    }

    // Select the new time signature
    onSelect(TIME_SIGNATURES[newIndex]);

    // Focus the button for the new selection
    const container = e.currentTarget;
    const buttons = container.querySelectorAll('[data-time-sig-index]');
    const targetButton = buttons[newIndex] as HTMLElement;
    if (targetButton) {
        targetButton.focus();
    }
};

/**
 * Get tabIndex for toggle buttons in a radiogroup.
 * Only the active button should be in the tab order (tabIndex=0).
 */
const getToggleTabIndex = (beats: TimeSignatureValue, currentBeats: TimeSignatureValue): number => {
    return beats === currentBeats ? 0 : -1;
};

interface DownbeatConfigPanelProps {
    /** Whether the panel is disabled (no beat map available) */
    disabled?: boolean;
}

export function DownbeatConfigPanel({ disabled = false }: DownbeatConfigPanelProps) {
    // Get downbeat configuration from store
    const config = useDownbeatConfig();
    const timeSignature = useTimeSignature();
    const segmentCount = useDownbeatSegmentCount();
    const hasCustomConfig = useHasCustomDownbeatConfig();
    const beatMap = useBeatMap();

    // Local state for collapsible panel
    const [isExpanded, setIsExpanded] = useState(false);

    // Get the first segment's downbeat index (for single-segment display)
    const currentDownbeatIndex = config.segments[0]?.downbeatBeatIndex ?? 0;

    // Calculate max beat index for validation (0 to beats.length - 1)
    const maxBeatIndex = beatMap ? beatMap.beats.length - 1 : 0;

    // Check if panel should be disabled
    const isDisabled = disabled;

    /**
     * Handle downbeat position input change.
     * Validates and clamps the value, then updates the store.
     */
    const handleDownbeatIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;

        // Allow empty input for typing
        if (value === '') {
            return;
        }

        const parsedValue = parseInt(value, 10);

        // Only update if it's a valid number
        if (!isNaN(parsedValue)) {
            // The store action will clamp to valid range
            useBeatDetectionStore.getState().actions.setDownbeatPosition(
                parsedValue,
                timeSignature
            );
        }
    };

    /**
     * Handle blur event to ensure valid value.
     * If input is empty or invalid, reset to current value.
     */
    const handleDownbeatIndexBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const parsedValue = parseInt(value, 10);

        // If invalid or empty, reset to current downbeat index
        if (value === '' || isNaN(parsedValue)) {
            e.target.value = String(currentDownbeatIndex);
            return;
        }

        // Clamp to valid range on blur
        const clampedValue = Math.max(0, Math.min(parsedValue, maxBeatIndex));
        if (clampedValue !== parsedValue) {
            useBeatDetectionStore.getState().actions.setDownbeatPosition(
                clampedValue,
                timeSignature
            );
        }
    };

    return (
        <div className={`downbeat-config-panel ${isDisabled ? 'downbeat-config-panel--disabled' : ''}`}>
            {/* Header - Task 2.2 */}
            <button
                type="button"
                className="downbeat-config-panel-header"
                onClick={() => setIsExpanded(!isExpanded)}
                disabled={isDisabled}
                aria-expanded={isExpanded}
                aria-controls="downbeat-config-panel-content"
            >
                <div className="downbeat-config-panel-header-left">
                    <Settings className="downbeat-config-panel-icon" />
                    <span className="downbeat-config-panel-title">Downbeat Configuration</span>
                    {hasCustomConfig && (
                        <span className="downbeat-config-panel-badge">Modified</span>
                    )}
                </div>
                <ChevronDown
                    className={`downbeat-config-panel-chevron ${isExpanded ? 'downbeat-config-panel-chevron--expanded' : ''}`}
                />
            </button>

            {/* Content - Collapsible */}
            {isExpanded && (
                <div
                    id="downbeat-config-panel-content"
                    className="downbeat-config-panel-content"
                >
                    {/* Current Config Display - Task 2.3 */}
                    <div className="downbeat-config-panel-current">
                        <div className="downbeat-config-panel-stat">
                            <span className="downbeat-config-panel-stat-label">Time Signature:</span>
                            <span className="downbeat-config-panel-stat-value">{timeSignature}/4</span>
                        </div>
                        <div className="downbeat-config-panel-stat">
                            <span className="downbeat-config-panel-stat-label">Downbeat at Beat:</span>
                            <span className="downbeat-config-panel-stat-value">{currentDownbeatIndex}</span>
                        </div>
                        {segmentCount > 1 && (
                            <div className="downbeat-config-panel-stat">
                                <span className="downbeat-config-panel-stat-label">Segments:</span>
                                <span className="downbeat-config-panel-stat-value">{segmentCount}</span>
                            </div>
                        )}
                    </div>

                    {/* Time Signature Selector - Task 2.4 */}
                    <div className="downbeat-config-panel-section">
                        <span className="downbeat-config-panel-section-label">Time Signature</span>
                        <div
                            className="downbeat-config-panel-time-sigs"
                            role="radiogroup"
                            aria-label="Time signature"
                            onKeyDown={(e) => handleTimeSigKeyDown(
                                e,
                                timeSignature as TimeSignatureValue,
                                (beats) => useBeatDetectionStore.getState().actions.setDownbeatPosition(currentDownbeatIndex, beats)
                            )}
                        >
                            {TIME_SIGNATURES.map((beats, index) => (
                                <button
                                    key={beats}
                                    type="button"
                                    data-time-sig-index={index}
                                    className={`downbeat-config-panel-time-sig-btn ${
                                        timeSignature === beats ? 'downbeat-config-panel-time-sig-btn--active' : ''
                                    }`}
                                    onClick={() => {
                                        // Update config immediately on selection
                                        useBeatDetectionStore.getState().actions.setDownbeatPosition(
                                            currentDownbeatIndex,
                                            beats
                                        );
                                    }}
                                    disabled={isDisabled}
                                    tabIndex={getToggleTabIndex(beats, timeSignature as TimeSignatureValue)}
                                    aria-checked={timeSignature === beats}
                                    role="radio"
                                    aria-label={`${beats}/4 time signature`}
                                >
                                    {beats}/4
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Downbeat Position Input - Task 2.5 */}
                    <div className="downbeat-config-panel-section">
                        <span className="downbeat-config-panel-section-label">Beat Index</span>
                        <Input
                            type="number"
                            min={0}
                            max={maxBeatIndex}
                            value={currentDownbeatIndex}
                            onChange={handleDownbeatIndexChange}
                            onBlur={handleDownbeatIndexBlur}
                            disabled={isDisabled}
                            helperText={`The beat number to set as the downbeat (0-${maxBeatIndex})`}
                            size="sm"
                        />
                    </div>

                    {/* Hint Box - Task 2.6 */}
                    <div className="downbeat-config-panel-hint">
                        <Info className="downbeat-config-panel-hint-icon" />
                        <span className="downbeat-config-panel-hint-text">
                            Click "Edit Downbeat" then click any beat in the timeline to set it as the downbeat (beat 1)
                        </span>
                    </div>

                    {/* Multi-Segment Support - Task 2.7 (placeholder for now) */}
                    {/* Will be implemented in Task 2.7 */}

                    {/* Actions - Task 2.8 */}
                    <div className="downbeat-config-panel-actions">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isDisabled || !hasCustomConfig}
                            leftIcon={RotateCcw}
                        >
                            Reset to Default
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
