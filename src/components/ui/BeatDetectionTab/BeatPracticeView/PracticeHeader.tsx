/**
 * PracticeHeader Component
 *
 * Header bar for the practice mode containing:
 * - Title and difficulty badge
 * - Playground toggle button
 * - Settings button
 * - Exit button
 *
 * Part of the BeatPracticeView refactoring.
 */

import { Music, Layers, Settings, X } from 'lucide-react';
import { Button } from '../../Button';
import type { DifficultyPreset } from '../../../../types';

interface PracticeHeaderProps {
  /** Current difficulty preset */
  difficultyPreset: DifficultyPreset;
  /** Whether subdivision playback is available */
  subdivisionPlaybackAvailable: boolean;
  /** Whether the subdivision playground is currently visible */
  showSubdivisionPlayground: boolean;
  /** Callback to toggle subdivision playground visibility */
  onToggleSubdivisionPlayground: () => void;
  /** Callback to open settings panel */
  onOpenSettings: () => void;
  /** Callback to exit practice mode */
  onExit: () => void;
}

/**
 * Get display info for a difficulty preset
 */
function getDifficultyDisplayInfo(preset: DifficultyPreset): { label: string; className: string } {
  switch (preset) {
    case 'easy':
      return { label: 'Easy', className: 'beat-practice-difficulty--easy' };
    case 'medium':
      return { label: 'Medium', className: 'beat-practice-difficulty--medium' };
    case 'hard':
      return { label: 'Hard', className: 'beat-practice-difficulty--hard' };
    case 'custom':
      return { label: 'Custom', className: 'beat-practice-difficulty--custom' };
    default:
      return { label: 'Medium', className: 'beat-practice-difficulty--medium' };
  }
}

export function PracticeHeader({
  difficultyPreset,
  subdivisionPlaybackAvailable,
  showSubdivisionPlayground,
  onToggleSubdivisionPlayground,
  onOpenSettings,
  onExit,
}: PracticeHeaderProps) {
  const difficultyInfo = getDifficultyDisplayInfo(difficultyPreset);

  return (
    <div className="beat-practice-header">
      <div className="beat-practice-header-left">
        <Music className="beat-practice-header-icon" />
        <span className="beat-practice-title">Practice Mode</span>
        <span className={`beat-practice-difficulty-badge ${difficultyInfo.className}`}>
          {difficultyInfo.label}
        </span>
      </div>
      <div className="beat-practice-header-right">
        {subdivisionPlaybackAvailable && (
          <Button
            variant={showSubdivisionPlayground ? 'primary' : 'ghost'}
            size="sm"
            onClick={onToggleSubdivisionPlayground}
            leftIcon={Layers}
            aria-label="Toggle subdivision playground"
            title="Subdivision Playground"
          >
            Playground
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenSettings}
          leftIcon={Settings}
          aria-label="Open difficulty settings"
          title="Difficulty Settings"
        >
          Settings
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onExit}
          leftIcon={X}
          aria-label="Exit practice mode"
        >
          Exit
        </Button>
      </div>
    </div>
  );
}
