/**
 * BeatStreamModeToggle Component
 *
 * Toggle for selecting the beat stream mode during practice.
 * Options: Detected Only, Merged (interpolated), Subdivided.
 *
 * Note: "Detected Only" and "Merged" are only available when viewMode is "off" (tap area).
 * Lane views (DDR/Guitar Hero) require "Subdivided" mode.
 * When Subdivision Playground is active, only "Merged" is available.
 *
 * Extracted from BeatPracticeView.tsx (Task 6.1)
 */
import type { InterpolatedBeatMap, SubdividedBeatMap } from '../../../types';
import './BeatStreamModeToggle.css';

export type BeatStreamMode = 'detected' | 'merged' | 'subdivided';
export type KeyLaneViewMode = 'off' | 'ddr' | 'guitar-hero';

interface BeatStreamModeToggleProps {
  /** Currently selected beat stream mode */
  mode: BeatStreamMode;
  /** Callback when mode changes */
  onModeChange: (mode: BeatStreamMode) => void;
  /** Interpolated beat map (for merged mode availability) */
  interpolatedBeatMap: InterpolatedBeatMap | null;
  /** Subdivided beat map (for subdivided mode availability) */
  subdividedBeatMap: SubdividedBeatMap | null;
  /** Current view mode - determines which beat stream modes are available */
  viewMode?: KeyLaneViewMode;
  /** Whether subdivision playground is active (forces merged mode) */
  subdivisionPlaygroundActive?: boolean;
}

/**
 * Get description text for beat stream mode
 */
function getModeDescription(
  mode: BeatStreamMode,
  interpolatedBeatMap: InterpolatedBeatMap | null,
  subdividedBeatMap: SubdividedBeatMap | null
): string {
  switch (mode) {
    case 'detected':
      return 'Using originally detected beats';
    case 'merged':
      return interpolatedBeatMap
        ? 'Using interpolated beats with detected anchors'
        : 'Interpolation not available';
    case 'subdivided':
      if (subdividedBeatMap) {
        const subdivisions = subdividedBeatMap.subdivisionMetadata.subdivisionsUsed;
        return `Using ${subdivisions.join(' → ')} subdivision`;
      }
      return 'Subdivision not available';
    default:
      return 'Unknown mode';
  }
}

export function BeatStreamModeToggle({
  mode,
  onModeChange,
  interpolatedBeatMap,
  subdividedBeatMap,
  viewMode = 'off',
  subdivisionPlaygroundActive = false,
}: BeatStreamModeToggleProps) {
  const description = getModeDescription(mode, interpolatedBeatMap, subdividedBeatMap);

  // Lane views require subdivided mode - disable detected and merged options
  const isLaneView = viewMode === 'ddr' || viewMode === 'guitar-hero';

  // Subdivision playground requires merged mode - disable detected and subdivided options
  const isPlaygroundActive = subdivisionPlaygroundActive && !isLaneView;

  // Determine disabled states for each button
  const detectedDisabled = isLaneView || isPlaygroundActive;
  const mergedDisabled = isLaneView || !interpolatedBeatMap;
  const subdividedDisabled = isPlaygroundActive || !subdividedBeatMap;

  // Get appropriate title for disabled buttons
  const getDisabledTitle = (option: 'detected' | 'merged' | 'subdivided'): string | undefined => {
    if (isLaneView) {
      return 'Only available in Tap Area view';
    }
    if (isPlaygroundActive) {
      return 'Not available while Subdivision Playground is active';
    }
    if (option === 'merged' && !interpolatedBeatMap) {
      return 'Interpolation not available';
    }
    if (option === 'subdivided' && !subdividedBeatMap) {
      return 'Subdivision not available - generate in Analysis tab';
    }
    return undefined;
  };

  return (
    <div className="beat-practice-stream-toggle-container">
      <span className="beat-practice-stream-toggle-label">Beat Stream</span>
      <div className="beat-practice-stream-toggles">
        <button
          type="button"
          className={`beat-practice-stream-toggle ${mode === 'detected' ? 'beat-practice-stream-toggle--active' : ''} ${detectedDisabled ? 'beat-practice-stream-toggle--disabled' : ''}`}
          onClick={() => !detectedDisabled && onModeChange('detected')}
          disabled={detectedDisabled}
          aria-pressed={mode === 'detected'}
          title={getDisabledTitle('detected')}
        >
          <span className="beat-practice-stream-toggle-text">Detected Only</span>
          {(isLaneView || isPlaygroundActive) && <span className="beat-practice-stream-toggle-indicator">✦</span>}
        </button>
        <button
          type="button"
          className={`beat-practice-stream-toggle ${mode === 'merged' ? 'beat-practice-stream-toggle--active' : ''} ${mergedDisabled ? 'beat-practice-stream-toggle--disabled' : ''}`}
          onClick={() => !mergedDisabled && onModeChange('merged')}
          disabled={mergedDisabled}
          aria-pressed={mode === 'merged'}
          title={getDisabledTitle('merged')}
        >
          <span className="beat-practice-stream-toggle-text">Merged</span>
          {(isLaneView || !interpolatedBeatMap) && <span className="beat-practice-stream-toggle-indicator">✦</span>}
        </button>
        <button
          type="button"
          className={`beat-practice-stream-toggle ${mode === 'subdivided' ? 'beat-practice-stream-toggle--active' : ''} ${subdividedDisabled ? 'beat-practice-stream-toggle--disabled' : ''}`}
          onClick={() => !subdividedDisabled && onModeChange('subdivided')}
          disabled={subdividedDisabled}
          aria-pressed={mode === 'subdivided'}
          title={getDisabledTitle('subdivided')}
        >
          <span className="beat-practice-stream-toggle-text">Subdivided</span>
          {(isPlaygroundActive || !subdividedBeatMap) && <span className="beat-practice-stream-toggle-indicator">✦</span>}
        </button>
      </div>
      <span className="beat-practice-stream-toggle-description">
        {description}
      </span>
    </div>
  );
}
