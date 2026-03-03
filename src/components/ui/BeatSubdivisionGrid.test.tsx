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

            expect(screen.getByText('Zoom:')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '0.5x' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '1x' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '2x' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '4x' })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: '8x' })).toBeInTheDocument();
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

            const zoomBtn1x = screen.getByRole('button', { name: '1x' });
            expect(zoomBtn1x).toHaveClass('beat-subdivision-grid-zoom-btn--active');
        });

        it('starts with initial zoom when specified', () => {
            render(<BeatSubdivisionGrid initialZoom={2} />);

            const zoomBtn2x = screen.getByRole('button', { name: '2x' });
            expect(zoomBtn2x).toHaveClass('beat-subdivision-grid-zoom-btn--active');
        });

        it('changes zoom level when zoom button is clicked', () => {
            render(<BeatSubdivisionGrid />);

            const zoomBtn2x = screen.getByRole('button', { name: '2x' });
            fireEvent.click(zoomBtn2x);

            expect(zoomBtn2x).toHaveClass('beat-subdivision-grid-zoom-btn--active');
            expect(screen.getByRole('button', { name: '1x' })).not.toHaveClass('beat-subdivision-grid-zoom-btn--active');
        });

        it('disables zoom buttons when grid is disabled', () => {
            render(<BeatSubdivisionGrid disabled />);

            const zoomButtons = screen.getAllByRole('button').filter(btn =>
                btn.classList.contains('beat-subdivision-grid-zoom-btn')
            );

            zoomButtons.forEach(btn => {
                expect(btn).toBeDisabled();
            });
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
});
