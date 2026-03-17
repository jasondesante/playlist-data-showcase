/**
 * ViewModeToggle Component
 *
 * Toggle for switching between practice view modes:
 * - Tap Area (classic spacebar/click tapping)
 * - DDR Lanes (4-lane arrow key gameplay)
 * - Guitar Lanes (5-lane number key gameplay)
 *
 * Extracted from BeatPracticeView.tsx (Phase 10: Task 10.3)
 */
import { Gamepad2 } from 'lucide-react';
import type { SubdividedBeatMap } from '../../../types';
import './ViewModeToggle.css';

export type KeyLaneViewMode = 'off' | 'ddr' | 'guitar-hero';

interface ViewModeToggleProps {
  /** Subdivided beat map (required for lane modes) */
  subdividedBeatMap: SubdividedBeatMap | null;
  /** Currently selected view mode */
  mode: KeyLaneViewMode;
  /** Callback when mode changes */
  onModeChange: (mode: KeyLaneViewMode) => void;
  /** Whether the chart has required key assignments */
  hasRequiredKeys: boolean;
  /** The chart style (ddr or guitar-hero) */
  chartStyle: 'ddr' | 'guitar-hero';
  /** Whether subdivision playground is active (disables lane views) */
  subdivisionPlaygroundActive?: boolean;
}

/**
 * Get description text for view mode
 */
function getModeDescription(
  mode: KeyLaneViewMode,
  hasRequiredKeys: boolean,
  chartStyle: 'ddr' | 'guitar-hero'
): { text: string; warning?: string } {
  switch (mode) {
    case 'off':
      return { text: 'Classic tap area - use spacebar or click' };
    case 'ddr':
      return {
        text: 'DDR style - use arrow keys to hit notes',
        warning: !hasRequiredKeys
          ? ' (no key assignments - edit chart first)'
          : chartStyle !== 'ddr'
            ? ` (style mismatch - chart is ${chartStyle})`
            : undefined,
      };
    case 'guitar-hero':
      return {
        text: 'Guitar Hero style - use number keys 1-5',
        warning: !hasRequiredKeys
          ? ' (no key assignments - edit chart first)'
          : chartStyle !== 'guitar-hero'
            ? ` (style mismatch - chart is ${chartStyle})`
            : undefined,
      };
    default:
      return { text: '' };
  }
}

export function ViewModeToggle({
  subdividedBeatMap,
  mode,
  onModeChange,
  hasRequiredKeys,
  chartStyle,
  subdivisionPlaygroundActive = false,
}: ViewModeToggleProps) {
  if (!subdividedBeatMap) {
    return null;
  }

  const { text, warning } = getModeDescription(mode, hasRequiredKeys, chartStyle);

  // Lane views are disabled when subdivision playground is active
  const laneViewsDisabled = subdivisionPlaygroundActive;

  // Get appropriate title for disabled lane view buttons
  const getLaneDisabledTitle = (): string | undefined => {
    if (subdivisionPlaygroundActive) {
      return 'Not available while Subdivision Playground is active';
    }
    return undefined;
  };

  return (
    <div className="beat-practice-view-mode-container">
      <div className="beat-practice-view-mode-header">
        <Gamepad2 className="beat-practice-view-mode-icon" />
        <span className="beat-practice-view-mode-title">Practice View</span>
        {hasRequiredKeys && (
          <span className="beat-practice-view-mode-chart-style">
            {chartStyle === 'ddr' ? 'DDR Chart' : 'Guitar Hero Chart'}
          </span>
        )}
      </div>
      <div className="beat-practice-view-mode-toggles">
        <button
          type="button"
          className={`beat-practice-view-toggle ${mode === 'off' ? 'beat-practice-view-toggle--active' : ''}`}
          onClick={() => onModeChange('off')}
          aria-pressed={mode === 'off'}
          title="Default tap area view"
        >
          <span className="beat-practice-view-toggle-text">Tap Area</span>
        </button>
        <button
          type="button"
          className={`beat-practice-view-toggle ${mode === 'ddr' ? 'beat-practice-view-toggle--active' : ''} ${laneViewsDisabled ? 'beat-practice-view-toggle--disabled' : ''}`}
          onClick={() => !laneViewsDisabled && onModeChange('ddr')}
          disabled={laneViewsDisabled}
          aria-pressed={mode === 'ddr'}
          title={getLaneDisabledTitle() || 'DDR 4-lane view (arrow keys)'}
        >
          <span className="beat-practice-view-toggle-text">DDR Lanes</span>
          {laneViewsDisabled && <span className="beat-practice-view-toggle-indicator">✦</span>}
        </button>
        <button
          type="button"
          className={`beat-practice-view-toggle ${mode === 'guitar-hero' ? 'beat-practice-view-toggle--active' : ''} ${laneViewsDisabled ? 'beat-practice-view-toggle--disabled' : ''}`}
          onClick={() => !laneViewsDisabled && onModeChange('guitar-hero')}
          disabled={laneViewsDisabled}
          aria-pressed={mode === 'guitar-hero'}
          title={getLaneDisabledTitle() || 'Guitar Hero 5-lane view (number keys 1-5)'}
        >
          <span className="beat-practice-view-toggle-text">Guitar Lanes</span>
          {laneViewsDisabled && <span className="beat-practice-view-toggle-indicator">✦</span>}
        </button>
      </div>
      <span className="beat-practice-view-mode-description">
        {text}
        {warning && (
          <span className="beat-practice-view-mode-warning">{warning}</span>
        )}
      </span>
    </div>
  );
}
