/**
 * CustomThresholdEditor Component
 *
 * Editor for custom accuracy thresholds in beat tap evaluation.
 * Part of Task 3.2: Create CustomThresholdEditor Component
 *
 * Features:
 * - 4 sliders for perfect, great, good, ok thresholds
 * - Values displayed in milliseconds (converted from seconds)
 * - Validation for ascending order requirement
 * - Visual representation of threshold ranges
 */
import './CustomThresholdEditor.css';
import { useMemo } from 'react';
import type { AccuracyThresholds } from '@/types';
import { validateThresholds, HARD_ACCURACY_THRESHOLDS } from '@/types';

export interface CustomThresholdEditorProps {
  /** Current custom thresholds (in seconds) */
  thresholds: Partial<AccuracyThresholds>;
  /** Callback when a threshold value changes */
  onChange: (key: keyof AccuracyThresholds, value: number) => void;
  /** Optional className for additional styling */
  className?: string;
  /** Whether the editor is disabled */
  disabled?: boolean;
}

/**
 * Threshold configuration for rendering
 */
interface ThresholdConfig {
  key: keyof AccuracyThresholds;
  label: string;
  description: string;
  colorClass: string;
  minMs: number;
  maxMs: number;
  stepMs: number;
}

const THRESHOLD_CONFIGS: ThresholdConfig[] = [
  {
    key: 'perfect',
    label: 'Perfect',
    description: '± timing window',
    colorClass: 'custom-threshold__slider--perfect',
    minMs: 5,
    maxMs: 100,
    stepMs: 1,
  },
  {
    key: 'great',
    label: 'Great',
    description: '± timing window',
    colorClass: 'custom-threshold__slider--great',
    minMs: 10,
    maxMs: 150,
    stepMs: 1,
  },
  {
    key: 'good',
    label: 'Good',
    description: '± timing window',
    colorClass: 'custom-threshold__slider--good',
    minMs: 25,
    maxMs: 200,
    stepMs: 1,
  },
  {
    key: 'ok',
    label: 'OK',
    description: '± timing window',
    colorClass: 'custom-threshold__slider--ok',
    minMs: 50,
    maxMs: 350,
    stepMs: 5,
  },
];

/**
 * Convert seconds to milliseconds for display
 */
const toMilliseconds = (seconds: number): number => Math.round(seconds * 1000);

/**
 * Convert milliseconds to seconds for storage
 */
const toSeconds = (milliseconds: number): number => milliseconds / 1000;

/**
 * CustomThresholdEditor Component
 *
 * Renders sliders for editing custom accuracy thresholds.
 * Values are stored in seconds internally but displayed in milliseconds.
 */
export function CustomThresholdEditor({
  thresholds,
  onChange,
  className = '',
  disabled = false,
}: CustomThresholdEditorProps) {
  // Validate thresholds and get errors
  const validation = useMemo(() => {
    // Fill in defaults for missing thresholds to validate complete set
    const fullThresholds: Partial<AccuracyThresholds> = {
      ...HARD_ACCURACY_THRESHOLDS,
      ...thresholds,
    };
    return validateThresholds(fullThresholds);
  }, [thresholds]);

  // Get effective thresholds for visualization (merge with hard defaults)
  const effectiveThresholds = useMemo((): AccuracyThresholds => ({
    ...HARD_ACCURACY_THRESHOLDS,
    ...thresholds,
  }), [thresholds]);

  // Calculate slider value percentage for CSS custom property
  const getSliderPercent = (key: keyof AccuracyThresholds, config: ThresholdConfig): number => {
    const valueMs = toMilliseconds(effectiveThresholds[key]);
    return ((valueMs - config.minMs) / (config.maxMs - config.minMs)) * 100;
  };

  // Handle slider change
  const handleSliderChange = (config: ThresholdConfig, valueMs: number) => {
    const seconds = toSeconds(valueMs);
    onChange(config.key, seconds);
  };

  return (
    <div className={`custom-threshold ${className}`}>
      {/* Validation errors */}
      {validation.errors.length > 0 && (
        <div className="custom-threshold__errors" role="alert">
          {validation.errors.map((error, index) => (
            <div key={index} className="custom-threshold__error">
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Threshold sliders */}
      <div className="custom-threshold__sliders">
        {THRESHOLD_CONFIGS.map((config) => {
          const valueMs = toMilliseconds(effectiveThresholds[config.key]);
          const sliderPercent = getSliderPercent(config.key, config);

          return (
            <div key={config.key} className="custom-threshold__row">
              <div className="custom-threshold__header">
                <label
                  className="custom-threshold__label"
                  htmlFor={`threshold-${config.key}`}
                >
                  {config.label}
                </label>
                <div className="custom-threshold__value-container">
                  <span className="custom-threshold__value">
                    ±{valueMs}
                    <span className="custom-threshold__unit">ms</span>
                  </span>
                </div>
              </div>

              <div className="custom-threshold__slider-container">
                <input
                  id={`threshold-${config.key}`}
                  type="range"
                  className={`custom-threshold__slider ${config.colorClass}`}
                  style={{ '--slider-value': `${sliderPercent}%` } as React.CSSProperties}
                  min={config.minMs}
                  max={config.maxMs}
                  step={config.stepMs}
                  value={valueMs}
                  onChange={(e) => handleSliderChange(config, Number(e.target.value))}
                  disabled={disabled}
                  aria-label={`${config.label} threshold in milliseconds`}
                />
                <div className="custom-threshold__slider-marks">
                  <span className="custom-threshold__slider-mark">{config.minMs}ms</span>
                  <span className="custom-threshold__slider-mark">{config.maxMs}ms</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual representation of threshold ranges */}
      <div className="custom-threshold__visualization">
        <div className="custom-threshold__viz-title">Timing Windows</div>
        <div className="custom-threshold__viz-bar">
          <div
            className="custom-threshold__viz-segment custom-threshold__viz-segment--perfect"
            style={{ width: `${(effectiveThresholds.perfect / effectiveThresholds.ok) * 100}%` }}
            title={`Perfect: ±${toMilliseconds(effectiveThresholds.perfect)}ms`}
          />
          <div
            className="custom-threshold__viz-segment custom-threshold__viz-segment--great"
            style={{ width: `${((effectiveThresholds.great - effectiveThresholds.perfect) / effectiveThresholds.ok) * 100}%` }}
            title={`Great: ±${toMilliseconds(effectiveThresholds.great)}ms`}
          />
          <div
            className="custom-threshold__viz-segment custom-threshold__viz-segment--good"
            style={{ width: `${((effectiveThresholds.good - effectiveThresholds.great) / effectiveThresholds.ok) * 100}%` }}
            title={`Good: ±${toMilliseconds(effectiveThresholds.good)}ms`}
          />
          <div
            className="custom-threshold__viz-segment custom-threshold__viz-segment--ok"
            style={{ width: `${((effectiveThresholds.ok - effectiveThresholds.good) / effectiveThresholds.ok) * 100}%` }}
            title={`OK: ±${toMilliseconds(effectiveThresholds.ok)}ms`}
          />
        </div>
        <div className="custom-threshold__viz-legend">
          <div className="custom-threshold__viz-legend-item">
            <span className="custom-threshold__viz-dot custom-threshold__viz-dot--perfect" />
            <span>Perfect</span>
          </div>
          <div className="custom-threshold__viz-legend-item">
            <span className="custom-threshold__viz-dot custom-threshold__viz-dot--great" />
            <span>Great</span>
          </div>
          <div className="custom-threshold__viz-legend-item">
            <span className="custom-threshold__viz-dot custom-threshold__viz-dot--good" />
            <span>Good</span>
          </div>
          <div className="custom-threshold__viz-legend-item">
            <span className="custom-threshold__viz-dot custom-threshold__viz-dot--ok" />
            <span>OK</span>
          </div>
        </div>
      </div>

      {/* Help text */}
      <p className="custom-threshold__help">
        Values must be in ascending order: Perfect &lt; Great &lt; Good &lt; OK.
        Smaller values are stricter.
      </p>
    </div>
  );
}

export default CustomThresholdEditor;
