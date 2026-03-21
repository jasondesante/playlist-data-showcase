/**
 * PracticeProgressBar Component
 *
 * Interactive progress bar for seeking within the audio track during practice mode.
 * Displays beat markers and supports mouse/touch dragging.
 *
 * Part of the BeatPracticeView refactoring.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import type { BeatMap } from '@/types';

interface PracticeProgressBarProps {
  /** The beat map containing beat timestamps for marker display */
  beatMap: BeatMap;
  /** Current playback position in seconds */
  currentTime: number;
  /** Total duration of the track in seconds */
  duration: number;
  /** Callback when user seeks to a new position */
  onSeek: (time: number) => void;
}

export function PracticeProgressBar({
  beatMap,
  currentTime,
  duration,
  onSeek,
}: PracticeProgressBarProps) {
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [isDraggingProgress, setIsDraggingProgress] = useState(false);

  // Calculate progress percentage
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  /**
   * Calculate time from progress bar position
   */
  const getTimeFromPosition = useCallback((clientX: number): number => {
    if (!progressBarRef.current || duration === 0) return 0;

    const rect = progressBarRef.current.getBoundingClientRect();
    const relativeX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return relativeX * duration;
  }, [duration]);

  /**
   * Handle progress bar mouse down - start drag
   */
  const handleProgressMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingProgress(true);
    const time = getTimeFromPosition(e.clientX);
    onSeek(time);
  }, [getTimeFromPosition, onSeek]);

  /**
   * Handle progress bar mouse move during drag
   */
  const handleProgressMouseMove = useCallback((e: MouseEvent) => {
    if (!isDraggingProgress) return;
    const time = getTimeFromPosition(e.clientX);
    onSeek(time);
  }, [isDraggingProgress, getTimeFromPosition, onSeek]);

  /**
   * Handle progress bar mouse up - end drag
   */
  const handleProgressMouseUp = useCallback(() => {
    setIsDraggingProgress(false);
  }, []);

  /**
   * Handle progress bar touch start
   */
  const handleProgressTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDraggingProgress(true);
    const time = getTimeFromPosition(touch.clientX);
    onSeek(time);
  }, [getTimeFromPosition, onSeek]);

  /**
   * Handle progress bar touch move
   */
  const handleProgressTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDraggingProgress) return;
    const touch = e.touches[0];
    const time = getTimeFromPosition(touch.clientX);
    onSeek(time);
  }, [isDraggingProgress, getTimeFromPosition, onSeek]);

  /**
   * Handle progress bar touch end
   */
  const handleProgressTouchEnd = useCallback(() => {
    setIsDraggingProgress(false);
  }, []);

  /**
   * Add global mouse event listeners when dragging progress bar
   */
  useEffect(() => {
    if (isDraggingProgress) {
      window.addEventListener('mousemove', handleProgressMouseMove);
      window.addEventListener('mouseup', handleProgressMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleProgressMouseMove);
        window.removeEventListener('mouseup', handleProgressMouseUp);
      };
    }
  }, [isDraggingProgress, handleProgressMouseMove, handleProgressMouseUp]);

  return (
    <div className="beat-practice-progress-container">
      <div
        ref={progressBarRef}
        className={`beat-practice-progress-bar ${isDraggingProgress ? 'beat-practice-progress-bar--dragging' : ''}`}
        onMouseDown={handleProgressMouseDown}
        onTouchStart={handleProgressTouchStart}
        onTouchMove={handleProgressTouchMove}
        onTouchEnd={handleProgressTouchEnd}
        role="slider"
        aria-label="Song progress"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        tabIndex={0}
      >
        {/* Background track */}
        <div className="beat-practice-progress-track" />

        {/* Progress fill */}
        <div
          className="beat-practice-progress-fill"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Beat markers on progress bar */}
        <div className="beat-practice-progress-beats">
          {beatMap.beats.filter((_, i) => i % Math.ceil(beatMap.beats.length / 50) === 0).map((beat, i) => (
            <div
              key={i}
              className={`beat-practice-progress-beat ${beat.isDownbeat ? 'beat-practice-progress-beat--downbeat' : ''}`}
              style={{ left: `${(beat.timestamp / duration) * 100}%` }}
            />
          ))}
        </div>

        {/* Playhead handle */}
        <div
          className="beat-practice-progress-handle"
          style={{ left: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
