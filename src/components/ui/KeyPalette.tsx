/**
 * KeyPalette Component
 *
 * A palette for selecting keys in the chart editor.
 * Part of Phase 4: Chart Editor UI - Task 4.1.
 *
 * Features:
 * - DDR mode: displays arrow keys only (up, down, left, right)
 * - Guitar Hero mode: displays number keys only (1-5)
 * - Highlights the currently selected key
 * - Click to select a key for painting
 * - Keyboard shortcuts for quick selection (arrow keys for DDR, 1-5 for Guitar Hero)
 * - Visual symbols: arrows for DDR, numbers for Guitar Hero
 * - Classic color scheme per key
 *
 * @component
 */

import { useCallback, useEffect, useRef } from 'react';
import './KeyPalette.css';
import {
    ChartStyle,
    SupportedKey,
    GuitarKey,
    getKeySymbol,
    getKeysForStyle,
} from '@/types';
import { cn } from '@/utils/cn';

/**
 * Key configuration for display in the palette.
 */
interface KeyConfig {
    /** The key identifier */
    id: SupportedKey;
    /** Display symbol (arrow or number) */
    symbol: string;
    /** Human-readable label for accessibility */
    label: string;
    /** Keyboard shortcut hint */
    shortcut: string;
    /** Description for tooltip */
    description: string;
    /** CSS class for the key color */
    colorClass: string;
}

/**
 * DDR key configurations with classic DDR colors.
 * Colors: left=blue, down=green, up=red, right=purple
 */
const DDR_KEY_CONFIGS: KeyConfig[] = [
    {
        id: 'left',
        symbol: getKeySymbol('left'),
        label: 'Left Arrow',
        shortcut: 'ArrowLeft',
        description: 'Left arrow key (blue)',
        colorClass: 'key-palette-key--blue',
    },
    {
        id: 'down',
        symbol: getKeySymbol('down'),
        label: 'Down Arrow',
        shortcut: 'ArrowDown',
        description: 'Down arrow key (green)',
        colorClass: 'key-palette-key--green',
    },
    {
        id: 'up',
        symbol: getKeySymbol('up'),
        label: 'Up Arrow',
        shortcut: 'ArrowUp',
        description: 'Up arrow key (red)',
        colorClass: 'key-palette-key--red',
    },
    {
        id: 'right',
        symbol: getKeySymbol('right'),
        label: 'Right Arrow',
        shortcut: 'ArrowRight',
        description: 'Right arrow key (purple)',
        colorClass: 'key-palette-key--purple',
    },
];

/**
 * Guitar Hero key configurations with classic 5-fret colors.
 * Colors: 1=green, 2=red, 3=yellow, 4=blue, 5=orange
 */
const GUITAR_KEY_CONFIGS: KeyConfig[] = [
    {
        id: '1',
        symbol: getKeySymbol('1'),
        label: 'Fret 1 (Green)',
        shortcut: '1',
        description: 'Number key 1 (green fret)',
        colorClass: 'key-palette-key--green',
    },
    {
        id: '2',
        symbol: getKeySymbol('2'),
        label: 'Fret 2 (Red)',
        shortcut: '2',
        description: 'Number key 2 (red fret)',
        colorClass: 'key-palette-key--red',
    },
    {
        id: '3',
        symbol: getKeySymbol('3'),
        label: 'Fret 3 (Yellow)',
        shortcut: '3',
        description: 'Number key 3 (yellow fret)',
        colorClass: 'key-palette-key--yellow',
    },
    {
        id: '4',
        symbol: getKeySymbol('4'),
        label: 'Fret 4 (Blue)',
        shortcut: '4',
        description: 'Number key 4 (blue fret)',
        colorClass: 'key-palette-key--blue',
    },
    {
        id: '5',
        symbol: getKeySymbol('5'),
        label: 'Fret 5 (Orange)',
        shortcut: '5',
        description: 'Number key 5 (orange fret)',
        colorClass: 'key-palette-key--orange',
    },
];

/**
 * Props for the KeyPalette component.
 */
export interface KeyPaletteProps {
    /** Current chart style (filters available keys) */
    chartStyle: ChartStyle;
    /** Currently selected key (null if none selected) */
    selectedKey: SupportedKey | null;
    /** Callback when a key is selected */
    onKeySelect: (key: SupportedKey) => void;
    /** Whether the palette is disabled */
    disabled?: boolean;
    /** Whether to show keyboard shortcut hints */
    showShortcuts?: boolean;
    /** Optional additional CSS classes */
    className?: string;
}

/**
 * KeyPalette Component
 *
 * Renders a horizontal palette of selectable keys for chart editing.
 * Keys are filtered based on the chart style:
 * - DDR: 4 arrow keys (left, down, up, right)
 * - Guitar Hero: 5 number keys (1-5)
 *
 * @example
 * ```tsx
 * <KeyPalette
 *   chartStyle="ddr"
 *   selectedKey={selectedKey}
 *   onKeySelect={handleKeySelect}
 *   showShortcuts
 * />
 * ```
 */
export function KeyPalette({
    chartStyle,
    selectedKey,
    onKeySelect,
    disabled = false,
    showShortcuts = true,
    className,
}: KeyPaletteProps) {
    // Get the key configs for the current style
    const keyConfigs = chartStyle === 'ddr' ? DDR_KEY_CONFIGS : GUITAR_KEY_CONFIGS;

    // Track which button is focused for keyboard navigation
    const buttonRefs = useRef<Map<SupportedKey, HTMLButtonElement>>(new Map());

    /**
     * Handle key button click
     */
    const handleClick = useCallback(
        (key: SupportedKey) => {
            if (!disabled) {
                onKeySelect(key);
            }
        },
        [disabled, onKeySelect]
    );

    /**
     * Handle keyboard navigation within the palette
     */
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, currentIndex: number) => {
            const keys = keyConfigs;
            let newIndex = currentIndex;

            switch (e.key) {
                case 'ArrowLeft':
                case 'ArrowUp':
                    e.preventDefault();
                    newIndex = currentIndex > 0 ? currentIndex - 1 : keys.length - 1;
                    break;
                case 'ArrowRight':
                case 'ArrowDown':
                    e.preventDefault();
                    newIndex = currentIndex < keys.length - 1 ? currentIndex + 1 : 0;
                    break;
                case 'Home':
                    e.preventDefault();
                    newIndex = 0;
                    break;
                case 'End':
                    e.preventDefault();
                    newIndex = keys.length - 1;
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    onKeySelect(keys[currentIndex].id);
                    return;
                default:
                    return;
            }

            // Focus the new button
            const newKey = keys[newIndex].id;
            const button = buttonRefs.current.get(newKey);
            if (button) {
                button.focus();
            }
        },
        [keyConfigs, onKeySelect]
    );

    /**
     * Set up global keyboard shortcuts for quick key selection.
     * DDR: Arrow keys select corresponding arrow
     * Guitar Hero: Number keys 1-5 select corresponding fret
     */
    useEffect(() => {
        if (disabled) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            // Don't capture if user is typing in an input
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement
            ) {
                return;
            }

            const availableKeys = getKeysForStyle(chartStyle);
            let keyToSelect: SupportedKey | null = null;

            if (chartStyle === 'ddr') {
                // DDR: Arrow keys select arrows
                switch (e.key) {
                    case 'ArrowLeft':
                        keyToSelect = 'left';
                        break;
                    case 'ArrowDown':
                        keyToSelect = 'down';
                        break;
                    case 'ArrowUp':
                        keyToSelect = 'up';
                        break;
                    case 'ArrowRight':
                        keyToSelect = 'right';
                        break;
                }
            } else {
                // Guitar Hero: Number keys 1-5 select frets
                if (e.key >= '1' && e.key <= '5') {
                    keyToSelect = e.key as GuitarKey;
                }
            }

            if (keyToSelect && availableKeys.includes(keyToSelect)) {
                e.preventDefault();
                onKeySelect(keyToSelect);
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [chartStyle, disabled, onKeySelect]);

    // Style label for display
    const styleLabel = chartStyle === 'ddr' ? 'DDR Arrows' : 'Guitar Frets';

    return (
        <div
            className={cn('key-palette', className)}
            role="radiogroup"
            aria-label={`Key palette: ${styleLabel}`}
        >
            {/* Label */}
            <span className="key-palette-label">
                {styleLabel}
            </span>

            {/* Key buttons */}
            <div className="key-palette-keys">
                {keyConfigs.map((config, index) => {
                    const isSelected = selectedKey === config.id;
                    const isDisabled = disabled;

                    return (
                        <button
                            key={config.id}
                            ref={(el) => {
                                if (el) buttonRefs.current.set(config.id, el);
                            }}
                            type="button"
                            data-key-index={index}
                            className={cn(
                                'key-palette-key',
                                config.colorClass,
                                isSelected && 'key-palette-key--selected',
                                isDisabled && 'key-palette-key--disabled'
                            )}
                            onClick={() => handleClick(config.id)}
                            onKeyDown={(e) => handleKeyDown(e, index)}
                            disabled={isDisabled}
                            role="radio"
                            aria-checked={isSelected}
                            aria-label={`${config.label}: ${config.description}`}
                            title={`${config.description} (press ${config.shortcut})`}
                            tabIndex={isSelected ? 0 : -1}
                        >
                            {/* Key symbol */}
                            <span className="key-palette-key-symbol" aria-hidden="true">
                                {config.symbol}
                            </span>

                            {/* Shortcut hint (optional) */}
                            {showShortcuts && (
                                <span className="key-palette-key-shortcut" aria-hidden="true">
                                    {config.shortcut.replace('Arrow', '')}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Current selection indicator */}
            {selectedKey && (
                <span className="key-palette-selection" aria-live="polite">
                    Selected: {getKeySymbol(selectedKey)}
                </span>
            )}
        </div>
    );
}

/**
 * Get the key config for a specific key.
 * Useful for displaying key info in other components.
 */
export function getKeyConfig(key: SupportedKey): KeyConfig | undefined {
    const allConfigs = [...DDR_KEY_CONFIGS, ...GUITAR_KEY_CONFIGS];
    return allConfigs.find((c) => c.id === key);
}

/**
 * All DDR key configs for external use.
 */
export { DDR_KEY_CONFIGS };

/**
 * All Guitar Hero key configs for external use.
 */
export { GUITAR_KEY_CONFIGS };

export default KeyPalette;
