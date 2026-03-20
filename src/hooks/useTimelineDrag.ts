/**
 * useTimelineDrag Hook
 *
 * Provides drag-to-scrub functionality for timeline components.
 * This hook handles:
 * - Mouse down/move/up event handling
 * - Time delta calculation based on drag distance
 * - Seeking to new time position
 *
 * Part of Task 9.2: Create shared timeline utilities
 *
 * @example
 * ```tsx
 * const { isDragging, handleMouseDown } = useTimelineDrag({
 *   trackRef,
 *   smoothTime,
 *   duration: trackDuration,
 *   anticipationWindow: 2.0,
 *   onSeek: handleSeek,
 * });
 *
 * <div
 *   ref={trackRef}
 *   onMouseDown={handleMouseDown}
 *   className={isDragging ? 'dragging' : ''}
 * >
 *   ...
 * </div>
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseTimelineDragOptions {
  /** Ref to the timeline track element */
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** Current smooth time (from useTimelineAnimation) */
  smoothTime: number;
  /** Total duration of the track in seconds */
  duration: number;
  /** Anticipation window in seconds (affects drag sensitivity) */
  anticipationWindow: number;
  /** Optional past window in seconds (for full window calculation) */
  pastWindow?: number;
  /** Callback when user seeks to a new time position */
  onSeek?: (time: number) => void;
}

export interface UseTimelineDragResult {
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Mouse down handler to attach to the track element */
  handleMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Hook for drag-to-scrub functionality on timelines.
 * Handles mouse events and calculates time deltas for seeking.
 */
export function useTimelineDrag({
  trackRef,
  smoothTime,
  duration,
  anticipationWindow,
  pastWindow = anticipationWindow,
  onSeek,
}: UseTimelineDragOptions): UseTimelineDragResult {
  // State for tracking drag
  const [isDragging, setIsDragging] = useState(false);

  // Refs to track drag state (refs don't trigger re-renders)
  const dragStartXRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);

  /**
   * Handle mouse down on track - start dragging.
   * Captures the initial click position and time.
   */
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek || !trackRef.current) return;

      event.preventDefault();
      setIsDragging(true);

      // Capture the initial position and time
      dragStartXRef.current = event.clientX;
      dragStartTimeRef.current = smoothTime;
    },
    [onSeek, smoothTime, trackRef]
  );

  /**
   * Handle mouse move during drag.
   * Calculates delta from initial position and applies to initial time.
   */
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !onSeek || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const trackWidth = rect.width;

      // Calculate how far we've moved from the start position (in pixels)
      const deltaX = event.clientX - dragStartXRef.current;

      // Convert pixel delta to time delta (negated for intuitive drag direction)
      // Full track width = anticipationWindow + pastWindow seconds
      // Drag right = pull content from future = go backward in time
      const totalWindow = anticipationWindow + pastWindow;
      const timePerPixel = totalWindow / trackWidth;
      const deltaTime = -deltaX * timePerPixel;

      // Apply delta to the initial time
      const newTime = Math.max(0, Math.min(duration, dragStartTimeRef.current + deltaTime));

      onSeek(newTime);
    },
    [isDragging, onSeek, anticipationWindow, pastWindow, duration, trackRef]
  );

  /**
   * Handle mouse up - end drag
   */
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Add/remove global mouse event listeners when dragging
   */
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return {
    isDragging,
    handleMouseDown,
  };
}

export default useTimelineDrag;
