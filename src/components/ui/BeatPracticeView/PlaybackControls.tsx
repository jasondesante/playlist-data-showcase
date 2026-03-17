/**
 * PlaybackControls Component
 *
 * Playback control buttons for practice mode.
 * Includes restart and play/pause buttons.
 *
 * Part of the BeatPracticeView refactoring.
 */

import { Play, Pause, SkipBack } from 'lucide-react';
import { Button } from '../Button';

interface PlaybackControlsProps {
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Callback to restart the track from the beginning */
  onRestart: () => void;
  /** Callback to toggle play/pause */
  onPlayPause: () => void;
}

export function PlaybackControls({
  isPlaying,
  onRestart,
  onPlayPause,
}: PlaybackControlsProps) {
  return (
    <div className="beat-practice-controls">
      <Button
        variant="ghost"
        size="sm"
        onClick={onRestart}
        leftIcon={SkipBack}
        aria-label="Restart"
      >
        Restart
      </Button>
      <Button
        variant="primary"
        size="lg"
        onClick={onPlayPause}
        leftIcon={isPlaying ? Pause : Play}
        className="beat-practice-play-button"
      >
        {isPlaying ? 'Pause' : 'Play'}
      </Button>
    </div>
  );
}
