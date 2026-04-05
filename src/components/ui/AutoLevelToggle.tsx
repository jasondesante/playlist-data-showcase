/**
 * AutoLevelToggle Component
 *
 * Mode selector for switching between manual and automatic
 * rhythm generation modes. Displays as a centered pill toggle
 * with Manual/Automatic labels.
 *
 * Features:
 * - Segmented control style (Manual | Automatic)
 * - Smooth animated highlight between modes
 * - Info tooltip explaining the feature
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
 * A segmented control that switches between manual and automatic
 * rhythm generation modes. Displayed as a centered pill toggle.
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

    const handleSelect = (mode: GenerationMode) => {
        if (disabled) return;
        onChange(mode);
    };

    const updateTooltipPosition = () => {
        if (infoBtnRef.current) {
            const rect = infoBtnRef.current.getBoundingClientRect();
            setTooltipPosition({
                top: rect.bottom + 8,
                left: Math.max(8, rect.left - 150),
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
                {/* Segmented control */}
                <div className="auto-level-toggle-segmented" role="radiogroup" aria-label="Level generation mode">
                    <button
                        type="button"
                        role="radio"
                        aria-checked={value === 'manual'}
                        className={cn(
                            'auto-level-toggle-segment',
                            value === 'manual' && 'auto-level-toggle-segment--active',
                            disabled && 'auto-level-toggle-segment--disabled'
                        )}
                        onClick={() => handleSelect('manual')}
                        disabled={disabled}
                    >
                        <span className="auto-level-toggle-segment-label">Manual</span>
                    </button>
                    <button
                        type="button"
                        role="radio"
                        aria-checked={value === 'automatic'}
                        className={cn(
                            'auto-level-toggle-segment',
                            value === 'automatic' && 'auto-level-toggle-segment--active',
                            disabled && 'auto-level-toggle-segment--disabled'
                        )}
                        onClick={() => handleSelect('automatic')}
                        disabled={disabled}
                    >
                        <span className="auto-level-toggle-segment-label">Automatic</span>
                    </button>
                    <div
                        className={cn(
                            'auto-level-toggle-indicator',
                            value === 'automatic' && 'auto-level-toggle-indicator--right'
                        )}
                    />
                </div>

                {/* Info button */}
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
