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
 * Task 2.7: Multi-segment support (Advanced)
 */
import { useState } from 'react';
import { Settings, ChevronDown, RotateCcw, Info, Plus, Trash2, ChevronRight, Eye, EyeOff, MousePointer2, Check } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import {
    useDownbeatConfig,
    useTimeSignature,
    useDownbeatSegmentCount,
    useHasCustomDownbeatConfig,
    useBeatMap,
    useBeatDetectionStore,
    useShowMeasureBoundaries,
    useIsDownbeatSelectionMode,
} from '../../store/beatDetectionStore';
import type { DownbeatSegment } from '../../types';
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
    const showMeasureBoundaries = useShowMeasureBoundaries();
    const isSelectionMode = useIsDownbeatSelectionMode();

    // Local state for collapsible panel
    const [isExpanded, setIsExpanded] = useState(false);

    // Local state for advanced section (Task 2.7)
    const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);
    const [isAddingSegment, setIsAddingSegment] = useState(false);
    const [newSegmentStartBeat, setNewSegmentStartBeat] = useState('');
    const [newSegmentTimeSig, setNewSegmentTimeSig] = useState<TimeSignatureValue>(4);
    const [newSegmentDownbeat, setNewSegmentDownbeat] = useState('');

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

    // ========================================
    // Task 2.7: Multi-Segment Support Handlers
    // ========================================

    /**
     * Handle adding a new segment.
     * Validates inputs and calls store action.
     */
    const handleAddSegment = () => {
        const startBeat = parseInt(newSegmentStartBeat, 10);
        const downbeatIndex = parseInt(newSegmentDownbeat, 10);

        // Validate inputs
        if (isNaN(startBeat) || startBeat < 1 || startBeat > maxBeatIndex) {
            return;
        }

        if (isNaN(downbeatIndex) || downbeatIndex < 0 || downbeatIndex > maxBeatIndex) {
            return;
        }

        // Check that startBeat doesn't already exist
        const existingStartBeats = config.segments.map((s: DownbeatSegment) => s.startBeat);
        if (existingStartBeats.includes(startBeat)) {
            return;
        }

        // Create new segment
        const newSegment: DownbeatSegment = {
            startBeat,
            downbeatBeatIndex: downbeatIndex,
            timeSignature: { beatsPerMeasure: newSegmentTimeSig },
        };

        // Add segment via store action
        useBeatDetectionStore.getState().actions.addDownbeatSegment(newSegment);

        // Reset form state
        setIsAddingSegment(false);
        setNewSegmentStartBeat('');
        setNewSegmentTimeSig(4);
        setNewSegmentDownbeat('');
    };

    /**
     * Handle removing a segment.
     * Cannot remove the first segment (index 0).
     */
    const handleRemoveSegment = (segmentIndex: number) => {
        if (segmentIndex === 0) return;
        useBeatDetectionStore.getState().actions.removeDownbeatSegment(segmentIndex);
    };

    /**
     * Cancel adding a new segment.
     */
    const handleCancelAddSegment = () => {
        setIsAddingSegment(false);
        setNewSegmentStartBeat('');
        setNewSegmentTimeSig(4);
        setNewSegmentDownbeat('');
    };

    /**
     * Get a label for the segment (e.g., "First", "Segment 2").
     */
    const getSegmentLabel = (index: number): string => {
        if (index === 0) return 'First';
        return `Segment ${index + 1}`;
    };

    /**
     * Get a description of the beat range covered by a segment.
     */
    const getSegmentRange = (index: number, segments: DownbeatSegment[]): string => {
        const start = segments[index].startBeat;
        const end = segments[index + 1]?.startBeat ?? maxBeatIndex;
        if (start === end || index === segments.length - 1) {
            return `Beat ${start}+`;
        }
        return `Beats ${start}-${end - 1}`;
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

                    {/* Hint Box - Task 2.6 / Task 5.3 */}
                    <div className={`downbeat-config-panel-hint ${isSelectionMode ? 'downbeat-config-panel-hint--selection-mode' : ''}`}>
                        {isSelectionMode ? (
                            <>
                                <MousePointer2 className="downbeat-config-panel-hint-icon" />
                                <span className="downbeat-config-panel-hint-text">
                                    <strong>Selection mode active:</strong> Click any beat in the timeline to set it as the downbeat (beat 1)
                                </span>
                            </>
                        ) : (
                            <>
                                <Info className="downbeat-config-panel-hint-icon" />
                                <span className="downbeat-config-panel-hint-text">
                                    Click "Edit Downbeat" then click any beat in the timeline to set it as the downbeat (beat 1)
                                </span>
                            </>
                        )}
                    </div>

                    {/* Measure Visualization Toggle - Task 4.1 */}
                    <div className="downbeat-config-panel-toggle">
                        <button
                            type="button"
                            className={`downbeat-config-panel-toggle-btn ${showMeasureBoundaries ? 'downbeat-config-panel-toggle-btn--active' : ''}`}
                            onClick={() => useBeatDetectionStore.getState().actions.setShowMeasureBoundaries(!showMeasureBoundaries)}
                            disabled={isDisabled}
                            aria-pressed={showMeasureBoundaries}
                        >
                            {showMeasureBoundaries ? (
                                <Eye className="downbeat-config-panel-toggle-icon" />
                            ) : (
                                <EyeOff className="downbeat-config-panel-toggle-icon" />
                            )}
                            <span className="downbeat-config-panel-toggle-label">
                                Show Measure Boundaries
                            </span>
                        </button>
                        <span className="downbeat-config-panel-toggle-hint">
                            {showMeasureBoundaries ? 'Measure lines and numbers visible' : 'Click to show measure lines'}
                        </span>
                    </div>

                    {/* Multi-Segment Support - Task 2.7 */}
                    <div className="downbeat-config-panel-advanced">
                        <button
                            type="button"
                            className="downbeat-config-panel-advanced-header"
                            onClick={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                            aria-expanded={isAdvancedExpanded}
                            aria-controls="downbeat-config-advanced-content"
                        >
                            <ChevronRight
                                className={`downbeat-config-panel-advanced-chevron ${
                                    isAdvancedExpanded ? 'downbeat-config-panel-advanced-chevron--expanded' : ''
                                }`}
                            />
                            <span className="downbeat-config-panel-advanced-title">
                                Advanced: Time Signature Changes
                            </span>
                        </button>

                        {isAdvancedExpanded && (
                            <div
                                id="downbeat-config-advanced-content"
                                className="downbeat-config-panel-advanced-content"
                            >
                                {/* Segment List */}
                                <div className="downbeat-config-panel-segments">
                                    {config.segments.map((segment: DownbeatSegment, index: number) => (
                                        <div key={index} className="downbeat-config-panel-segment">
                                            <div className="downbeat-config-panel-segment-header">
                                                <span className="downbeat-config-panel-segment-label">
                                                    {getSegmentLabel(index)}
                                                </span>
                                                <span className="downbeat-config-panel-segment-range">
                                                    {getSegmentRange(index, config.segments)}
                                                </span>
                                                {index > 0 && (
                                                    <button
                                                        type="button"
                                                        className="downbeat-config-panel-segment-delete"
                                                        onClick={() => handleRemoveSegment(index)}
                                                        disabled={isDisabled}
                                                        aria-label={`Delete ${getSegmentLabel(index)}`}
                                                        title="Delete segment"
                                                    >
                                                        <Trash2 className="downbeat-config-panel-segment-delete-icon" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="downbeat-config-panel-segment-details">
                                                <span className="downbeat-config-panel-segment-detail">
                                                    <span className="downbeat-config-panel-segment-detail-label">Start:</span>
                                                    <span className="downbeat-config-panel-segment-detail-value">Beat {segment.startBeat}</span>
                                                </span>
                                                <span className="downbeat-config-panel-segment-detail">
                                                    <span className="downbeat-config-panel-segment-detail-label">Time:</span>
                                                    <span className="downbeat-config-panel-segment-detail-value">
                                                        {segment.timeSignature.beatsPerMeasure}/4
                                                    </span>
                                                </span>
                                                <span className="downbeat-config-panel-segment-detail">
                                                    <span className="downbeat-config-panel-segment-detail-label">Downbeat:</span>
                                                    <span className="downbeat-config-panel-segment-detail-value">{segment.downbeatBeatIndex}</span>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Add Segment Form */}
                                {isAddingSegment ? (
                                    <div className="downbeat-config-panel-add-segment-form">
                                        <div className="downbeat-config-panel-add-segment-row">
                                            <div className="downbeat-config-panel-add-segment-field">
                                                <label className="downbeat-config-panel-add-segment-label">
                                                    Start Beat
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={1}
                                                    max={maxBeatIndex}
                                                    value={newSegmentStartBeat}
                                                    onChange={(e) => setNewSegmentStartBeat(e.target.value)}
                                                    disabled={isDisabled}
                                                    size="sm"
                                                    placeholder="e.g., 32"
                                                />
                                            </div>
                                            <div className="downbeat-config-panel-add-segment-field">
                                                <label className="downbeat-config-panel-add-segment-label">
                                                    Time Signature
                                                </label>
                                                <div className="downbeat-config-panel-add-segment-time-sigs">
                                                    {TIME_SIGNATURES.map((beats) => (
                                                        <button
                                                            key={beats}
                                                            type="button"
                                                            className={`downbeat-config-panel-time-sig-btn ${
                                                                newSegmentTimeSig === beats
                                                                    ? 'downbeat-config-panel-time-sig-btn--active'
                                                                    : ''
                                                            }`}
                                                            onClick={() => setNewSegmentTimeSig(beats)}
                                                            disabled={isDisabled}
                                                            aria-pressed={newSegmentTimeSig === beats}
                                                        >
                                                            {beats}/4
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="downbeat-config-panel-add-segment-row">
                                            <div className="downbeat-config-panel-add-segment-field">
                                                <label className="downbeat-config-panel-add-segment-label">
                                                    Downbeat Beat Index
                                                </label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    max={maxBeatIndex}
                                                    value={newSegmentDownbeat}
                                                    onChange={(e) => setNewSegmentDownbeat(e.target.value)}
                                                    disabled={isDisabled}
                                                    size="sm"
                                                    placeholder="e.g., 32"
                                                />
                                            </div>
                                        </div>
                                        <div className="downbeat-config-panel-add-segment-actions">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleCancelAddSegment}
                                                disabled={isDisabled}
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="primary"
                                                size="sm"
                                                onClick={handleAddSegment}
                                                disabled={
                                                    isDisabled ||
                                                    !newSegmentStartBeat ||
                                                    !newSegmentDownbeat ||
                                                    config.segments.some(
                                                        (s: DownbeatSegment) => s.startBeat === parseInt(newSegmentStartBeat, 10)
                                                    )
                                                }
                                            >
                                                Add Segment
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        leftIcon={Plus}
                                        onClick={() => setIsAddingSegment(true)}
                                        disabled={isDisabled}
                                        className="downbeat-config-panel-add-segment-btn"
                                    >
                                        Add Segment at Beat...
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions - Task 2.8 / Task 5.3 */}
                    <div className="downbeat-config-panel-actions">
                        {/* Task 5.3: Edit Downbeat / Done toggle button */}
                        <Button
                            variant={isSelectionMode ? 'primary' : 'outline'}
                            size="sm"
                            disabled={isDisabled}
                            leftIcon={isSelectionMode ? Check : MousePointer2}
                            onClick={() => {
                                useBeatDetectionStore.getState().actions.setDownbeatSelectionMode(!isSelectionMode);
                            }}
                        >
                            {isSelectionMode ? 'Done' : 'Edit Downbeat'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={isDisabled || !hasCustomConfig}
                            leftIcon={RotateCcw}
                            onClick={() => {
                                useBeatDetectionStore.getState().actions.resetDownbeatConfig();
                            }}
                        >
                            Reset to Default
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
