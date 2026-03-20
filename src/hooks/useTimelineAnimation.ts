/**
 * useTimelineAnimation Hook
 *
 * Provides smooth time interpolation for timeline components using requestAnimationFrame.
 * This hook handles:
 * - 60fps animation loop during playback
 * - Interpolation between audio time updates
 * - Proper cleanup and state management
 *
 * Part of Task 9.2: Create shared timeline utilities
 *
 * @example
 * ```tsx
 * const { smoothTime, trackRef } = useTimelineAnimation({
 *   currentTime: audioCurrentTime,
 *   isPlaying: isAudioPlaying,
 *   duration: trackDuration,
 * });
 * ```
 */

import { useEffect, useRef, useState } from 'react';

export interface UseTimelineAnimationOptions {
  /** Current playback time in seconds (from audio player) */
  currentTime: number;
  /** Whether the audio is currently playing */
  isPlaying: boolean;
  /** Total duration of the track in seconds */
  duration: number;
}

export interface UseTimelineAnimationResult {
  /** Interpolated time for smooth display */
  smoothTime: number;
  /** Ref to track the last audio time update (for debugging) */
  lastUpdateTimeRef: React.MutableRefObject<{ time: number; timestamp: number }>;
}

/**
 * Hook for smooth timeline animation.
 * Uses requestAnimationFrame to interpolate time between audio player updates.
 */
export function useTimelineAnimation({
  currentTime,
  isPlaying,
  duration,
}: UseTimelineAnimationOptions): UseTimelineAnimationResult {
  // Animation frame reference for cleanup
  const animationFrameRef = useRef<number | null>(null);

  // Smooth time state - updated at 60fps during playback
  const [smoothTime, setSmoothTime] = useState(currentTime);

  // Track audio time and when it was last updated (for interpolation)
  const lastAudioTimeRef = useRef<{ time: number; timestamp: number }>({
    time: currentTime,
    timestamp: performance.now(),
  });

  // Ref to track playing state (avoid stale closure in animation loop)
  const isPlayingRef = useRef(isPlaying);

  // Track previous isPlaying state to detect transitions
  const prevIsPlayingRef = useRef(isPlaying);

  // Keep refs in sync with props
  useEffect(() => {
    // Update the reference point whenever currentTime changes from the audio player
    lastAudioTimeRef.current = {
      time: currentTime,
      timestamp: performance.now(),
    };
  }, [currentTime]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Reset animation reference ONLY when playback transitions from paused to playing
  // This prevents initial jitter by ensuring the animation loop has a fresh timestamp
  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current;
    prevIsPlayingRef.current = isPlaying;

    // Only reset when transitioning from paused to playing
    if (isPlaying && !wasPlaying) {
      lastAudioTimeRef.current = {
        time: currentTime,
        timestamp: performance.now(),
      };
    }
  }, [isPlaying, currentTime]);

  /**
   * Animation loop for smooth scrolling.
   * Uses requestAnimationFrame for ~60fps updates.
   * Interpolates time between audio player updates.
   */
  useEffect(() => {
    if (!isPlaying) {
      // When paused, just use the current time directly (no animation)
      setSmoothTime(currentTime);
      return;
    }

    /**
     * The animation loop - runs at ~60fps
     * Calculates interpolated time based on last known audio time
     */
    const animate = () => {
      const now = performance.now();
      const { time: lastAudioTime, timestamp: lastUpdateTimestamp } = lastAudioTimeRef.current;

      // Calculate elapsed time since the last audio time update
      const elapsedMs = now - lastUpdateTimestamp;
      const elapsedSeconds = elapsedMs / 1000;

      // Interpolate the current playback time
      const interpolatedTime = lastAudioTime + elapsedSeconds;

      // Clamp to duration (if duration is known)
      const clampedTime = duration > 0 ? Math.min(interpolatedTime, duration) : interpolatedTime;

      // Update smooth time state
      setSmoothTime(clampedTime);

      // Continue animation if still playing
      if (isPlayingRef.current && (duration <= 0 || clampedTime < duration)) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    // Cleanup on unmount or when playback stops
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, duration]);

  /**
   * Handle seek events - immediately jump to new position.
   * This ensures smooth transition when user seeks to a different position.
   */
  useEffect(() => {
    // When not playing, update smooth time directly
    if (!isPlaying) {
      setSmoothTime(currentTime);
    }
    // When playing, the animation loop will pick up the new time
    // because lastAudioTimeRef is updated via the other effect
  }, [currentTime, isPlaying]);

  return {
    smoothTime,
    lastUpdateTimeRef: lastAudioTimeRef,
  };
}

export default useTimelineAnimation;
