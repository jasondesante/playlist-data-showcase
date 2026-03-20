/**
 * AutoLevelToggle Component
 *
 * Toggle switch for enabling automatic rhythm level generation mode.
 * When enabled, beat detection automatically generates rhythm patterns
 * using the playlist-data-engine RhythmGenerator.
 *
 * Task 2.1 of AUTO_LEVEL_GENERATION_UI_PLAN.md
 *
 * Features:
 * - Simple toggle switch with "Auto" label
 * - Beta badge indicating experimental feature
 * - Tooltip explaining the feature
 * - Does NOT persist preference (always starts in manual mode)
 */

import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import './AutoLevelToggle.css';

export type GenerationMode = 'manual' | 'automatic';

export interface AutoLevelToggleProps {
    /** Currently selected generation mode */
    value: GenerationMode;
    /** Callback when mode changes */
    onChange: (mode: GenerationMode) => void;
    /** Optional additional CSS classes */
    className?: string;
    /** Whether the toggle is disabled */
    disabled?: boolean;
}

/**
 * AutoLevelToggle Component
 *
 * A simple toggle switch that switches between manual and automatic
 * rhythm generation modes.
 */
export function AutoLevelToggle({
    value,
    onChange,
    className,
    disabled = false,
}: AutoLevelToggleProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
    const infoBtnRef = useRef<HTMLButtonElement>(null);
    const isAuto = value === 'automatic';

    const handleToggle = () => {
        if (disabled) return;
        onChange(isAuto ? 'manual' : 'automatic');
    };

    const updateTooltipPosition = () => {
        if (infoBtnRef.current) {
            const rect = infoBtnRef.current.getBoundingClientRect();
            setTooltipPosition({
                top: rect.bottom + 8,
                left: rect.left,
            });
        }
    };

    const handleMouseEnter = () => {
        updateTooltipPosition();
        setShowTooltip(true);
    };

    const handleMouseLeave = () => {
        setShowTooltip(false);
    };

    return (
        <div className={cn('auto-level-toggle-wrapper', className)}>
            <div className="auto-level-toggle-container">
                <label className="auto-level-toggle-label">
                    <span className="auto-level-toggle-text">Auto</span>
                    <span className="auto-level-toggle-beta-badge">Beta</span>
                </label>

                <button
                    type="button"
                    role="switch"
                    aria-checked={isAuto}
                    aria-label="Toggle automatic level generation"
                    className={cn(
                        'auto-level-toggle-switch',
                        isAuto && 'auto-level-toggle-switch--active',
                        disabled && 'auto-level-toggle-switch--disabled'
                    )}
                    onClick={handleToggle}
                    disabled={disabled}
                >
                    <span className="auto-level-toggle-slider" />
                </button>

                <button
                    ref={infoBtnRef}
                    type="button"
                    className="auto-level-toggle-info-btn"
                    onClick={() => setShowTooltip(!showTooltip)}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    aria-label="Show info about automatic level generation"
                    aria-expanded={showTooltip}
                >
                    <Info size={14} />
                </button>

                {showTooltip && createPortal(
                    <div
                        className="auto-level-toggle-tooltip"
                        role="tooltip"
                        style={{
                            position: 'fixed',
                            top: `${tooltipPosition.top}px`,
                            left: `${tooltipPosition.left}px`,
                        }}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        <div className="auto-level-toggle-tooltip-content">
                            <p>
                                <strong>Automatic Mode:</strong> After beat detection, the system automatically generates
                                rhythm patterns using transient detection, multi-band analysis, and quantization.
                            </p>
                            <p>
                                <strong>Manual Mode:</strong> You manually configure subdivisions and key assignments
                                for full control over the rhythm chart.
                            </p>
                        </div>
                        <button
                            type="button"
                            className="auto-level-toggle-tooltip-close"
                            onClick={() => setShowTooltip(false)}
                            aria-label="Close tooltip"
                        >
                            x
                        </button>
                    </div>,
                    document.body
                )}
            </div>
        </div>
    );
}

export default AutoLevelToggle;
