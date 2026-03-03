/**
 * Unit Tests for useKeyboardInput Hook
 *
 * Task 9.2: Test keyboard input hook for rhythm game practice mode
 * - Test arrow key mapping
 * - Test number key mapping
 * - Test key repeat prevention
 * - Test multiple key tracking
 * - Test scroll blocking
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardInput } from '../hooks/useKeyboardInput';
import type { SupportedKey } from '../types';

// ============================================================
// Helper Functions
// ============================================================

/**
 * Create a mock keyboard event with the specified key code.
 */
function createKeyboardEvent(
    type: 'keydown' | 'keyup',
    code: string,
    options: Partial<KeyboardEvent> = {}
): KeyboardEvent {
    const event = new KeyboardEvent(type, {
        key: code,
        code,
        bubbles: true,
        cancelable: true,
        ...options,
    });

    // Override the repeat property if specified
    if (options.repeat !== undefined) {
        Object.defineProperty(event, 'repeat', {
            value: options.repeat,
            writable: false,
        });
    }

    return event;
}

/**
 * Fire a keydown event on the window.
 */
function fireKeyDown(code: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
    const event = createKeyboardEvent('keydown', code, options);
    window.dispatchEvent(event);
    return event;
}

/**
 * Fire a keyup event on the window.
 */
function fireKeyUp(code: string, options: Partial<KeyboardEvent> = {}): KeyboardEvent {
    const event = createKeyboardEvent('keyup', code, options);
    window.dispatchEvent(event);
    return event;
}

// ============================================================
// Task 9.2.1: Test Arrow Key Mapping
// ============================================================

describe('useKeyboardInput - Arrow Key Mapping', () => {
    it('should map ArrowUp to "up"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        expect(result.current.pressedKey).toBeNull();

        act(() => {
            fireKeyDown('ArrowUp');
        });

        expect(result.current.pressedKey).toBe('up');
    });

    it('should map ArrowDown to "down"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowDown');
        });

        expect(result.current.pressedKey).toBe('down');
    });

    it('should map ArrowLeft to "left"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowLeft');
        });

        expect(result.current.pressedKey).toBe('left');
    });

    it('should map ArrowRight to "right"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowRight');
        });

        expect(result.current.pressedKey).toBe('right');
    });

    it('should clear pressedKey when arrow key is released', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
        });
        expect(result.current.pressedKey).toBe('up');

        act(() => {
            fireKeyUp('ArrowUp');
        });
        expect(result.current.pressedKey).toBeNull();
    });

    it('should update keyDownList when arrow key is pressed and released', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowLeft');
        });
        expect(result.current.keyDownList).toContain('left');
        expect(result.current.keyDownList).toHaveLength(1);

        act(() => {
            fireKeyUp('ArrowLeft');
        });
        expect(result.current.keyDownList).toHaveLength(0);
    });
});

// ============================================================
// Task 9.2.2: Test Number Key Mapping
// ============================================================

describe('useKeyboardInput - Number Key Mapping', () => {
    it('should map Digit1 to "1"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('Digit1');
        });

        expect(result.current.pressedKey).toBe('1');
    });

    it('should map Digit2 to "2"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('Digit2');
        });

        expect(result.current.pressedKey).toBe('2');
    });

    it('should map Digit3 to "3"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('Digit3');
        });

        expect(result.current.pressedKey).toBe('3');
    });

    it('should map Digit4 to "4"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('Digit4');
        });

        expect(result.current.pressedKey).toBe('4');
    });

    it('should map Digit5 to "5"', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('Digit5');
        });

        expect(result.current.pressedKey).toBe('5');
    });

    it('should support numpad number keys (Numpad1-5)', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('Numpad1');
        });
        expect(result.current.pressedKey).toBe('1');

        act(() => {
            fireKeyUp('Numpad1');
            fireKeyDown('Numpad3');
        });
        expect(result.current.pressedKey).toBe('3');

        act(() => {
            fireKeyUp('Numpad3');
            fireKeyDown('Numpad5');
        });
        expect(result.current.pressedKey).toBe('5');
    });

    it('should clear pressedKey when number key is released', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('Digit2');
        });
        expect(result.current.pressedKey).toBe('2');

        act(() => {
            fireKeyUp('Digit2');
        });
        expect(result.current.pressedKey).toBeNull();
    });
});

// ============================================================
// Task 9.2.3: Test Key Repeat Prevention
// ============================================================

describe('useKeyboardInput - Key Repeat Prevention', () => {
    it('should ignore keydown events with repeat=true', () => {
        const { result } = renderHook(() => useKeyboardInput());

        // First press
        act(() => {
            fireKeyDown('ArrowUp');
        });
        expect(result.current.pressedKey).toBe('up');

        // Simulate key repeat (holding the key down)
        act(() => {
            const event = fireKeyDown('ArrowUp', { repeat: true });
            // The hook should not process this event
        });

        // pressedKey should still be 'up' (no change, no duplicate in keyDownList)
        expect(result.current.pressedKey).toBe('up');
        expect(result.current.keyDownList).toHaveLength(1);
    });

    it('should not add duplicate keys to keyDownList on repeat', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('Digit1');
        });
        expect(result.current.keyDownList).toHaveLength(1);

        // Simulate multiple repeat events
        act(() => {
            fireKeyDown('Digit1', { repeat: true });
            fireKeyDown('Digit1', { repeat: true });
            fireKeyDown('Digit1', { repeat: true });
        });

        // Should still only have one key in the list
        expect(result.current.keyDownList).toHaveLength(1);
        expect(result.current.keyDownList).toContain('1');
    });

    it('should handle repeat events for different keys independently', () => {
        const { result } = renderHook(() => useKeyboardInput());

        // Press first key
        act(() => {
            fireKeyDown('ArrowLeft');
        });
        expect(result.current.keyDownList).toHaveLength(1);

        // Press second key
        act(() => {
            fireKeyDown('ArrowRight');
        });
        expect(result.current.keyDownList).toHaveLength(2);

        // Repeat events for both keys
        act(() => {
            fireKeyDown('ArrowLeft', { repeat: true });
            fireKeyDown('ArrowRight', { repeat: true });
        });

        // Should still have exactly 2 keys
        expect(result.current.keyDownList).toHaveLength(2);
        expect(result.current.keyDownList).toContain('left');
        expect(result.current.keyDownList).toContain('right');
    });
});

// ============================================================
// Task 9.2.4: Test Multiple Key Tracking
// ============================================================

describe('useKeyboardInput - Multiple Key Tracking', () => {
    it('should track multiple held keys simultaneously', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
        });
        expect(result.current.keyDownList).toEqual(['up']);

        act(() => {
            fireKeyDown('ArrowDown');
        });
        expect(result.current.keyDownList).toHaveLength(2);
        expect(result.current.keyDownList).toContain('up');
        expect(result.current.keyDownList).toContain('down');

        act(() => {
            fireKeyDown('ArrowLeft');
        });
        expect(result.current.keyDownList).toHaveLength(3);
        expect(result.current.keyDownList).toContain('left');
    });

    it('should update keyDownList when keys are released in any order', () => {
        const { result } = renderHook(() => useKeyboardInput());

        // Press three keys
        act(() => {
            fireKeyDown('ArrowUp');
            fireKeyDown('ArrowDown');
            fireKeyDown('ArrowLeft');
        });
        expect(result.current.keyDownList).toHaveLength(3);

        // Release middle key first
        act(() => {
            fireKeyUp('ArrowDown');
        });
        expect(result.current.keyDownList).toHaveLength(2);
        expect(result.current.keyDownList).toContain('up');
        expect(result.current.keyDownList).toContain('left');
        expect(result.current.keyDownList).not.toContain('down');

        // Release first key
        act(() => {
            fireKeyUp('ArrowUp');
        });
        expect(result.current.keyDownList).toHaveLength(1);
        expect(result.current.keyDownList).toContain('left');
    });

    it('should track both arrow and number keys together', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
            fireKeyDown('Digit1');
            fireKeyDown('Digit2');
        });

        expect(result.current.keyDownList).toHaveLength(3);
        expect(result.current.keyDownList).toContain('up');
        expect(result.current.keyDownList).toContain('1');
        expect(result.current.keyDownList).toContain('2');
    });

    it('should set pressedKey to most recent remaining key when current is released', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
            fireKeyDown('ArrowDown');
        });
        expect(result.current.pressedKey).toBe('down'); // Most recent

        act(() => {
            fireKeyUp('ArrowDown');
        });
        // pressedKey should update to remaining key
        expect(result.current.pressedKey).toBe('up');
    });

    it('should clear pressedKey when all keys are released', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
            fireKeyDown('ArrowDown');
        });
        expect(result.current.pressedKey).not.toBeNull();

        act(() => {
            fireKeyUp('ArrowUp');
            fireKeyUp('ArrowDown');
        });

        expect(result.current.pressedKey).toBeNull();
        expect(result.current.keyDownList).toHaveLength(0);
    });
});

// ============================================================
// Task 9.2.5: Test Scroll Blocking (Arrow Key preventDefault)
// ============================================================

describe('useKeyboardInput - Scroll Blocking', () => {
    it('should call preventDefault on ArrowUp keydown', () => {
        renderHook(() => useKeyboardInput());

        const event = createKeyboardEvent('keydown', 'ArrowUp');
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should call preventDefault on ArrowDown keydown', () => {
        renderHook(() => useKeyboardInput());

        const event = createKeyboardEvent('keydown', 'ArrowDown');
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should call preventDefault on ArrowLeft keydown', () => {
        renderHook(() => useKeyboardInput());

        const event = createKeyboardEvent('keydown', 'ArrowLeft');
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should call preventDefault on ArrowRight keydown', () => {
        renderHook(() => useKeyboardInput());

        const event = createKeyboardEvent('keydown', 'ArrowRight');
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should NOT call preventDefault on number key keydown', () => {
        renderHook(() => useKeyboardInput());

        const event = createKeyboardEvent('keydown', 'Digit1');
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it('should NOT call preventDefault on unsupported keys', () => {
        renderHook(() => useKeyboardInput());

        const event = createKeyboardEvent('keydown', 'KeyA');
        const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

        act(() => {
            window.dispatchEvent(event);
        });

        expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
});

// ============================================================
// Additional Tests: Hook Configuration Options
// ============================================================

describe('useKeyboardInput - Configuration Options', () => {
    describe('enabled option', () => {
        it('should not track keys when enabled=false', () => {
            const { result } = renderHook(() => useKeyboardInput({ enabled: false }));

            act(() => {
                fireKeyDown('ArrowUp');
            });

            expect(result.current.pressedKey).toBeNull();
            expect(result.current.keyDownList).toHaveLength(0);
        });

        it('should clear state when disabled after keys pressed', () => {
            const { result, rerender } = renderHook(
                ({ enabled }) => useKeyboardInput({ enabled }),
                { initialProps: { enabled: true } }
            );

            act(() => {
                fireKeyDown('ArrowUp');
            });
            expect(result.current.pressedKey).toBe('up');

            // Disable the hook
            rerender({ enabled: false });

            expect(result.current.pressedKey).toBeNull();
            expect(result.current.keyDownList).toHaveLength(0);
        });

        it('should start tracking when enabled changes from false to true', () => {
            const { result, rerender } = renderHook(
                ({ enabled }) => useKeyboardInput({ enabled }),
                { initialProps: { enabled: false } }
            );

            expect(result.current.pressedKey).toBeNull();

            // Enable the hook
            rerender({ enabled: true });

            act(() => {
                fireKeyDown('ArrowDown');
            });

            expect(result.current.pressedKey).toBe('down');
        });
    });

    describe('onKeyDown callback', () => {
        it('should call onKeyDown callback when supported key is pressed', () => {
            const onKeyDown = vi.fn();
            renderHook(() => useKeyboardInput({ onKeyDown }));

            act(() => {
                fireKeyDown('ArrowUp');
            });

            expect(onKeyDown).toHaveBeenCalledTimes(1);
            expect(onKeyDown).toHaveBeenCalledWith('up', expect.any(KeyboardEvent));
        });

        it('should not call onKeyDown for unsupported keys', () => {
            const onKeyDown = vi.fn();
            renderHook(() => useKeyboardInput({ onKeyDown }));

            act(() => {
                fireKeyDown('KeyA');
            });

            expect(onKeyDown).not.toHaveBeenCalled();
        });

        it('should not call onKeyDown for repeat events', () => {
            const onKeyDown = vi.fn();
            renderHook(() => useKeyboardInput({ onKeyDown }));

            act(() => {
                fireKeyDown('ArrowUp');
                fireKeyDown('ArrowUp', { repeat: true });
            });

            expect(onKeyDown).toHaveBeenCalledTimes(1); // Only first press
        });
    });

    describe('onKeyUp callback', () => {
        it('should call onKeyUp callback when supported key is released', () => {
            const onKeyUp = vi.fn();
            renderHook(() => useKeyboardInput({ onKeyUp }));

            act(() => {
                fireKeyDown('ArrowUp');
                fireKeyUp('ArrowUp');
            });

            expect(onKeyUp).toHaveBeenCalledTimes(1);
            expect(onKeyUp).toHaveBeenCalledWith('up', expect.any(KeyboardEvent));
        });

        it('should not call onKeyUp for unsupported keys', () => {
            const onKeyUp = vi.fn();
            renderHook(() => useKeyboardInput({ onKeyUp }));

            act(() => {
                fireKeyDown('KeyA');
                fireKeyUp('KeyA');
            });

            expect(onKeyUp).not.toHaveBeenCalled();
        });
    });
});

// ============================================================
// Additional Tests: clearKeys Function
// ============================================================

describe('useKeyboardInput - clearKeys Function', () => {
    it('should clear all tracked state when clearKeys is called', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
            fireKeyDown('ArrowDown');
            fireKeyDown('Digit1');
        });

        expect(result.current.pressedKey).not.toBeNull();
        expect(result.current.keyDownList).toHaveLength(3);
        expect(result.current.pressedAt).not.toBeNull();

        act(() => {
            result.current.clearKeys();
        });

        expect(result.current.pressedKey).toBeNull();
        expect(result.current.keyDownList).toHaveLength(0);
        expect(result.current.pressedAt).toBeNull();
    });

    it('should allow pressing new keys after clearKeys', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
        });
        expect(result.current.pressedKey).toBe('up');

        act(() => {
            result.current.clearKeys();
        });

        act(() => {
            fireKeyDown('ArrowDown');
        });
        expect(result.current.pressedKey).toBe('down');
    });
});

// ============================================================
// Additional Tests: pressedAt Timestamp
// ============================================================

describe('useKeyboardInput - pressedAt Timestamp', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('should set pressedAt when key is pressed', () => {
        const { result } = renderHook(() => useKeyboardInput());

        const beforeTime = performance.now();

        act(() => {
            fireKeyDown('ArrowUp');
        });

        expect(result.current.pressedAt).toBeGreaterThanOrEqual(beforeTime);
        expect(result.current.pressedAt).toBeLessThanOrEqual(performance.now());
    });

    it('should clear pressedAt when all keys are released', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
        });
        expect(result.current.pressedAt).not.toBeNull();

        act(() => {
            fireKeyUp('ArrowUp');
        });
        expect(result.current.pressedAt).toBeNull();
    });

    it('should update pressedAt on new key press', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
        });
        const firstTimestamp = result.current.pressedAt;

        // Small delay
        vi.advanceTimersByTime(10);

        act(() => {
            fireKeyDown('ArrowDown');
        });

        expect(result.current.pressedAt).toBeGreaterThan(firstTimestamp!);
    });
});

// ============================================================
// Additional Tests: Edge Cases
// ============================================================

describe('useKeyboardInput - Edge Cases', () => {
    it('should ignore unsupported keys', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('KeyA');
            fireKeyDown('KeyB');
            fireKeyDown('Space');
            fireKeyDown('Enter');
        });

        expect(result.current.pressedKey).toBeNull();
        expect(result.current.keyDownList).toHaveLength(0);
    });

    it('should handle rapid press/release cycles', () => {
        const { result } = renderHook(() => useKeyboardInput());

        for (let i = 0; i < 10; i++) {
            act(() => {
                fireKeyDown('ArrowUp');
                fireKeyUp('ArrowUp');
            });
        }

        expect(result.current.pressedKey).toBeNull();
        expect(result.current.keyDownList).toHaveLength(0);
    });

    it('should handle pressing the same key twice without release (defensive)', () => {
        const { result } = renderHook(() => useKeyboardInput());

        act(() => {
            fireKeyDown('ArrowUp');
        });
        expect(result.current.keyDownList).toHaveLength(1);

        // Try pressing the same key again without repeat flag (edge case)
        act(() => {
            fireKeyDown('ArrowUp');
        });

        // Should still only have one instance
        expect(result.current.keyDownList).toHaveLength(1);
    });

    it('should handle releasing a key that was never pressed', () => {
        const { result } = renderHook(() => useKeyboardInput());

        // Release a key that was never pressed
        act(() => {
            fireKeyUp('ArrowUp');
        });

        expect(result.current.pressedKey).toBeNull();
        expect(result.current.keyDownList).toHaveLength(0);
    });

    it('should cleanup event listeners on unmount', () => {
        const addSpy = vi.spyOn(window, 'addEventListener');
        const removeSpy = vi.spyOn(window, 'removeEventListener');

        const { unmount } = renderHook(() => useKeyboardInput());

        expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(addSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

        unmount();

        expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
        expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function));

        addSpy.mockRestore();
        removeSpy.mockRestore();
    });
});
