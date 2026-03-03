/**
 * useKeyboardInput Hook
 *
 * React hook for capturing keyboard input for rhythm game practice mode.
 * Supports both DDR-style arrow keys and Guitar Hero-style number keys,
 * with both input modes active simultaneously.
 *
 * Features:
 * - Arrow key mapping: ArrowUp -> 'up', ArrowDown -> 'down', etc.
 * - Number key mapping: 1-5 -> '1', '2', '3', '4', '5'
 * - Key repeat prevention (ignores held key auto-repeat events)
 * - Tracks currently held keys (keyDownList)
 * - Tracks most recently pressed key (pressedKey)
 * - Always prevents default browser behavior for arrow keys (blocks page scrolling)
 *
 * Part of Phase 3: Keyboard Input Hook (Task 3.1, 3.2)
 *
 * @example
 * ```tsx
 * const { pressedKey, keyDownList, clearKeys } = useKeyboardInput({ enabled: true });
 *
 * // pressedKey is the most recently pressed key
 * console.log('Pressed:', pressedKey); // 'up', 'down', '1', '2', etc.
 *
 * // keyDownList is array of currently held keys
 * console.log('Held keys:', keyDownList); // ['up', 'left'] for simultaneous press
 *
 * // Clear all tracked keys (useful when exiting practice mode)
 * clearKeys();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupportedKey } from '@/types';

/**
 * Map keyboard event codes to SupportedKey values.
 *
 * Arrow keys map to DDR-style directions:
 * - ArrowUp -> 'up'
 * - ArrowDown -> 'down'
 * - ArrowLeft -> 'left'
 * - ArrowRight -> 'right'
 *
 * Number keys (top row) map to Guitar Hero-style:
 * - Digit1 -> '1'
 * - Digit2 -> '2'
 * - Digit3 -> '3'
 * - Digit4 -> '4'
 * - Digit5 -> '5'
 *
 * Numpad numbers also map to Guitar Hero-style:
 * - Numpad1 -> '1'
 * - Numpad2 -> '2'
 * - Numpad3 -> '3'
 * - Numpad4 -> '4'
 * - Numpad5 -> '5'
 */
const KEY_CODE_MAP: Record<string, SupportedKey> = {
    // DDR arrow keys
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    // Guitar Hero number keys (top row)
    Digit1: '1',
    Digit2: '2',
    Digit3: '3',
    Digit4: '4',
    Digit5: '5',
    // Guitar Hero number keys (numpad)
    Numpad1: '1',
    Numpad2: '2',
    Numpad3: '3',
    Numpad4: '4',
    Numpad5: '5',
};

/**
 * Set of key codes that are arrow keys (for scroll blocking).
 */
const ARROW_KEY_CODES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * Props for the useKeyboardInput hook.
 */
export interface UseKeyboardInputProps {
    /**
     * Whether the hook should listen for keyboard events.
     * When false, all key tracking is disabled and pressedKey/keyDownList are cleared.
     * @default true
     */
    enabled?: boolean;

    /**
     * Callback fired when a supported key is pressed.
     * Called with the SupportedKey value and the original keyboard event.
     * Useful for triggering actions on key press without polling state.
     */
    onKeyDown?: (key: SupportedKey, event: KeyboardEvent) => void;

    /**
     * Callback fired when a supported key is released.
     * Called with the SupportedKey value and the original keyboard event.
     */
    onKeyUp?: (key: SupportedKey, event: KeyboardEvent) => void;
}

/**
 * Return type for the useKeyboardInput hook.
 */
export interface UseKeyboardInputReturn {
    /**
     * The most recently pressed supported key.
     * Set to null when all keys are released or when disabled.
     * This is the key that should be used for tap accuracy checking.
     */
    pressedKey: SupportedKey | null;

    /**
     * Array of currently held (pressed but not released) keys.
     * Useful for detecting simultaneous key presses.
     * Empty array when no keys are held or when disabled.
     */
    keyDownList: SupportedKey[];

    /**
     * Timestamp (performance.now()) of the most recent key press.
     * Null when no keys have been pressed or when disabled.
     * Useful for timing accuracy calculations.
     */
    pressedAt: number | null;

    /**
     * Clear all tracked key state.
     * Call this when exiting practice mode to reset state.
     */
    clearKeys: () => void;
}

/**
 * React hook for capturing keyboard input for rhythm game practice mode.
 *
 * This hook sets up global keyboard event listeners and tracks:
 * - The most recently pressed supported key (for tap accuracy)
 * - All currently held keys (for multi-key detection)
 * - The timestamp of the most recent key press (for timing)
 *
 * Both DDR-style arrow keys and Guitar Hero-style number keys are supported
 * simultaneously, allowing players to use whichever input method they prefer.
 *
 * Arrow key page scrolling is always prevented while the hook is enabled.
 *
 * @param props - Hook configuration options
 * @returns Object containing pressedKey, keyDownList, pressedAt, and clearKeys
 */
export function useKeyboardInput({
    enabled = true,
    onKeyDown,
    onKeyUp,
}: UseKeyboardInputProps = {}): UseKeyboardInputReturn {
    // State for the most recently pressed key
    const [pressedKey, setPressedKey] = useState<SupportedKey | null>(null);

    // State for currently held keys
    const [keyDownList, setKeyDownList] = useState<SupportedKey[]>([]);

    // State for press timestamp
    const [pressedAt, setPressedAt] = useState<number | null>(null);

    // Ref to track which keys are currently held (for O(1) lookup)
    const heldKeysRef = useRef<Set<SupportedKey>>(new Set());

    /**
     * Clear all tracked key state.
     */
    const clearKeys = useCallback(() => {
        setPressedKey(null);
        setKeyDownList([]);
        setPressedAt(null);
        heldKeysRef.current.clear();
    }, []);

    /**
     * Handle keydown events.
     * - Ignores key repeat events (event.repeat)
     * - Maps key codes to SupportedKey values
     * - Prevents default for arrow keys (blocks page scroll)
     * - Updates pressedKey and keyDownList state
     * - Fires onKeyDown callback
     */
    useEffect(() => {
        if (!enabled) {
            // Clear state when disabled
            clearKeys();
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            // Ignore key repeat events (when user holds down the key)
            if (event.repeat) {
                return;
            }

            // Check if this is a supported key
            const supportedKey = KEY_CODE_MAP[event.code];
            if (!supportedKey) {
                return;
            }

            // Always prevent default for arrow keys to block page scrolling
            if (ARROW_KEY_CODES.has(event.code)) {
                event.preventDefault();
            }

            // Check if key is already held (shouldn't happen, but be defensive)
            if (heldKeysRef.current.has(supportedKey)) {
                return;
            }

            // Add to held keys set
            heldKeysRef.current.add(supportedKey);

            // Update state
            const timestamp = performance.now();
            setPressedKey(supportedKey);
            setPressedAt(timestamp);
            setKeyDownList(Array.from(heldKeysRef.current));

            // Fire callback
            onKeyDown?.(supportedKey, event);

            // Log for debugging
            // logger.debug('KeyboardInput', 'Key pressed', {
            //     code: event.code,
            //     key: supportedKey,
            //     heldKeys: Array.from(heldKeysRef.current),
            //     timestamp,
            // });
        };

        const handleKeyUp = (event: KeyboardEvent) => {
            // Check if this is a supported key
            const supportedKey = KEY_CODE_MAP[event.code];
            if (!supportedKey) {
                return;
            }

            // Remove from held keys set
            heldKeysRef.current.delete(supportedKey);

            // Update state
            const remainingKeys = Array.from(heldKeysRef.current);
            setKeyDownList(remainingKeys);

            // If no more keys held, clear pressedKey
            if (remainingKeys.length === 0) {
                setPressedKey(null);
                setPressedAt(null);
            } else {
                // Set pressedKey to the most recent remaining key
                // (This is a simplification - in practice, we'd track which key
                // was pressed most recently, but for rhythm games, the player
                // typically releases keys in order anyway)
                setPressedKey(remainingKeys[remainingKeys.length - 1]);
            }

            // Fire callback
            onKeyUp?.(supportedKey, event);

            // Log for debugging
            // logger.debug('KeyboardInput', 'Key released', {
            //     code: event.code,
            //     key: supportedKey,
            //     remainingKeys,
            // });
        };

        // Add global event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [enabled, clearKeys, onKeyDown, onKeyUp]);

    return {
        pressedKey,
        keyDownList,
        pressedAt,
        clearKeys,
    };
}

export default useKeyboardInput;
