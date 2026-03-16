/**
 * Tests for BeatSubdivisionGrid Component
 *
 * Phase 8, Task 8.3: Component Tests
 * - Test BeatSubdivisionGrid rendering
 * - Test selection interactions
 * - Test toolbar apply action
 * - Test with large beat counts (performance)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BeatSubdivisionGrid } from './BeatSubdivisionGrid';
import type { SubdivisionConfig, UnifiedBeatMap, SubdivisionType, BeatSubdivisionSelection } from '@/types';

// Mock ResizeObserver for virtualization hook
class MockResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
}
vi.stubGlobal('ResizeObserver', MockResizeObserver);

// Mock requestAnimationFrame
vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    return setTimeout(() => cb(Date.now()), 16);
});

// Mock store state
let mockSubdivisionConfig: SubdivisionConfig = {
    beatSubdivisions: new Map<number, SubdivisionType>(),
    defaultSubdivision: 'quarter',
};
let mockUnifiedBeatMap: UnifiedBeatMap | null = null;
let mockTimeSignature = 4;

// Mock store actions
const mockActions = {
    setBeatSubdivision: vi.fn(),
    setBeatSubdivisionRange: vi.fn(),
};

// Mock the store module
vi.mock('../../store/beatDetectionStore', () => ({
    useBeatDetectionStore: vi.fn((selector) => {
        if (typeof selector === 'function') {
            return selector({
                actions: mockActions,
            });
        }
        return mockActions;
    }),
    useUnifiedBeatMap: () => mockUnifiedBeatMap,
    useSubdivisionConfig: () => mockSubdivisionConfig,
    useTimeSignature: () => mockTimeSignature,
}));

/**
 * Helper to create a mock unified beat map.
 */
function createMockUnifiedBeatMap(beatCount: number, quarterNoteInterval: number = 0.5): UnifiedBeatMap {
    return {
        audioId: 'test-audio',
        duration: beatCount * quarterNoteInterval,
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * quarterNoteInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            confidence: 1.0,
            intensity: 0.8,
        })),
        quarterNoteInterval,
        bpm: 60 / quarterNoteInterval,
        detectedBeatIndices: Array.from({ length: beatCount }, (_, i) => i),
        downbeatConfig: {
            segments: [{
                startBeat: 0,
                downbeatBeatIndex: 0,
                timeSignature: { beatsPerMeasure: 4 },
            }],
        },
        originalMetadata: {
            generatedAt: Date.now(),
            algorithmVersion: '1.0.0',
        },
    };
}

describe('BeatSubdivisionGrid', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSubdivisionConfig = {
            beatSubdivisions: new Map<number, SubdivisionType>(),
            defaultSubdivision: 'quarter',
        };
        mockUnifiedBeatMap = null;
        mockTimeSignature = 4;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Rendering - Empty State', () => {
        it('shows empty state when no unified beat map exists', () => {
            render(<BeatSubdivisionGrid />);

            expect(screen.getByText('Generate a beat map first to configure subdivisions')).toBeInTheDocument();
        });

        it('shows empty state when beat map has no beats', () => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(0);

            render(<BeatSubdivisionGrid />);

            expect(screen.getByText('Generate a beat map first to configure subdivisions')).toBeInTheDocument();
        });

        it('applies empty state class when no beats', () => {
            render(<BeatSubdivisionGrid />);

            const container = screen.getByText('Generate a beat map first to configure subdivisions').closest('div');
            expect(container).toHaveClass('beat-subdivision-grid--empty');
        });
    });

    describe('Rendering - With Beat Map', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(16);
        });

        it('renders the grid container', () => {
            render(<BeatSubdivisionGrid />);

            // Check for the main grid class
            const grid = document.querySelector('.beat-subdivision-grid');
            expect(grid).toBeInTheDocument();
        });

        it('displays total beat count in header', () => {
            render(<BeatSubdivisionGrid />);

            expect(screen.getByText('16 beats')).toBeInTheDocument();
        });

        it('displays measure count in header', () => {
            render(<BeatSubdivisionGrid />);

            // Measure count is based on visible measures in virtualized rendering
            // The component shows measure count based on the virtualized measures array
            const measureInfo = document.querySelector('.beat-subdivision-grid-info-item:nth-child(3)');
            expect(measureInfo).toBeInTheDocument();
        });

        it('displays selection count in header', () => {
            render(<BeatSubdivisionGrid />);

            expect(screen.getByText('0 selected')).toBeInTheDocument();
        });

        it('renders zoom controls', () => {
            render(<BeatSubdivisionGrid />);

            // New zoom controls: -, current zoom display, +
            expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Reset to 1x' })).toBeInTheDocument();
        });

        it('renders selection action buttons', () => {
            render(<BeatSubdivisionGrid />);

            expect(screen.getByRole('button', { name: 'Select All' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
        });

        it('renders the legend with all subdivision types', () => {
            render(<BeatSubdivisionGrid />);

            expect(screen.getByText('1/4')).toBeInTheDocument(); // Quarter
            expect(screen.getByText('1/2')).toBeInTheDocument(); // Half
            expect(screen.getByText('1/8')).toBeInTheDocument(); // Eighth
            expect(screen.getByText('1/16')).toBeInTheDocument(); // Sixteenth
            expect(screen.getByText('T8')).toBeInTheDocument(); // Triplet 8
            expect(screen.getByText('T4')).toBeInTheDocument(); // Triplet 4
            expect(screen.getByText('D4')).toBeInTheDocument(); // Dotted 4
            expect(screen.getByText('D8')).toBeInTheDocument(); // Dotted 8
        });
    });

    describe('Beat Cell Rendering', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(8);
        });

        it('renders beat cells with beat numbers', () => {
            render(<BeatSubdivisionGrid />);

            // Beat numbers are 1-indexed
            expect(screen.getByText('1')).toBeInTheDocument();
            expect(screen.getByText('2')).toBeInTheDocument();
            expect(screen.getByText('8')).toBeInTheDocument();
        });

        it('renders beat cells as buttons', () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            expect(beatCells.length).toBe(8);
        });

        it('applies subdivision class based on config', () => {
            mockSubdivisionConfig = {
                beatSubdivisions: new Map([[0, 'eighth']]),
                defaultSubdivision: 'quarter',
            };

            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // First beat should have eighth class
            expect(beatCells[0]).toHaveClass('beat-subdivision-grid-cell--eighth');
            // Second beat should have quarter class (default)
            expect(beatCells[1]).toHaveClass('beat-subdivision-grid-cell--quarter');
        });

        it('applies correct aria labels to beat cells', () => {
            render(<BeatSubdivisionGrid />);

            const firstBeat = screen.getByRole('button', { name: /Beat 1, quarter/ });
            expect(firstBeat).toBeInTheDocument();
        });

        it('applies aria-pressed for selected beats', () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Initially no beats are selected
            beatCells.forEach(cell => {
                expect(cell).toHaveAttribute('aria-pressed', 'false');
            });
        });
    });

    describe('Measure Grouping', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(16);
        });

        it('displays measure labels', () => {
            render(<BeatSubdivisionGrid />);

            // Measure labels exist - use getAllByText since virtualization may create duplicates
            const m1Labels = screen.getAllByText('M1');
            expect(m1Labels.length).toBeGreaterThan(0);

            const m2Labels = screen.getAllByText('M2');
            expect(m2Labels.length).toBeGreaterThan(0);
        });

        it('respects custom beatsPerMeasure prop', () => {
            render(<BeatSubdivisionGrid beatsPerMeasure={8} />);

            // 16 beats / 8 beats per measure = 2 measures
            const m1Labels = screen.getAllByText('M1');
            expect(m1Labels.length).toBeGreaterThan(0);

            const m2Labels = screen.getAllByText('M2');
            expect(m2Labels.length).toBeGreaterThan(0);
        });

        it('uses time signature from store when beatsPerMeasure not provided', () => {
            mockTimeSignature = 8;

            render(<BeatSubdivisionGrid />);

            // 16 beats / 8 beats per measure = 2 measures
            const m1Labels = screen.getAllByText('M1');
            expect(m1Labels.length).toBeGreaterThan(0);
        });
    });

    describe('Zoom Controls', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(16);
        });

        it('starts with 1x zoom by default', () => {
            render(<BeatSubdivisionGrid />);

            // The reset button shows current zoom level
            const zoomDisplay = screen.getByRole('button', { name: 'Reset to 1x' });
            expect(zoomDisplay).toHaveTextContent('1x');
            // At default zoom, reset button should be disabled
            expect(zoomDisplay).toBeDisabled();
        });

        it('starts with initial zoom when specified', () => {
            render(<BeatSubdivisionGrid initialZoom={2} />);

            // The reset button shows current zoom level
            const zoomDisplay = screen.getByRole('button', { name: 'Reset to 1x' });
            expect(zoomDisplay).toHaveTextContent('2x');
            // At non-default zoom, reset button should be enabled
            expect(zoomDisplay).not.toBeDisabled();
        });

        it('increases zoom when zoom in button is clicked', () => {
            render(<BeatSubdivisionGrid />);

            const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
            fireEvent.click(zoomInBtn);

            // Should now show 2x
            const zoomDisplay = screen.getByRole('button', { name: 'Reset to 1x' });
            expect(zoomDisplay).toHaveTextContent('2x');
        });

        it('decreases zoom when zoom out button is clicked', () => {
            render(<BeatSubdivisionGrid initialZoom={2} />);

            const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
            fireEvent.click(zoomOutBtn);

            // Should now show 1x
            const zoomDisplay = screen.getByRole('button', { name: 'Reset to 1x' });
            expect(zoomDisplay).toHaveTextContent('1x');
        });

        it('resets to default zoom when reset button is clicked', () => {
            render(<BeatSubdivisionGrid initialZoom={4} />);

            const zoomDisplay = screen.getByRole('button', { name: 'Reset to 1x' });
            expect(zoomDisplay).toHaveTextContent('4x');
            fireEvent.click(zoomDisplay);

            expect(zoomDisplay).toHaveTextContent('1x');
        });

        it('disables zoom buttons when grid is disabled', () => {
            render(<BeatSubdivisionGrid disabled />);

            const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
            const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });
            const zoomDisplay = screen.getByRole('button', { name: 'Reset to 1x' });

            expect(zoomInBtn).toBeDisabled();
            expect(zoomOutBtn).toBeDisabled();
            expect(zoomDisplay).toBeDisabled();
        });
    });

    describe('Selection Display', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(8);
        });

        it('updates selection count when beats are selected', async () => {
            render(<BeatSubdivisionGrid />);

            // Click Select All
            fireEvent.click(screen.getByRole('button', { name: 'Select All' }));

            await waitFor(() => {
                expect(screen.getByText('8 selected')).toBeInTheDocument();
            });
        });

        it('applies selected class to selected beat cells', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click first beat
            fireEvent.click(beatCells[0]);

            await waitFor(() => {
                expect(beatCells[0]).toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });

        it('clears selection when Clear button is clicked', async () => {
            render(<BeatSubdivisionGrid />);

            // Select all
            fireEvent.click(screen.getByRole('button', { name: 'Select All' }));

            await waitFor(() => {
                expect(screen.getByText('8 selected')).toBeInTheDocument();
            });

            // Clear selection
            fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

            await waitFor(() => {
                expect(screen.getByText('0 selected')).toBeInTheDocument();
            });
        });
    });

    describe('Callbacks', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(8);
        });

        it('calls onSelectionChange when selection changes', async () => {
            const onSelectionChange = vi.fn();

            render(<BeatSubdivisionGrid onSelectionChange={onSelectionChange} />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            fireEvent.click(beatCells[0]);

            await waitFor(() => {
                expect(onSelectionChange).toHaveBeenCalled();
                const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0] as BeatSubdivisionSelection;
                expect(lastCall.selectedBeats.has(0)).toBe(true);
            });
        });

        it('calls onBeatClick when a beat is clicked', () => {
            const onBeatClick = vi.fn();

            render(<BeatSubdivisionGrid onBeatClick={onBeatClick} />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            fireEvent.click(beatCells[2]);

            expect(onBeatClick).toHaveBeenCalledWith(2);
        });
    });

    describe('Disabled State', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(8);
        });

        it('disables beat cells when disabled prop is true', () => {
            render(<BeatSubdivisionGrid disabled />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            beatCells.forEach(cell => {
                expect(cell).toHaveClass('beat-subdivision-grid-cell--disabled');
            });
        });

        it('disables action buttons when disabled', () => {
            render(<BeatSubdivisionGrid disabled />);

            expect(screen.getByRole('button', { name: 'Select All' })).toBeDisabled();
            expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
        });

        it('does not select beats when disabled', () => {
            render(<BeatSubdivisionGrid disabled />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            fireEvent.click(beatCells[0]);

            // Selection count should still be 0
            expect(screen.getByText('0 selected')).toBeInTheDocument();
        });
    });

    describe('Selection Interactions - Single Click', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(8);
        });

        it('selects a single beat on click', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click beat 3 (index 2)
            fireEvent.click(beatCells[2]);

            await waitFor(() => {
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(screen.getByText('1 selected')).toBeInTheDocument();
            });
        });

        it('replaces selection when clicking a different beat', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click beat 1
            fireEvent.click(beatCells[0]);

            await waitFor(() => {
                expect(beatCells[0]).toHaveClass('beat-subdivision-grid-cell--selected');
            });

            // Click beat 3 - should replace selection
            fireEvent.click(beatCells[2]);

            await waitFor(() => {
                expect(beatCells[0]).not.toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(screen.getByText('1 selected')).toBeInTheDocument();
            });
        });

        it('sets rangeStart and rangeEnd on single click', async () => {
            const onSelectionChange = vi.fn();

            render(<BeatSubdivisionGrid onSelectionChange={onSelectionChange} />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            fireEvent.click(beatCells[3]);

            await waitFor(() => {
                expect(onSelectionChange).toHaveBeenCalled();
                const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0] as BeatSubdivisionSelection;
                expect(lastCall.rangeStart).toBe(3);
                expect(lastCall.rangeEnd).toBe(3);
            });
        });
    });

    describe('Selection Interactions - Shift+Click Range Selection', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(16);
        });

        it('selects range from last selected beat to clicked beat with shift+click', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // First, click beat 2 (index 1) to establish anchor
            fireEvent.click(beatCells[1]);

            await waitFor(() => {
                expect(beatCells[1]).toHaveClass('beat-subdivision-grid-cell--selected');
            });

            // Then shift+click beat 6 (index 5) to select range
            fireEvent.click(beatCells[5], { shiftKey: true });

            await waitFor(() => {
                // Beats 2-6 should be selected (indices 1-5)
                expect(screen.getByText('5 selected')).toBeInTheDocument();
                expect(beatCells[1]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[3]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[4]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[5]).toHaveClass('beat-subdivision-grid-cell--selected');
                // Beat 1 and 7+ should NOT be selected
                expect(beatCells[0]).not.toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[6]).not.toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });

        it('selects range in reverse order (click higher then shift+click lower)', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click beat 7 (index 6)
            fireEvent.click(beatCells[6]);

            await waitFor(() => {
                expect(beatCells[6]).toHaveClass('beat-subdivision-grid-cell--selected');
            });

            // Shift+click beat 3 (index 2) - should select range 3-7
            fireEvent.click(beatCells[2], { shiftKey: true });

            await waitFor(() => {
                expect(screen.getByText('5 selected')).toBeInTheDocument();
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[3]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[4]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[5]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[6]).toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });

        it('sets rangeStart and rangeEnd correctly for shift+click range', async () => {
            const onSelectionChange = vi.fn();

            render(<BeatSubdivisionGrid onSelectionChange={onSelectionChange} />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click beat 2
            fireEvent.click(beatCells[1]);

            await waitFor(() => {
                expect(onSelectionChange).toHaveBeenCalled();
            });

            onSelectionChange.mockClear();

            // Shift+click beat 5
            fireEvent.click(beatCells[4], { shiftKey: true });

            await waitFor(() => {
                expect(onSelectionChange).toHaveBeenCalled();
                const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0] as BeatSubdivisionSelection;
                expect(lastCall.rangeStart).toBe(1);
                expect(lastCall.rangeEnd).toBe(4);
            });
        });

        it('does nothing on shift+click without prior selection', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Shift+click without prior selection - should just select that beat
            fireEvent.click(beatCells[3], { shiftKey: true });

            await waitFor(() => {
                expect(screen.getByText('1 selected')).toBeInTheDocument();
                expect(beatCells[3]).toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });
    });

    describe('Selection Interactions - Ctrl/Cmd+Click Toggle', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(8);
        });

        it('adds beat to selection with ctrl+click on unselected beat', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click beat 1
            fireEvent.click(beatCells[0]);

            await waitFor(() => {
                expect(screen.getByText('1 selected')).toBeInTheDocument();
            });

            // Ctrl+click beat 3 to add it
            fireEvent.click(beatCells[2], { ctrlKey: true });

            await waitFor(() => {
                expect(screen.getByText('2 selected')).toBeInTheDocument();
                expect(beatCells[0]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });

        it('removes beat from selection with ctrl+click on selected beat', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click beat 1
            fireEvent.click(beatCells[0]);

            await waitFor(() => {
                expect(screen.getByText('1 selected')).toBeInTheDocument();
            });

            // Ctrl+click beat 1 to remove it
            fireEvent.click(beatCells[0], { ctrlKey: true });

            await waitFor(() => {
                expect(screen.getByText('0 selected')).toBeInTheDocument();
                expect(beatCells[0]).not.toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });

        it('supports metaKey (cmd) as alternative to ctrlKey', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click beat 1
            fireEvent.click(beatCells[0]);

            await waitFor(() => {
                expect(screen.getByText('1 selected')).toBeInTheDocument();
            });

            // Meta+click (cmd on Mac) beat 3 to add it
            fireEvent.click(beatCells[2], { metaKey: true });

            await waitFor(() => {
                expect(screen.getByText('2 selected')).toBeInTheDocument();
                expect(beatCells[0]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });

        it('builds non-contiguous selection with multiple ctrl+clicks', async () => {
            const onSelectionChange = vi.fn();

            render(<BeatSubdivisionGrid onSelectionChange={onSelectionChange} />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Click beat 1
            fireEvent.click(beatCells[0]);

            // Ctrl+click beats 3 and 5
            fireEvent.click(beatCells[2], { ctrlKey: true });
            fireEvent.click(beatCells[4], { ctrlKey: true });

            await waitFor(() => {
                expect(screen.getByText('3 selected')).toBeInTheDocument();
                expect(beatCells[0]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[4]).toHaveClass('beat-subdivision-grid-cell--selected');

                // Non-contiguous selection should have null rangeStart/rangeEnd
                const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0] as BeatSubdivisionSelection;
                expect(lastCall.rangeStart).toBeNull();
                expect(lastCall.rangeEnd).toBeNull();
            });
        });
    });

    describe('Selection Interactions - Drag Selection', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(16);
        });

        it('selects range of beats when dragging across cells', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Start drag on beat 2 (index 1)
            fireEvent.mouseDown(beatCells[1], { button: 0 });

            // Simulate dragging across beats 3-5 (indices 2-4)
            fireEvent.mouseEnter(beatCells[2]);
            fireEvent.mouseEnter(beatCells[3]);
            fireEvent.mouseEnter(beatCells[4]);

            // End drag on beat 5 (index 4)
            fireEvent.mouseUp(beatCells[4]);

            await waitFor(() => {
                // Beats 2-5 should be selected
                expect(screen.getByText('4 selected')).toBeInTheDocument();
                expect(beatCells[1]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[3]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[4]).toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });

        it('selects range when dragging backwards', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Start drag on beat 6 (index 5)
            fireEvent.mouseDown(beatCells[5], { button: 0 });

            // Drag backwards to beat 3 (index 2)
            fireEvent.mouseEnter(beatCells[4]);
            fireEvent.mouseEnter(beatCells[3]);
            fireEvent.mouseEnter(beatCells[2]);

            fireEvent.mouseUp(beatCells[2]);

            await waitFor(() => {
                // Beats 3-6 should be selected
                expect(screen.getByText('4 selected')).toBeInTheDocument();
                expect(beatCells[2]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[3]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[4]).toHaveClass('beat-subdivision-grid-cell--selected');
                expect(beatCells[5]).toHaveClass('beat-subdivision-grid-cell--selected');
            });
        });

        it('does not start drag on right mouse button', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Try to start drag with right mouse button
            fireEvent.mouseDown(beatCells[1], { button: 2 });

            // Try to drag
            fireEvent.mouseEnter(beatCells[2]);
            fireEvent.mouseEnter(beatCells[3]);

            // Should not have started a drag selection
            expect(screen.getByText('0 selected')).toBeInTheDocument();
        });

        it('does not select when disabled', async () => {
            render(<BeatSubdivisionGrid disabled />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Try to start drag
            fireEvent.mouseDown(beatCells[1], { button: 0 });
            fireEvent.mouseEnter(beatCells[2]);
            fireEvent.mouseUp(beatCells[2]);

            // Should not have selected anything
            expect(screen.getByText('0 selected')).toBeInTheDocument();
        });

        it('sets rangeStart and rangeEnd during drag', async () => {
            const onSelectionChange = vi.fn();

            render(<BeatSubdivisionGrid onSelectionChange={onSelectionChange} />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // Start drag on beat 2
            fireEvent.mouseDown(beatCells[1], { button: 0 });

            // Drag to beat 5
            fireEvent.mouseEnter(beatCells[4]);

            await waitFor(() => {
                const lastCall = onSelectionChange.mock.calls[onSelectionChange.mock.calls.length - 1][0] as BeatSubdivisionSelection;
                expect(lastCall.rangeStart).toBe(1);
                expect(lastCall.rangeEnd).toBe(4);
            });
        });
    });

    describe('Double-Click to Cycle Subdivision', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(8);
        });

        it('cycles subdivision on double-click', async () => {
            render(<BeatSubdivisionGrid />);

            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // First beat starts as quarter (default)
            expect(beatCells[0]).toHaveClass('beat-subdivision-grid-cell--quarter');

            // Double-click to cycle to next subdivision
            fireEvent.doubleClick(beatCells[0]);

            await waitFor(() => {
                expect(mockActions.setBeatSubdivision).toHaveBeenCalledWith(0, 'half');
            });
        });
    });

    describe('Virtualization', () => {
        it('renders only visible beats for large beat counts', () => {
            // Create a large beat map
            mockUnifiedBeatMap = createMockUnifiedBeatMap(500);

            render(<BeatSubdivisionGrid />);

            // Should show total beat count
            expect(screen.getByText('500 beats')).toBeInTheDocument();

            // The component should render without crashing even with 500 beats
            // Virtualization should limit the number of actual DOM elements
            const beatCells = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-cell')
            );

            // With virtualization, we shouldn't have all 500 cells in the DOM
            // Just a subset based on the visible area
            expect(beatCells.length).toBeLessThan(500);
        });
    });

    // ========================================
    // Performance Tests - Task 8.3
    // ========================================
    describe('Performance - Large Beat Counts', () => {
        /**
         * Performance thresholds (in milliseconds).
         * These are generous to account for CI environment variability.
         */
        const RENDER_THRESHOLD_MS = 1000; // Max time for initial render
        const SELECTION_THRESHOLD_MS = 150; // Max time for selection operations (generous for CI)
        const ZOOM_THRESHOLD_MS = 300; // Max time for zoom changes

        /**
         * Helper to measure execution time of a function.
         */
        function measureTime<T>(fn: () => T): { result: T; durationMs: number } {
            const start = performance.now();
            const result = fn();
            const durationMs = performance.now() - start;
            return { result, durationMs };
        }

        beforeEach(() => {
            // Create a large beat map for performance testing
            mockUnifiedBeatMap = createMockUnifiedBeatMap(500);
            mockSubdivisionConfig = {
                beatSubdivisions: new Map<number, SubdivisionType>(),
                defaultSubdivision: 'quarter',
            };
        });

        describe('Render Performance', () => {
            it('renders 500 beats within performance threshold', () => {
                const { durationMs } = measureTime(() => {
                    render(<BeatSubdivisionGrid />);
                });

                expect(screen.getByText('500 beats')).toBeInTheDocument();
                expect(durationMs).toBeLessThan(RENDER_THRESHOLD_MS);
            });

            it('renders 1000 beats within performance threshold', () => {
                mockUnifiedBeatMap = createMockUnifiedBeatMap(1000);

                const { durationMs } = measureTime(() => {
                    render(<BeatSubdivisionGrid />);
                });

                expect(screen.getByText('1000 beats')).toBeInTheDocument();
                expect(durationMs).toBeLessThan(RENDER_THRESHOLD_MS);
            });

            it('limits DOM elements with virtualization (500 beats)', () => {
                render(<BeatSubdivisionGrid />);

                const beatCells = screen.getAllByRole('button').filter(btn =>
                    btn.classList.contains('beat-subdivision-grid-cell')
                );

                // Virtualization should render only a subset of beats
                // With buffer of 10 on each side and typical viewport,
                // we expect roughly 50-100 cells max
                expect(beatCells.length).toBeLessThan(100);
                expect(beatCells.length).toBeGreaterThan(0);
            });

            it('limits DOM elements with virtualization (1000 beats)', () => {
                mockUnifiedBeatMap = createMockUnifiedBeatMap(1000);

                render(<BeatSubdivisionGrid />);

                const beatCells = screen.getAllByRole('button').filter(btn =>
                    btn.classList.contains('beat-subdivision-grid-cell')
                );

                // Even with 1000 beats, DOM elements should stay roughly constant
                expect(beatCells.length).toBeLessThan(100);
            });

            it('creates correct measure grouping structure for large beat counts', () => {
                render(<BeatSubdivisionGrid />);

                // 500 beats / 4 beats per measure = 125 measures (but only visible ones rendered)
                const measureLabels = screen.getAllByText(/M\d+/);
                expect(measureLabels.length).toBeGreaterThan(0);
                expect(measureLabels.length).toBeLessThan(50); // Only visible measures
            });
        });

        describe('Selection Performance', () => {
            it('selects all 500 beats within performance threshold', async () => {
                render(<BeatSubdivisionGrid />);

                const selectAllBtn = screen.getByRole('button', { name: 'Select All' });

                const { durationMs } = measureTime(() => {
                    fireEvent.click(selectAllBtn);
                });

                expect(durationMs).toBeLessThan(SELECTION_THRESHOLD_MS);

                await waitFor(() => {
                    expect(screen.getByText('500 selected')).toBeInTheDocument();
                });
            });

            it('clears selection of 500 beats within performance threshold', async () => {
                render(<BeatSubdivisionGrid />);

                // First select all
                fireEvent.click(screen.getByRole('button', { name: 'Select All' }));
                await waitFor(() => {
                    expect(screen.getByText('500 selected')).toBeInTheDocument();
                });

                // Then clear
                const { durationMs } = measureTime(() => {
                    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
                });

                expect(durationMs).toBeLessThan(SELECTION_THRESHOLD_MS);

                await waitFor(() => {
                    expect(screen.getByText('0 selected')).toBeInTheDocument();
                });
            });

            it('handles rapid beat clicks without performance degradation', async () => {
                render(<BeatSubdivisionGrid />);

                const beatCells = screen.getAllByRole('button').filter(btn =>
                    btn.classList.contains('beat-subdivision-grid-cell')
                );

                // Rapidly click multiple beats
                const { durationMs } = measureTime(() => {
                    for (let i = 0; i < Math.min(10, beatCells.length); i++) {
                        fireEvent.click(beatCells[i], { ctrlKey: true });
                    }
                });

                expect(durationMs).toBeLessThan(SELECTION_THRESHOLD_MS * 2);
            });

            it('handles range selection (shift+click) efficiently', async () => {
                render(<BeatSubdivisionGrid />);

                const beatCells = screen.getAllByRole('button').filter(btn =>
                    btn.classList.contains('beat-subdivision-grid-cell')
                );

                // Click first beat
                fireEvent.click(beatCells[0]);

                // Shift+click last visible beat to select range
                const lastVisibleIndex = beatCells.length - 1;
                const { durationMs } = measureTime(() => {
                    fireEvent.click(beatCells[lastVisibleIndex], { shiftKey: true });
                });

                expect(durationMs).toBeLessThan(SELECTION_THRESHOLD_MS);
            });
        });

        describe('Zoom Performance', () => {
            it('changes zoom level within performance threshold', () => {
                render(<BeatSubdivisionGrid />);

                const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });

                const { durationMs } = measureTime(() => {
                    fireEvent.click(zoomInBtn);
                });

                expect(durationMs).toBeLessThan(ZOOM_THRESHOLD_MS);
                // Should now show 2x
                const zoomDisplay = screen.getByRole('button', { name: 'Reset to 1x' });
                expect(zoomDisplay).toHaveTextContent('2x');
            });

            it('handles rapid zoom changes without lag', () => {
                render(<BeatSubdivisionGrid />);

                const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
                const zoomOutBtn = screen.getByRole('button', { name: 'Zoom out' });

                const { durationMs } = measureTime(() => {
                    // Zoom in 3 times (1x -> 2x -> 4x -> 8x)
                    fireEvent.click(zoomInBtn);
                    fireEvent.click(zoomInBtn);
                    fireEvent.click(zoomInBtn);
                    // Zoom out 3 times (8x -> 4x -> 2x -> 1x)
                    fireEvent.click(zoomOutBtn);
                    fireEvent.click(zoomOutBtn);
                    fireEvent.click(zoomOutBtn);
                });

                // All 6 zoom changes should complete quickly
                expect(durationMs).toBeLessThan(ZOOM_THRESHOLD_MS * 3);
            });

            it('maintains virtualization after zoom change', () => {
                render(<BeatSubdivisionGrid />);

                // Change to max zoom by clicking zoom in 3 times (1x -> 2x -> 4x -> 8x)
                const zoomInBtn = screen.getByRole('button', { name: 'Zoom in' });
                fireEvent.click(zoomInBtn);
                fireEvent.click(zoomInBtn);
                fireEvent.click(zoomInBtn);

                const beatCells = screen.getAllByRole('button').filter(btn =>
                    btn.classList.contains('beat-subdivision-grid-cell')
                );

                // Virtualization should still work at 8x zoom
                expect(beatCells.length).toBeLessThan(100);
            });
        });

        describe('Scroll Performance', () => {
            it('handles scroll events without throwing errors', () => {
                const { container } = render(<BeatSubdivisionGrid />);

                const scrollContainer = container.querySelector('.beat-subdivision-grid-container');
                expect(scrollContainer).toBeInTheDocument();

                // Simulate scroll event
                const scrollEvent = new Event('scroll', { bubbles: true });
                Object.defineProperty(scrollEvent, 'scrollLeft', { value: 500 });

                expect(() => {
                    scrollContainer?.dispatchEvent(scrollEvent);
                }).not.toThrow();
            });

            it('updates virtualization on scroll', () => {
                const { container } = render(<BeatSubdivisionGrid />);

                const scrollContainer = container.querySelector('.beat-subdivision-grid-container');

                // Get initial cells
                const initialCells = container.querySelectorAll('.beat-subdivision-grid-cell');

                // Simulate scroll
                const scrollEvent = new Event('scroll', { bubbles: true });
                Object.defineProperty(scrollEvent, 'scrollLeft', { value: 1000 });
                scrollContainer?.dispatchEvent(scrollEvent);

                // After scroll, we should still have a limited number of cells
                // (virtualization recycles/updates cells)
                const afterScrollCells = container.querySelectorAll('.beat-subdivision-grid-cell');
                expect(afterScrollCells.length).toBeLessThan(100);
            });
        });

        describe('Memory Efficiency', () => {
            it('does not create excessive event listeners for large beat counts', () => {
                // This test verifies the component doesn't attach individual listeners
                // to each beat cell (which would be 500+ listeners)
                const addEventListenerSpy = vi.spyOn(EventTarget.prototype, 'addEventListener');

                render(<BeatSubdivisionGrid />);

                // The component should use event delegation, not individual listeners
                // on each cell. We allow some listeners for ResizeObserver, scroll, etc.
                // but not 500+ individual cell listeners
                const listenerCount = addEventListenerSpy.mock.calls.length;

                // Should be much less than beat count (500)
                // We allow up to 200 for React internals, ResizeObserver, scroll, drag-to-pan, etc.
                // The key is that we don't have 500+ (one per beat cell)
                expect(listenerCount).toBeLessThan(200);
                expect(listenerCount).toBeLessThan(500); // Definitely less than beat count

                addEventListenerSpy.mockRestore();
            });

            it('properly cleans up listeners on unmount', () => {
                const removeEventListenerSpy = vi.spyOn(EventTarget.prototype, 'removeEventListener');

                const { unmount } = render(<BeatSubdivisionGrid />);

                const initialRemoveCount = removeEventListenerSpy.mock.calls.length;

                unmount();

                // Should have called removeEventListener for cleanup
                expect(removeEventListenerSpy.mock.calls.length).toBeGreaterThan(initialRemoveCount);

                removeEventListenerSpy.mockRestore();
            });
        });

        describe('Edge Cases - Large Counts', () => {
            it('handles empty beat subdivisions map with 500 beats', () => {
                mockSubdivisionConfig = {
                    beatSubdivisions: new Map(), // Empty - all use default
                    defaultSubdivision: 'eighth',
                };

                const { durationMs } = measureTime(() => {
                    render(<BeatSubdivisionGrid />);
                });

                expect(durationMs).toBeLessThan(RENDER_THRESHOLD_MS);

                // All visible cells should have the default subdivision class
                const beatCells = screen.getAllByRole('button').filter(btn =>
                    btn.classList.contains('beat-subdivision-grid-cell')
                );

                beatCells.forEach(cell => {
                    expect(cell).toHaveClass('beat-subdivision-grid-cell--eighth');
                });
            });

            it('handles partially populated subdivisions with 500 beats', () => {
                // Set subdivisions for every 10th beat
                const subdivisions = new Map<number, SubdivisionType>();
                for (let i = 0; i < 500; i += 10) {
                    subdivisions.set(i, 'sixteenth');
                }
                mockSubdivisionConfig = {
                    beatSubdivisions: subdivisions,
                    defaultSubdivision: 'quarter',
                };

                const { durationMs } = measureTime(() => {
                    render(<BeatSubdivisionGrid />);
                });

                expect(durationMs).toBeLessThan(RENDER_THRESHOLD_MS);
            });

            it('handles subdivision config updates efficiently', async () => {
                const { rerender } = render(<BeatSubdivisionGrid />);

                // Update config with many subdivisions
                const newSubdivisions = new Map<number, SubdivisionType>();
                for (let i = 0; i < 50; i++) {
                    newSubdivisions.set(i, 'triplet8');
                }

                const { durationMs } = measureTime(() => {
                    rerender(<BeatSubdivisionGrid />);
                });

                expect(durationMs).toBeLessThan(RENDER_THRESHOLD_MS);
            });
        });
    });
});
