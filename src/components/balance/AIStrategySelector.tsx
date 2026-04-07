/**
 * AI Strategy Selector Component (Task 8.2.2)
 *
 * Visual selector for AI play style with descriptions.
 * Per-side configuration (Players / Enemies).
 * Uses radio-style cards for Normal and Aggressive strategies.
 */

import { type AIPlayStyle } from 'playlist-data-engine';
import { AI_STYLE_OPTIONS } from '@/types/simulation';
import './AIStrategySelector.css';

interface AIStrategySelectorProps {
    /** Which side this selector configures */
    side: 'player' | 'enemy';
    /** Currently selected strategy */
    value: AIPlayStyle;
    /** Callback when strategy changes */
    onChange: (value: AIPlayStyle) => void;
    /** Whether the selector is disabled */
    disabled?: boolean;
}

export function AIStrategySelector({
    side,
    value,
    onChange,
    disabled = false,
}: AIStrategySelectorProps) {
    const sideLabel = side === 'player' ? 'Player Strategy' : 'Enemy Strategy';

    return (
        <div className="ai-strategy-selector">
            <label className="ai-strategy-label">{sideLabel}</label>
            <div className="ai-strategy-options" role="radiogroup" aria-label={sideLabel}>
                {AI_STYLE_OPTIONS.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        className={`ai-strategy-option ${value === option.value ? 'ai-strategy-active' : ''}`}
                        role="radio"
                        aria-checked={value === option.value}
                        disabled={disabled}
                        onClick={() => onChange(option.value)}
                    >
                        <span className="ai-strategy-name">{option.label}</span>
                        <span className="ai-strategy-desc">{option.description}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
