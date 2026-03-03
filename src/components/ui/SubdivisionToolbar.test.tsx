/**
 * Tests for SubdivisionToolbar Component
 *
 * Phase 8, Task 8.3: Component Tests
 * - Test toolbar apply action
 * - Test subdivision type selection
 * - Test keyboard shortcuts
 * - Test action buttons (clear, select all, reset)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubdivisionToolbar, getSubdivisionTypeConfig, SUBDIVISION_TYPES } from './SubdivisionToolbar';
import type { SubdivisionType } from '@/types';

describe('SubdivisionToolbar', () => {
    // Default props for tests
    const defaultProps = {
        currentBrush: 'quarter' as SubdivisionType,
        onBrushChange: vi.fn(),
        onApplyToSelection: vi.fn(),
        onClearSelection: vi.fn(),
        onSelectAll: vi.fn(),
        onResetAll: vi.fn(),
        selectionCount: 0,
        disabled: false,
        compact: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering - Basic', () => {
        it('renders the toolbar container', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            const toolbar = screen.getByRole('toolbar');
            expect(toolbar).toBeInTheDocument();
            expect(toolbar).toHaveAttribute('aria-label', 'Subdivision brush toolbar');
        });

        it('renders the brush label', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            expect(screen.getByText('Brush')).toBeInTheDocument();
        });

        it('renders all 8 subdivision type buttons', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            const radiogroup = screen.getByRole('radiogroup', { name: 'Subdivision type' });
            expect(radiogroup).toBeInTheDocument();

            const buttons = screen.getAllByRole('radio');
            expect(buttons).toHaveLength(8);
        });

        it('renders action buttons', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            expect(screen.getByRole('button', { name: /Apply/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
        });
    });

    describe('Subdivision Type Buttons', () => {
        it('highlights the current brush subdivision', () => {
            render(<SubdivisionToolbar {...defaultProps} currentBrush="eighth" />);

            // Use exact aria-label match to avoid matching "Triplet 8" or "Dotted 8"
            const eighthButton = screen.getByRole('radio', { name: 'Eighth: Eighth notes (double density)' });
            expect(eighthButton).toHaveAttribute('aria-checked', 'true');
            expect(eighthButton).toHaveClass('subdivision-toolbar-btn--active');
        });

        it('calls onBrushChange when subdivision button is clicked', () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} />);

            const eighthButton = screen.getByRole('radio', { name: 'Eighth: Eighth notes (double density)' });
            fireEvent.click(eighthButton);

            expect(onBrushChange).toHaveBeenCalledWith('eighth');
        });

        it('renders all subdivision types with correct labels', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            expect(screen.getByRole('radio', { name: /Quarter: Quarter notes/i })).toBeInTheDocument();
            expect(screen.getByRole('radio', { name: /Half: Half notes/i })).toBeInTheDocument();
            expect(screen.getByRole('radio', { name: /Eighth: Eighth notes/i })).toBeInTheDocument();
            expect(screen.getByRole('radio', { name: /16th: Sixteenth notes/i })).toBeInTheDocument();
            expect(screen.getByRole('radio', { name: /Triplet 8: Eighth triplets/i })).toBeInTheDocument();
            expect(screen.getByRole('radio', { name: /Triplet 4: Quarter triplets/i })).toBeInTheDocument();
            expect(screen.getByRole('radio', { name: /Dotted 4: Dotted quarter notes/i })).toBeInTheDocument();
            expect(screen.getByRole('radio', { name: /Dotted 8: Dotted eighth/i })).toBeInTheDocument();
        });

        it('shows keyboard shortcuts on subdivision buttons', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            // Check that shortcut hints are visible (1-8 for subdivision types)
            expect(screen.getByText('1')).toBeInTheDocument(); // Quarter
            expect(screen.getByText('2')).toBeInTheDocument(); // Half
            expect(screen.getByText('3')).toBeInTheDocument(); // Eighth
            expect(screen.getByText('4')).toBeInTheDocument(); // Sixteenth
            expect(screen.getByText('5')).toBeInTheDocument(); // Triplet 8
            expect(screen.getByText('6')).toBeInTheDocument(); // Triplet 4
            expect(screen.getByText('7')).toBeInTheDocument(); // Dotted 4
            expect(screen.getByText('8')).toBeInTheDocument(); // Dotted 8
        });

        it('does not call onBrushChange when disabled', () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} disabled />);

            const eighthButton = screen.getByRole('radio', { name: 'Eighth: Eighth notes (double density)' });
            fireEvent.click(eighthButton);

            expect(onBrushChange).not.toHaveBeenCalled();
        });
    });

    describe('Apply Button', () => {
        it('calls onApplyToSelection when Apply button is clicked', () => {
            const onApplyToSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onApplyToSelection={onApplyToSelection}
                    selectionCount={5}
                />
            );

            // Find the Apply button by its label text
            const applyButton = screen.getByRole('button', { name: /Apply/ });
            fireEvent.click(applyButton);

            expect(onApplyToSelection).toHaveBeenCalledTimes(1);
        });

        it('is disabled when selectionCount is 0', () => {
            render(<SubdivisionToolbar {...defaultProps} selectionCount={0} />);

            const applyButton = screen.getByRole('button', { name: /Apply/ });
            expect(applyButton).toBeDisabled();
        });

        it('is disabled when toolbar is disabled', () => {
            render(<SubdivisionToolbar {...defaultProps} selectionCount={5} disabled />);

            const applyButton = screen.getByRole('button', { name: /Apply/ });
            expect(applyButton).toBeDisabled();
        });

        it('shows selection count in the button label', () => {
            render(<SubdivisionToolbar {...defaultProps} selectionCount={12} />);

            expect(screen.getByText('12')).toBeInTheDocument();
        });

        it('shows current brush type in title', () => {
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush="eighth"
                    selectionCount={3}
                />
            );

            // Check that the title includes the brush type
            const applyButton = screen.getByRole('button', { name: /Apply/ });
            expect(applyButton).toHaveAttribute('title', 'Apply eighth to 3 selected beats (Enter)');
        });

        it('does not call onApplyToSelection when disabled', () => {
            const onApplyToSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onApplyToSelection={onApplyToSelection}
                    selectionCount={5}
                    disabled
                />
            );

            const applyButton = screen.getByRole('button', { name: /Apply/ });
            fireEvent.click(applyButton);

            expect(onApplyToSelection).not.toHaveBeenCalled();
        });
    });

    describe('Clear Selection Button', () => {
        it('calls onClearSelection when Clear button is clicked', () => {
            const onClearSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onClearSelection={onClearSelection}
                    selectionCount={5}
                />
            );

            const clearButton = screen.getByRole('button', { name: 'Clear' });
            fireEvent.click(clearButton);

            expect(onClearSelection).toHaveBeenCalledTimes(1);
        });

        it('is disabled when selectionCount is 0', () => {
            render(<SubdivisionToolbar {...defaultProps} selectionCount={0} />);

            const clearButton = screen.getByRole('button', { name: 'Clear' });
            expect(clearButton).toBeDisabled();
        });

        it('is not rendered when onClearSelection is not provided', () => {
            const { onClearSelection, ...propsWithoutClear } = defaultProps;
            render(<SubdivisionToolbar {...propsWithoutClear} />);

            expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
        });
    });

    describe('Select All Button', () => {
        it('calls onSelectAll when All button is clicked', () => {
            const onSelectAll = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onSelectAll={onSelectAll} />);

            const allButton = screen.getByRole('button', { name: 'All' });
            fireEvent.click(allButton);

            expect(onSelectAll).toHaveBeenCalledTimes(1);
        });

        it('is disabled when toolbar is disabled', () => {
            render(<SubdivisionToolbar {...defaultProps} disabled />);

            const allButton = screen.getByRole('button', { name: 'All' });
            expect(allButton).toBeDisabled();
        });

        it('is not rendered when onSelectAll is not provided', () => {
            const { onSelectAll, ...propsWithoutSelectAll } = defaultProps;
            render(<SubdivisionToolbar {...propsWithoutSelectAll} />);

            expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument();
        });
    });

    describe('Reset All Button', () => {
        it('calls onResetAll when Reset button is clicked', () => {
            const onResetAll = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onResetAll={onResetAll} />);

            const resetButton = screen.getByRole('button', { name: 'Reset' });
            fireEvent.click(resetButton);

            expect(onResetAll).toHaveBeenCalledTimes(1);
        });

        it('is disabled when toolbar is disabled', () => {
            render(<SubdivisionToolbar {...defaultProps} disabled />);

            const resetButton = screen.getByRole('button', { name: 'Reset' });
            expect(resetButton).toBeDisabled();
        });

        it('is not rendered when onResetAll is not provided', () => {
            const { onResetAll, ...propsWithoutReset } = defaultProps;
            render(<SubdivisionToolbar {...propsWithoutReset} />);

            expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
        });

        it('has danger styling class', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            const resetButton = screen.getByRole('button', { name: 'Reset' });
            expect(resetButton).toHaveClass('subdivision-toolbar-action--danger');
        });
    });

    describe('Keyboard Shortcuts - Number Keys (1-8)', () => {
        it('changes brush subdivision when pressing number keys 1-8', () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} />);

            // Press '3' for eighth notes
            fireEvent.keyDown(window, { key: '3' });

            expect(onBrushChange).toHaveBeenCalledWith('eighth');
        });

        it('pressing 1 selects quarter', () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} />);

            fireEvent.keyDown(window, { key: '1' });

            expect(onBrushChange).toHaveBeenCalledWith('quarter');
        });

        it('pressing 2 selects half', () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} />);

            fireEvent.keyDown(window, { key: '2' });

            expect(onBrushChange).toHaveBeenCalledWith('half');
        });

        it('pressing 4 selects sixteenth', () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} />);

            fireEvent.keyDown(window, { key: '4' });

            expect(onBrushChange).toHaveBeenCalledWith('sixteenth');
        });

        it('does not respond to number keys when disabled', () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} disabled />);

            fireEvent.keyDown(window, { key: '3' });

            expect(onBrushChange).not.toHaveBeenCalled();
        });

        it('ignores number keys when focus is in input field', async () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} />);

            // Create an input and focus it
            const input = document.createElement('input');
            document.body.appendChild(input);
            input.focus();

            // Dispatch the keydown event with the input as the target
            fireEvent.keyDown(window, { key: '3', target: input });

            await waitFor(() => {
                expect(onBrushChange).not.toHaveBeenCalled();
            });

            document.body.removeChild(input);
        });

        it('ignores number keys when focus is in textarea', async () => {
            const onBrushChange = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onBrushChange={onBrushChange} />);

            // Create a textarea and focus it
            const textarea = document.createElement('textarea');
            document.body.appendChild(textarea);
            textarea.focus();

            // Dispatch the keydown event with the textarea as the target
            fireEvent.keyDown(window, { key: '3', target: textarea });

            await waitFor(() => {
                expect(onBrushChange).not.toHaveBeenCalled();
            });

            document.body.removeChild(textarea);
        });
    });

    describe('Keyboard Shortcuts - Enter to Apply', () => {
        it('calls onApplyToSelection when Enter is pressed with selection', () => {
            const onApplyToSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onApplyToSelection={onApplyToSelection}
                    selectionCount={5}
                />
            );

            fireEvent.keyDown(window, { key: 'Enter' });

            expect(onApplyToSelection).toHaveBeenCalledTimes(1);
        });

        it('does not call onApplyToSelection when selectionCount is 0', () => {
            const onApplyToSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onApplyToSelection={onApplyToSelection}
                    selectionCount={0}
                />
            );

            fireEvent.keyDown(window, { key: 'Enter' });

            expect(onApplyToSelection).not.toHaveBeenCalled();
        });

        it('does not call onApplyToSelection when disabled', () => {
            const onApplyToSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onApplyToSelection={onApplyToSelection}
                    selectionCount={5}
                    disabled
                />
            );

            fireEvent.keyDown(window, { key: 'Enter' });

            expect(onApplyToSelection).not.toHaveBeenCalled();
        });
    });

    describe('Keyboard Shortcuts - Escape to Clear', () => {
        it('calls onClearSelection when Escape is pressed with selection', () => {
            const onClearSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onClearSelection={onClearSelection}
                    selectionCount={3}
                />
            );

            fireEvent.keyDown(window, { key: 'Escape' });

            expect(onClearSelection).toHaveBeenCalledTimes(1);
        });

        it('does not call onClearSelection when selectionCount is 0', () => {
            const onClearSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onClearSelection={onClearSelection}
                    selectionCount={0}
                />
            );

            fireEvent.keyDown(window, { key: 'Escape' });

            expect(onClearSelection).not.toHaveBeenCalled();
        });

        it('does not call onClearSelection when onClearSelection not provided', () => {
            const { onClearSelection, ...propsWithoutClear } = defaultProps;
            render(<SubdivisionToolbar {...propsWithoutClear} selectionCount={3} />);

            // Should not throw error
            fireEvent.keyDown(window, { key: 'Escape' });
        });
    });

    describe('Keyboard Shortcuts - Ctrl+A to Select All', () => {
        it('calls onSelectAll when Ctrl+A is pressed', () => {
            const onSelectAll = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onSelectAll={onSelectAll} />);

            fireEvent.keyDown(window, { key: 'a', ctrlKey: true });

            expect(onSelectAll).toHaveBeenCalledTimes(1);
        });

        it('calls onSelectAll when Cmd+A is pressed (metaKey)', () => {
            const onSelectAll = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onSelectAll={onSelectAll} />);

            fireEvent.keyDown(window, { key: 'a', metaKey: true });

            expect(onSelectAll).toHaveBeenCalledTimes(1);
        });

        it('does not call onSelectAll when disabled', () => {
            const onSelectAll = vi.fn();
            render(<SubdivisionToolbar {...defaultProps} onSelectAll={onSelectAll} disabled />);

            fireEvent.keyDown(window, { key: 'a', ctrlKey: true });

            expect(onSelectAll).not.toHaveBeenCalled();
        });

        it('does not call onSelectAll when not provided', () => {
            const { onSelectAll, ...propsWithoutSelectAll } = defaultProps;
            render(<SubdivisionToolbar {...propsWithoutSelectAll} />);

            // Should not throw error
            fireEvent.keyDown(window, { key: 'a', ctrlKey: true });
        });
    });

    describe('Keyboard Navigation - Arrow Keys', () => {
        it('navigates to previous subdivision on ArrowLeft', () => {
            const onBrushChange = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onBrushChange={onBrushChange}
                    currentBrush="eighth"
                />
            );

            // eighth is at index 2, ArrowLeft should go to index 1 (half)
            const eighthButton = screen.getByRole('radio', { name: 'Eighth: Eighth notes (double density)' });
            fireEvent.keyDown(eighthButton, { key: 'ArrowLeft' });

            expect(onBrushChange).toHaveBeenCalledWith('half');
        });

        it('navigates to next subdivision on ArrowRight', () => {
            const onBrushChange = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onBrushChange={onBrushChange}
                    currentBrush="quarter"
                />
            );

            // quarter is at index 0, ArrowRight should go to index 1 (half)
            const quarterButton = screen.getByRole('radio', { name: 'Quarter: Quarter notes (default)' });
            fireEvent.keyDown(quarterButton, { key: 'ArrowRight' });

            expect(onBrushChange).toHaveBeenCalledWith('half');
        });

        it('wraps around to end on ArrowLeft from first item', () => {
            const onBrushChange = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onBrushChange={onBrushChange}
                    currentBrush="quarter"
                />
            );

            // quarter is at index 0, ArrowLeft should wrap to index 7 (dotted8)
            const quarterButton = screen.getByRole('radio', { name: 'Quarter: Quarter notes (default)' });
            fireEvent.keyDown(quarterButton, { key: 'ArrowLeft' });

            expect(onBrushChange).toHaveBeenCalledWith('dotted8');
        });

        it('wraps around to start on ArrowRight from last item', () => {
            const onBrushChange = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onBrushChange={onBrushChange}
                    currentBrush="dotted8"
                />
            );

            // dotted8 is at index 7, ArrowRight should wrap to index 0 (quarter)
            const dotted8Button = screen.getByRole('radio', { name: 'Dotted 8: Dotted eighth (swing pattern)' });
            fireEvent.keyDown(dotted8Button, { key: 'ArrowRight' });

            expect(onBrushChange).toHaveBeenCalledWith('quarter');
        });

        it('navigates to first item on Home key', () => {
            const onBrushChange = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onBrushChange={onBrushChange}
                    currentBrush="sixteenth"
                />
            );

            const sixteenthButton = screen.getByRole('radio', { name: '16th: Sixteenth notes (maximum density)' });
            fireEvent.keyDown(sixteenthButton, { key: 'Home' });

            expect(onBrushChange).toHaveBeenCalledWith('quarter');
        });

        it('navigates to last item on End key', () => {
            const onBrushChange = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onBrushChange={onBrushChange}
                    currentBrush="quarter"
                />
            );

            const quarterButton = screen.getByRole('radio', { name: 'Quarter: Quarter notes (default)' });
            fireEvent.keyDown(quarterButton, { key: 'End' });

            expect(onBrushChange).toHaveBeenCalledWith('dotted8');
        });

        it('calls onApplyToSelection when Space is pressed on a button', () => {
            const onApplyToSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onApplyToSelection={onApplyToSelection}
                    selectionCount={5}
                />
            );

            const quarterButton = screen.getByRole('radio', { name: 'Quarter: Quarter notes (default)' });
            fireEvent.keyDown(quarterButton, { key: ' ' });

            expect(onApplyToSelection).toHaveBeenCalledTimes(1);
        });

        it('calls onApplyToSelection when Enter is pressed on a button', () => {
            const onApplyToSelection = vi.fn();
            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    onApplyToSelection={onApplyToSelection}
                    selectionCount={5}
                />
            );

            const quarterButton = screen.getByRole('radio', { name: 'Quarter: Quarter notes (default)' });
            fireEvent.keyDown(quarterButton, { key: 'Enter' });

            expect(onApplyToSelection).toHaveBeenCalledTimes(1);
        });
    });

    describe('Compact Mode', () => {
        it('applies compact class when compact prop is true', () => {
            render(<SubdivisionToolbar {...defaultProps} compact />);

            const toolbar = screen.getByRole('toolbar');
            expect(toolbar).toHaveClass('subdivision-toolbar--compact');
        });

        it('shows short labels in compact mode', () => {
            render(<SubdivisionToolbar {...defaultProps} compact />);

            // Short labels like 1/4, 1/2, etc.
            expect(screen.getByText('1/4')).toBeInTheDocument();
            expect(screen.getByText('1/2')).toBeInTheDocument();
            expect(screen.getByText('1/8')).toBeInTheDocument();
        });
    });

    describe('Disabled State', () => {
        it('applies disabled class when disabled prop is true', () => {
            render(<SubdivisionToolbar {...defaultProps} disabled />);

            const toolbar = screen.getByRole('toolbar');
            expect(toolbar).toHaveClass('subdivision-toolbar--disabled');
        });

        it('disables all subdivision buttons when disabled', () => {
            render(<SubdivisionToolbar {...defaultProps} disabled />);

            const buttons = screen.getAllByRole('radio');
            buttons.forEach((button) => {
                expect(button).toBeDisabled();
            });
        });

        it('disables all action buttons when disabled', () => {
            render(<SubdivisionToolbar {...defaultProps} disabled />);

            expect(screen.getByRole('button', { name: /Apply/i })).toBeDisabled();
            expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
            expect(screen.getByRole('button', { name: 'All' })).toBeDisabled();
            expect(screen.getByRole('button', { name: 'Reset' })).toBeDisabled();
        });
    });

    describe('Helper Functions', () => {
        describe('getSubdivisionTypeConfig', () => {
            it('returns config for valid subdivision type', () => {
                const config = getSubdivisionTypeConfig('quarter');
                expect(config).toBeDefined();
                expect(config?.id).toBe('quarter');
                expect(config?.label).toBe('Quarter');
                expect(config?.shortcut).toBe('1');
            });

            it('returns undefined for invalid subdivision type', () => {
                const config = getSubdivisionTypeConfig('invalid' as SubdivisionType);
                expect(config).toBeUndefined();
            });

            it('returns correct config for all subdivision types', () => {
                const types: SubdivisionType[] = [
                    'quarter', 'half', 'eighth', 'sixteenth',
                    'triplet8', 'triplet4', 'dotted4', 'dotted8'
                ];

                types.forEach((type) => {
                    const config = getSubdivisionTypeConfig(type);
                    expect(config).toBeDefined();
                    expect(config?.id).toBe(type);
                });
            });
        });

        describe('SUBDIVISION_TYPES export', () => {
            it('exports all 8 subdivision types', () => {
                expect(SUBDIVISION_TYPES).toHaveLength(8);
            });

            it('has correct order (by keyboard shortcut 1-8)', () => {
                expect(SUBDIVISION_TYPES[0].id).toBe('quarter');
                expect(SUBDIVISION_TYPES[1].id).toBe('half');
                expect(SUBDIVISION_TYPES[2].id).toBe('eighth');
                expect(SUBDIVISION_TYPES[3].id).toBe('sixteenth');
                expect(SUBDIVISION_TYPES[4].id).toBe('triplet8');
                expect(SUBDIVISION_TYPES[5].id).toBe('triplet4');
                expect(SUBDIVISION_TYPES[6].id).toBe('dotted4');
                expect(SUBDIVISION_TYPES[7].id).toBe('dotted8');
            });
        });
    });

    describe('Accessibility', () => {
        it('has correct role attributes', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            expect(screen.getByRole('toolbar')).toBeInTheDocument();
            expect(screen.getByRole('radiogroup', { name: 'Subdivision type' })).toBeInTheDocument();
        });

        it('has correct aria-checked for selected button', () => {
            render(<SubdivisionToolbar {...defaultProps} currentBrush="eighth" />);

            const buttons = screen.getAllByRole('radio');
            buttons.forEach((button) => {
                const isChecked = button.getAttribute('aria-checked') === 'true';
                const isEighth = button.getAttribute('aria-label')?.includes('Eighth');
                expect(isChecked).toBe(isEighth);
            });
        });

        it('has correct tabIndex for radio buttons (selected is 0, others -1)', () => {
            render(<SubdivisionToolbar {...defaultProps} currentBrush="quarter" />);

            const quarterButton = screen.getByRole('radio', { name: /Quarter/i });
            const eighthButton = screen.getByRole('radio', { name: /Eighth/i });

            expect(quarterButton).toHaveAttribute('tabIndex', '0');
            expect(eighthButton).toHaveAttribute('tabIndex', '-1');
        });

        it('has separator with separator role', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            const separator = screen.getByRole('separator');
            expect(separator).toBeInTheDocument();
        });

        it('has descriptive aria-labels on subdivision buttons', () => {
            render(<SubdivisionToolbar {...defaultProps} />);

            const quarterButton = screen.getByRole('radio', { name: /Quarter: Quarter notes/i });
            expect(quarterButton).toBeInTheDocument();
        });
    });

    /**
     * Integration tests for the apply action.
     * These tests verify the toolbar apply action behavior when connected
     * to store-like logic (contiguous vs non-contiguous selection handling).
     *
     * Phase 8, Task 8.3: Test toolbar apply action
     */
    describe('Integration - Apply Action with Selection', () => {
        /**
         * Simulates the handleApplyToSelection logic from SubdivisionSettings.
         * This is how the toolbar integrates with the store in the real app.
         */
        function createApplyHandler(
            selection: Set<number>,
            brush: SubdivisionType,
            setBeatSubdivision: (index: number, type: SubdivisionType) => void,
            setBeatSubdivisionRange: (start: number, end: number, type: SubdivisionType) => void
        ) {
            return () => {
                if (selection.size === 0) return;

                const beats = Array.from(selection).sort((a, b) => a - b);

                // Check if beats are contiguous
                let isContiguous = true;
                for (let i = 1; i < beats.length; i++) {
                    if (beats[i] !== beats[i - 1] + 1) {
                        isContiguous = false;
                        break;
                    }
                }

                if (isContiguous && beats.length > 1) {
                    // Use range action for contiguous selection
                    setBeatSubdivisionRange(beats[0], beats[beats.length - 1], brush);
                } else {
                    // Apply individually for non-contiguous selection
                    beats.forEach((beatIndex) => {
                        setBeatSubdivision(beatIndex, brush);
                    });
                }
            };
        }

        it('calls setBeatSubdivisionRange for contiguous selection', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            const selection = new Set([2, 3, 4, 5]); // Contiguous: beats 3-6
            const brush: SubdivisionType = 'eighth';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={selection.size}
                />
            );

            // Click Apply button
            fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

            // Should call range action, not individual actions
            expect(setBeatSubdivisionRange).toHaveBeenCalledTimes(1);
            expect(setBeatSubdivisionRange).toHaveBeenCalledWith(2, 5, 'eighth');
            expect(setBeatSubdivision).not.toHaveBeenCalled();
        });

        it('calls setBeatSubdivisionRange for single beat selection', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            const selection = new Set([3]); // Single beat
            const brush: SubdivisionType = 'sixteenth';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={selection.size}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

            // Single beat should use individual action (length === 1)
            expect(setBeatSubdivision).toHaveBeenCalledTimes(1);
            expect(setBeatSubdivision).toHaveBeenCalledWith(3, 'sixteenth');
            expect(setBeatSubdivisionRange).not.toHaveBeenCalled();
        });

        it('calls setBeatSubdivision individually for non-contiguous selection', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            const selection = new Set([1, 3, 7]); // Non-contiguous: beats 2, 4, 8
            const brush: SubdivisionType = 'triplet8';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={selection.size}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

            // Should call individual action for each beat
            expect(setBeatSubdivision).toHaveBeenCalledTimes(3);
            expect(setBeatSubdivision).toHaveBeenCalledWith(1, 'triplet8');
            expect(setBeatSubdivision).toHaveBeenCalledWith(3, 'triplet8');
            expect(setBeatSubdivision).toHaveBeenCalledWith(7, 'triplet8');
            expect(setBeatSubdivisionRange).not.toHaveBeenCalled();
        });

        it('applies correct subdivision type from current brush', () => {
            // Test a few representative brush types (not all 8 to avoid DOM clutter)
            const brushTypes: SubdivisionType[] = ['half', 'eighth', 'triplet8', 'dotted4'];

            brushTypes.forEach((brushType) => {
                const setBeatSubdivision = vi.fn();
                const setBeatSubdivisionRange = vi.fn();
                const selection = new Set([0, 1, 2]);

                const handleApply = createApplyHandler(
                    selection,
                    brushType,
                    setBeatSubdivision,
                    setBeatSubdivisionRange
                );

                const { unmount } = render(
                    <SubdivisionToolbar
                        {...defaultProps}
                        currentBrush={brushType}
                        onApplyToSelection={handleApply}
                        selectionCount={selection.size}
                    />
                );

                // Use a more specific selector to find the Apply button
                const applyButtons = screen.getAllByRole('button', { name: /Apply/ });
                fireEvent.click(applyButtons[applyButtons.length - 1]); // Click the most recently rendered one

                expect(setBeatSubdivisionRange).toHaveBeenCalledWith(0, 2, brushType);

                unmount();
            });
        });

        it('handles large contiguous selection efficiently', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            // Large contiguous selection: 100 beats
            const selection = new Set(Array.from({ length: 100 }, (_, i) => i));
            const brush: SubdivisionType = 'quarter';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={selection.size}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

            // Should use single range call, not 100 individual calls
            expect(setBeatSubdivisionRange).toHaveBeenCalledTimes(1);
            expect(setBeatSubdivisionRange).toHaveBeenCalledWith(0, 99, 'quarter');
            expect(setBeatSubdivision).not.toHaveBeenCalled();
        });

        it('handles non-contiguous selection with gaps', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            // Every other beat: 0, 2, 4, 6, 8
            const selection = new Set([0, 2, 4, 6, 8]);
            const brush: SubdivisionType = 'half';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={selection.size}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

            // Should call individual action for each beat (5 calls)
            expect(setBeatSubdivision).toHaveBeenCalledTimes(5);
            expect(setBeatSubdivisionRange).not.toHaveBeenCalled();
        });

        it('does nothing when selection is empty', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            const selection = new Set<number>();
            const brush: SubdivisionType = 'eighth';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={0}
                />
            );

            // Apply button should be disabled with 0 selection
            const applyButton = screen.getByRole('button', { name: /Apply/ });
            expect(applyButton).toBeDisabled();
        });

        it('Enter key triggers apply action with selection', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            const selection = new Set([5, 6, 7]);
            const brush: SubdivisionType = 'dotted4';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={selection.size}
                />
            );

            // Press Enter
            fireEvent.keyDown(window, { key: 'Enter' });

            expect(setBeatSubdivisionRange).toHaveBeenCalledTimes(1);
            expect(setBeatSubdivisionRange).toHaveBeenCalledWith(5, 7, 'dotted4');
        });

        it('applies after changing brush subdivision', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            const selection = new Set([0, 1]);
            let currentBrush: SubdivisionType = 'quarter';

            const { rerender } = render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={currentBrush}
                    onBrushChange={(newBrush) => {
                        currentBrush = newBrush;
                    }}
                    onApplyToSelection={createApplyHandler(
                        selection,
                        currentBrush,
                        setBeatSubdivision,
                        setBeatSubdivisionRange
                    )}
                    selectionCount={selection.size}
                />
            );

            // Change brush to eighth
            fireEvent.click(screen.getByRole('radio', { name: /Eighth: Eighth notes/i }));

            // Re-render with new brush
            rerender(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush="eighth"
                    onBrushChange={() => {}}
                    onApplyToSelection={createApplyHandler(
                        selection,
                        'eighth',
                        setBeatSubdivision,
                        setBeatSubdivisionRange
                    )}
                    selectionCount={selection.size}
                />
            );

            // Click Apply
            fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

            // Should apply with eighth, not quarter
            expect(setBeatSubdivisionRange).toHaveBeenCalledWith(0, 1, 'eighth');
        });

        it('handles selection at boundaries (beat 0)', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            const selection = new Set([0, 1, 2]); // Starting from beat 0
            const brush: SubdivisionType = 'eighth';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={selection.size}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

            expect(setBeatSubdivisionRange).toHaveBeenCalledWith(0, 2, 'eighth');
        });

        it('handles two-beat contiguous selection', () => {
            const setBeatSubdivision = vi.fn();
            const setBeatSubdivisionRange = vi.fn();
            const selection = new Set([10, 11]); // Exactly two beats
            const brush: SubdivisionType = 'sixteenth';

            const handleApply = createApplyHandler(
                selection,
                brush,
                setBeatSubdivision,
                setBeatSubdivisionRange
            );

            render(
                <SubdivisionToolbar
                    {...defaultProps}
                    currentBrush={brush}
                    onApplyToSelection={handleApply}
                    selectionCount={selection.size}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /Apply/ }));

            // Two contiguous beats should use range action
            expect(setBeatSubdivisionRange).toHaveBeenCalledWith(10, 11, 'sixteenth');
            expect(setBeatSubdivision).not.toHaveBeenCalled();
        });
    });
});
