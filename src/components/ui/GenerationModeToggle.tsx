import { Target, Shuffle, Info } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useState } from 'react';
import '../../styles/components/GenerationModeToggle.css';

export type GenerationMode = 'deterministic' | 'random';

export interface GenerationModeToggleProps {
    /** Currently selected generation mode */
    value: GenerationMode;
    /** Callback when mode changes */
    onChange: (mode: GenerationMode) => void;
    /** Optional additional CSS classes */
    className?: string;
}

interface GenModeOption {
    value: GenerationMode;
    label: string;
    description: string;
    icon: typeof Target;
    badgeText: string;
}

const genModeOptions: GenModeOption[] = [
    {
        value: 'deterministic',
        label: 'Deterministic',
        description: 'Same track always yields the same hero',
        icon: Target,
        badgeText: 'STABLE RESULT',
    },
    {
        value: 'random',
        label: 'Non-Deterministic',
        description: 'Adds random spice to the generation',
        icon: Shuffle,
        badgeText: 'UNIQUE EVERY TIME',
    },
];

/**
 * GenerationModeToggle Component
 * 
 * Segmented control for selecting between deterministic and non-deterministic generation.
 * Styled to match the premium feel of GameModeToggle.
 */
export function GenerationModeToggle({ value, onChange, className }: GenerationModeToggleProps) {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className={cn('generation-mode-toggle-card', className)}>
            <div className="generation-mode-header">
                <h3 className="generation-mode-title">Generation Accuracy</h3>
                <div className="generation-mode-info-wrapper">
                    <button
                        type="button"
                        className="generation-mode-info-btn"
                        onClick={() => setShowTooltip(!showTooltip)}
                        aria-label="Show info"
                        aria-expanded={showTooltip}
                    >
                        <Info size={14} />
                    </button>
                    {showTooltip && (
                        <div className="generation-mode-tooltip" role="tooltip">
                            <div className="generation-mode-tooltip-content">
                                <p><strong>Deterministic:</strong> Uses the track ID as a fixed seed. Perfect for "identifying" the hero within a specific song.</p>
                                <p><strong>Non-Deterministic:</strong> Adds random noise to the seed. Generates a new unique character even for the same song.</p>
                            </div>
                            <button
                                type="button"
                                className="generation-mode-tooltip-close"
                                onClick={() => setShowTooltip(false)}
                                aria-label="Close tooltip"
                            >
                                ×
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="generation-mode-options" role="radiogroup" aria-label="Generation accuracy selection">
                {genModeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = value === option.value;

                    return (
                        <label
                            key={option.value}
                            className={cn(
                                'generation-mode-option',
                                isSelected && 'generation-mode-option-selected'
                            )}
                        >
                            <input
                                type="radio"
                                name="genmode"
                                value={option.value}
                                checked={isSelected}
                                onChange={() => onChange(option.value)}
                                className="generation-mode-radio"
                                aria-checked={isSelected}
                            />
                            <div className="generation-mode-option-content">
                                <div className="generation-mode-option-header">
                                    <Icon className="generation-mode-option-icon" size={18} />
                                    <span className="generation-mode-option-label">{option.label}</span>
                                    {isSelected && (
                                        <span className="generation-mode-badge">
                                            {option.badgeText}
                                        </span>
                                    )}
                                </div>
                                <span className="generation-mode-option-description">{option.description}</span>
                            </div>
                        </label>
                    );
                })}
            </div>
        </div>
    );
}

export default GenerationModeToggle;
