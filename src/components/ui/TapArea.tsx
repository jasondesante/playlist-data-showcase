/**
 * TapArea Component
 *
 * A dedicated tap button component for rhythm game practice mode.
 * Features:
 * - Large, prominent tap button (click/touch)
 * - Spacebar hotkey support (managed by parent)
 * - Visual feedback on tap:
 *   - Button press animation
 *   - Accuracy rating display: PERFECT / GREAT / GOOD / MISS
 *   - MS offset display: "+15ms" (late) or "-23ms" (early)
 *   - Color-coded flash overlay (green/yellow/orange/red)
 *
 * Part of Task 5.1: TapArea Component
 */
import { useCallback, useRef, useState, useEffect } from 'react';
import './TapArea.css';
import type { ExtendedButtonPressResult, ExtendedBeatAccuracy, SupportedKey } from '@/types';
import { getKeySymbol } from '@/types';

interface TapAreaProps {
  /** Callback when user taps (click or touch) */
  onTap: () => void;
  /** Whether the tap area is active (accepting input) */
  isActive?: boolean;
  /** The last tap result to display (if any) */
  lastTapResult?: ExtendedButtonPressResult | null;
  /** Whether to show the feedback animation */
  showFeedback?: boolean;
  /** Duration of feedback display in ms (default: 500) */
  feedbackDuration?: number;
  /** Callback when feedback animation completes */
  onFeedbackComplete?: () => void;
  /** Whether to show "TOO FAST" indicator (tap was debounced) */
  showTooFast?: boolean;
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Get the CSS color variable for an accuracy rating.
 */
function getAccuracyColorVar(accuracy: ExtendedBeatAccuracy): string {
  switch (accuracy) {
    case 'perfect':
      return 'var(--tap-perfect)';
    case 'great':
      return 'var(--tap-great)';
    case 'good':
      return 'var(--tap-good)';
    case 'ok':
      return 'var(--tap-ok)';
    case 'wrongKey':
      return 'var(--tap-wrong-key)';
    case 'miss':
    default:
      return 'var(--tap-miss)';
  }
}

/**
 * Get the display text for an accuracy rating.
 */
function getAccuracyText(accuracy: ExtendedBeatAccuracy): string {
  if (accuracy === 'wrongKey') {
    return 'WRONG KEY';
  }
  return accuracy.toUpperCase();
}

/**
 * Get the display symbol for a key.
 * Returns the key string as-is if it's not a recognized SupportedKey.
 */
function getKeyDisplaySymbol(key: string): string {
  const validKeys: SupportedKey[] = ['up', 'down', 'left', 'right', '1', '2', '3', '4', '5'];
  if (validKeys.includes(key as SupportedKey)) {
    return getKeySymbol(key as SupportedKey);
  }
  return key.toUpperCase();
}

/**
 * Format the offset in milliseconds with sign.
 */
function formatOffset(offsetMs: number): string {
  const sign = offsetMs >= 0 ? '+' : '';
  return `${sign}${Math.round(offsetMs)}ms`;
}

/**
 * TapArea Component
 *
 * Renders a large tap button with visual feedback for accuracy.
 * Designed for rhythm game practice mode where users tap in time with beats.
 */
export function TapArea({
  onTap,
  isActive = true,
  lastTapResult = null,
  showFeedback = false,
  feedbackDuration = 500,
  onFeedbackComplete,
  showTooFast = false,
  className = '',
}: TapAreaProps) {
  // Track if we're currently pressed (for animation)
  const [isPressed, setIsPressed] = useState(false);
  const pressTimeoutRef = useRef<number | null>(null);
  const feedbackTimeoutRef = useRef<number | null>(null);

  /**
   * Handle tap action (from click or touch)
   */
  const handleTap = useCallback(() => {
    if (!isActive) return;

    // Trigger press animation
    setIsPressed(true);

    // Clear any existing press timeout
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
    }

    // Reset press state after animation
    pressTimeoutRef.current = window.setTimeout(() => {
      setIsPressed(false);
    }, 100);

    // Call the tap callback
    onTap();
  }, [isActive, onTap]);

  /**
   * Handle touch events for mobile
   */
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleTap();
  }, [handleTap]);

  /**
   * Handle mouse down for desktop
   */
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    handleTap();
  }, [handleTap]);

  /**
   * Auto-hide feedback after duration
   */
  useEffect(() => {
    if (showFeedback && feedbackDuration > 0) {
      // Clear any existing timeout
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }

      // Set new timeout
      feedbackTimeoutRef.current = window.setTimeout(() => {
        onFeedbackComplete?.();
      }, feedbackDuration);
    }

    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [showFeedback, feedbackDuration, onFeedbackComplete]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (pressTimeoutRef.current) {
        clearTimeout(pressTimeoutRef.current);
      }
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, []);

  // Compute classes
  const containerClasses = [
    'tap-area',
    isActive ? 'tap-area--active' : 'tap-area--inactive',
    isPressed ? 'tap-area--pressed' : '',
    showFeedback ? 'tap-area--feedback' : '',
    showTooFast ? 'tap-area--too-fast' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={containerClasses}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      role="button"
      tabIndex={isActive ? 0 : -1}
      aria-label={`Tap to the beat${isActive ? '' : ' (inactive)'}`}
      aria-disabled={!isActive}
    >
      {/* "TOO FAST" indicator - shown when tap is debounced */}
      {showTooFast && (
        <div className="tap-area__too-fast">
          <span className="tap-area__too-fast-text">TOO FAST</span>
        </div>
      )}

      {/* Feedback overlay - shown when there's a tap result */}
      {showFeedback && lastTapResult && (
        <div
          className={[
            'tap-area__feedback',
            lastTapResult.accuracy === 'wrongKey' ? 'tap-area__feedback--wrong-key' : '',
          ].filter(Boolean).join(' ')}
          style={{
            '--tap-feedback-color': getAccuracyColorVar(lastTapResult.accuracy),
          } as React.CSSProperties}
        >
          <span className="tap-area__accuracy">
            {getAccuracyText(lastTapResult.accuracy)}
          </span>
          {/* Show key mismatch info for wrong key */}
          {lastTapResult.accuracy === 'wrongKey' && lastTapResult.pressedKey && lastTapResult.requiredKey && (
            <span className="tap-area__key-mismatch">
              <span className="tap-area__key-pressed">{getKeyDisplaySymbol(lastTapResult.pressedKey)}</span>
              <span className="tap-area__key-arrow">→</span>
              <span className="tap-area__key-required">{getKeyDisplaySymbol(lastTapResult.requiredKey)}</span>
            </span>
          )}
          {/* Show normal offset for non-wrong-key results */}
          {lastTapResult.accuracy !== 'wrongKey' && (
            <span className="tap-area__offset">
              {formatOffset(lastTapResult.offset * 1000)}
            </span>
          )}
        </div>
      )}

      {/* Default tap instruction */}
      {!showFeedback && (
        <div className="tap-area__instruction">
          <span className="tap-area__text">TAP</span>
          <span className="tap-area__hint">Press SPACE or click</span>
        </div>
      )}

      {/* Press ripple effect */}
      {isPressed && <div className="tap-area__ripple" />}
    </div>
  );
}

/**
 * Helper hook to manage tap feedback state.
 * Useful for parent components that need to coordinate feedback display.
 */
export function useTapFeedback(
  feedbackDuration: number = 500
): {
  showFeedback: boolean;
  lastTapResult: ExtendedButtonPressResult | null;
  showTapFeedback: (result: ExtendedButtonPressResult) => void;
  hideTapFeedback: () => void;
} {
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastTapResult, setLastTapResult] = useState<ExtendedButtonPressResult | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const showTapFeedback = useCallback((result: ExtendedButtonPressResult) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setLastTapResult(result);
    setShowFeedback(true);

    // Auto-hide after duration
    timeoutRef.current = window.setTimeout(() => {
      setShowFeedback(false);
    }, feedbackDuration);
  }, [feedbackDuration]);

  const hideTapFeedback = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setShowFeedback(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    showFeedback,
    lastTapResult,
    showTapFeedback,
    hideTapFeedback,
  };
}
