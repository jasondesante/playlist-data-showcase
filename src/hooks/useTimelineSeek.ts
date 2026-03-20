/**
 * useTimelineSeek Hook
 *
 * Provides combined drag-to-scrub and click-to-seek functionality for timeline components.
 * This hook handles:
 * - Mouse down/move/up event handling
 * - Drag threshold detection to distinguish clicks from drags
 * - Click-to-seek with position calculation
 * - Drag-to-scrub with time delta calculation
 *
 * Part of Task 9.2: Create shared timeline utilities
 *
 * @example
 * ```tsx
 * const { isDragging, handleMouseDown } = useTimelineSeek({
 *   trackRef,
 *   smoothTime,
 *   duration: trackDuration,
 *   anticipationWindow: 2.0,
 *   pastWindow: 4.0,
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

/** Default drag threshold in pixels - movements smaller than this are considered clicks */
const DEFAULT_DRAG_THRESHOLD = 5;

export interface UseTimelineSeekOptions {
  /** Ref to the timeline track element */
  trackRef: React.RefObject<HTMLDivElement | null>;
  /** Current smooth time (from useTimelineAnimation) */
  smoothTime: number;
  /** Total duration of the track in seconds */
  duration: number;
  /** Anticipation window in seconds (affects drag sensitivity) */
  anticipationWindow: number;
  /** Past window in seconds (for click position calculation) */
  pastWindow: number;
  /** Callback when user seeks to a new time position */
  onSeek?: (time: number) => void;
  /** Drag threshold in pixels - smaller movements are treated as clicks */
  dragThreshold?: number;
}

export interface UseTimelineSeekResult {
  /** Whether the user is currently dragging */
  isDragging: boolean;
  /** Mouse down handler to attach to the track element */
  handleMouseDown: (event: React.MouseEvent<HTMLDivElement>) => void;
}

/**
 * Hook for combined drag-to-scrub and click-to-seek functionality.
 * Uses threshold detection to distinguish between clicks and drags.
 */
export function useTimelineSeek({
  trackRef,
  smoothTime,
  duration,
  anticipationWindow,
  pastWindow,
  onSeek,
  dragThreshold = DEFAULT_DRAG_THRESHOLD,
}: UseTimelineSeekOptions): UseTimelineSeekResult {
  // State for tracking drag
  const [isDragging, setIsDragging] = useState(false);

  // Refs to track drag state (refs don't trigger re-renders)
  const dragStartXRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);

  /**
   * Handle mouse down on track - start potential drag or click.
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
   * Handle mouse up - end drag or process click.
   * If the movement is smaller than the threshold, treat it as a click and seek to that position.
   */
  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!isDragging || !trackRef.current) {
        setIsDragging(false);
        return;
      }

      const rect = trackRef.current.getBoundingClientRect();
      const deltaX = event.clientX - dragStartXRef.current;

      // Check if this was a click (not a drag)
      if (Math.abs(deltaX) <= dragThreshold && onSeek) {
        // It was a click, not a drag - seek to the clicked position
        const clickX = event.clientX - rect.left;
        const trackWidth = rect.width;
        const totalWindow = anticipationWindow + pastWindow;
        const positionRatio = clickX / trackWidth;
        const timeFromPastStart = positionRatio * totalWindow;
        const newTime = Math.max(0, Math.min(duration, (smoothTime - pastWindow) + timeFromPastStart));
        onSeek(newTime);
      }

      setIsDragging(false);
    },
    [isDragging, onSeek, dragThreshold, anticipationWindow, pastWindow, duration, smoothTime, trackRef]
  );

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

export default useTimelineSeek;
