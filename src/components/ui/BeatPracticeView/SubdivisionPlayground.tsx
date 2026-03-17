/**
 * SubdivisionPlayground Component
 *
 * Controls for real-time subdivision switching during practice mode.
 * Includes subdivision buttons and transition mode configuration.
 *
 * Extracted from BeatPracticeView.tsx (Phase 6: Task 6.4, 6.7)
 */
import { Layers, Zap } from 'lucide-react';
import type { SubdivisionType } from 'playlist-data-engine';
import { SubdivisionButtons } from '../SubdivisionButtons';
import './SubdivisionPlayground.css';

export type TransitionMode = 'immediate' | 'next-downbeat' | 'next-measure';

interface SubdivisionPlaygroundProps {
  /** Whether subdivision playback is available */
  available: boolean;
  /** Whether the playground is visible */
  visible: boolean;
  /** Currently selected subdivision */
  currentSubdivision: SubdivisionType;
  /** Whether subdivision playback is currently active */
  isActive: boolean;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Current transition mode */
  transitionMode: TransitionMode;
  /** Callback when subdivision changes */
  onSubdivisionChange: (subdivision: SubdivisionType) => void;
  /** Callback when transition mode changes */
  onTransitionModeChange: (mode: TransitionMode) => void;
}

/**
 * Get description text for transition mode
 */
function getTransitionDescription(mode: TransitionMode): string {
  switch (mode) {
    case 'immediate':
      return 'Subdivision changes apply instantly';
    case 'next-downbeat':
      return 'Changes apply on next beat 1';
    case 'next-measure':
      return 'Changes apply when entering new measure';
    default:
      return '';
  }
}

export function SubdivisionPlayground({
  available,
  visible,
  currentSubdivision,
  isActive,
  isPlaying,
  transitionMode,
  onSubdivisionChange,
  onTransitionModeChange,
}: SubdivisionPlaygroundProps) {
  if (!available || !visible) {
    return null;
  }

  return (
    <div className="beat-practice-subdivision-container">
      <div className="beat-practice-subdivision-header">
        <Layers className="beat-practice-subdivision-icon" />
        <span className="beat-practice-subdivision-title">Subdivision Playground</span>
        {isActive && (
          <span className="beat-practice-subdivision-active-indicator">Active</span>
        )}
      </div>
      <SubdivisionButtons
        currentSubdivision={currentSubdivision}
        onSubdivisionChange={onSubdivisionChange}
        disabled={false}
        isActive={isPlaying && isActive && currentSubdivision !== 'quarter'}
      />

      {/* Transition Mode Toggle (Phase 6: Task 6.7) */}
      <div className="beat-practice-transition-mode">
        <div className="beat-practice-transition-mode-header">
          <Zap className="beat-practice-transition-mode-icon" />
          <span className="beat-practice-transition-mode-label">Transition</span>
        </div>
        <div className="beat-practice-transition-mode-toggles">
          <button
            type="button"
            className={`beat-practice-transition-toggle ${transitionMode === 'immediate' ? 'beat-practice-transition-toggle--active' : ''}`}
            onClick={() => onTransitionModeChange('immediate')}
            aria-pressed={transitionMode === 'immediate'}
            title="Switch subdivision instantly"
          >
            <span className="beat-practice-transition-toggle-text">Instant</span>
          </button>
          <button
            type="button"
            className={`beat-practice-transition-toggle ${transitionMode === 'next-downbeat' ? 'beat-practice-transition-toggle--active' : ''}`}
            onClick={() => onTransitionModeChange('next-downbeat')}
            aria-pressed={transitionMode === 'next-downbeat'}
            title="Apply at next beat 1"
          >
            <span className="beat-practice-transition-toggle-text">Downbeat</span>
          </button>
          <button
            type="button"
            className={`beat-practice-transition-toggle ${transitionMode === 'next-measure' ? 'beat-practice-transition-toggle--active' : ''}`}
            onClick={() => onTransitionModeChange('next-measure')}
            aria-pressed={transitionMode === 'next-measure'}
            title="Apply when entering new measure"
          >
            <span className="beat-practice-transition-toggle-text">Next Measure</span>
          </button>
        </div>
        <span className="beat-practice-transition-mode-description">
          {getTransitionDescription(transitionMode)}
        </span>
      </div>
    </div>
  );
}
