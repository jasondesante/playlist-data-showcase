/**
 * BeatStreamModeToggle Component
 *
 * Toggle for selecting the beat stream mode during practice.
 * Options: Detected Only, Merged (interpolated), Subdivided.
 *
 * Extracted from BeatPracticeView.tsx (Task 6.1)
 */
import type { InterpolatedBeatMap, SubdividedBeatMap } from '../../types';
import './BeatStreamModeToggle.css';

export type BeatStreamMode = 'detected' | 'merged' | 'subdivided';

interface BeatStreamModeToggleProps {
  /** Currently selected beat stream mode */
  mode: BeatStreamMode;
  /** Callback when mode changes */
  onModeChange: (mode: BeatStreamMode) => void;
  /** Interpolated beat map (for merged mode availability) */
  interpolatedBeatMap: InterpolatedBeatMap | null;
  /** Subdivided beat map (for subdivided mode availability) */
  subdividedBeatMap: SubdividedBeatMap | null;
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
}: BeatStreamModeToggleProps) {
  const description = getModeDescription(mode, interpolatedBeatMap, subdividedBeatMap);

  return (
    <div className="beat-practice-stream-toggle-container">
      <span className="beat-practice-stream-toggle-label">Beat Stream</span>
      <div className="beat-practice-stream-toggles">
        <button
          type="button"
          className={`beat-practice-stream-toggle ${mode === 'detected' ? 'beat-practice-stream-toggle--active' : ''}`}
          onClick={() => onModeChange('detected')}
          aria-pressed={mode === 'detected'}
        >
          <span className="beat-practice-stream-toggle-text">Detected Only</span>
        </button>
        <button
          type="button"
          className={`beat-practice-stream-toggle ${mode === 'merged' ? 'beat-practice-stream-toggle--active' : ''} ${!interpolatedBeatMap ? 'beat-practice-stream-toggle--disabled' : ''}`}
          onClick={() => interpolatedBeatMap && onModeChange('merged')}
          disabled={!interpolatedBeatMap}
          aria-pressed={mode === 'merged'}
          title={!interpolatedBeatMap ? 'Interpolation not available' : undefined}
        >
          <span className="beat-practice-stream-toggle-text">Merged</span>
          {!interpolatedBeatMap && <span className="beat-practice-stream-toggle-indicator">✦</span>}
        </button>
        <button
          type="button"
          className={`beat-practice-stream-toggle ${mode === 'subdivided' ? 'beat-practice-stream-toggle--active' : ''} ${!subdividedBeatMap ? 'beat-practice-stream-toggle--disabled' : ''}`}
          onClick={() => subdividedBeatMap && onModeChange('subdivided')}
          disabled={!subdividedBeatMap}
          aria-pressed={mode === 'subdivided'}
          title={!subdividedBeatMap ? 'Subdivision not available - generate in Analysis tab' : undefined}
        >
          <span className="beat-practice-stream-toggle-text">Subdivided</span>
          {!subdividedBeatMap && <span className="beat-practice-stream-toggle-indicator">✦</span>}
        </button>
      </div>
      <span className="beat-practice-stream-toggle-description">
        {description}
      </span>
    </div>
  );
}
