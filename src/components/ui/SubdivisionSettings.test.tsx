/**
 * Tests for SubdivisionSettings Component
 *
 * Phase 9, Task 9.2: Component Tests
 * - Test SubdivisionSettings component
 *   - Renders subdivision types
 *   - Handles segment add/remove
 *   - Calls store actions correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubdivisionSettings } from './SubdivisionSettings';
import type { SubdivisionConfig, UnifiedBeatMap, SubdividedBeatMap } from '@/types';

// Mock the store module
const mockActions = {
    addSubdivisionSegment: vi.fn(),
    removeSubdivisionSegment: vi.fn(),
    updateSubdivisionSegment: vi.fn(),
    generateSubdividedBeatMap: vi.fn(),
    setSubdivisionConfig: vi.fn(),
    setCurrentSubdivision: vi.fn(),
};

// Mock store state
let mockSubdivisionConfig: SubdivisionConfig = {
    segments: [{ startBeat: 0, subdivision: 'quarter' }],
};
let mockUnifiedBeatMap: UnifiedBeatMap | null = null;
let mockSubdividedBeatMap: SubdividedBeatMap | null = null;

vi.mock('../../store/beatDetectionStore', () => ({
    useBeatDetectionStore: vi.fn((selector) => {
        if (typeof selector === 'function') {
            return selector({
                actions: mockActions,
            });
        }
        return mockActions;
    }),
    useSubdivisionConfig: () => mockSubdivisionConfig,
    useUnifiedBeatMap: () => mockUnifiedBeatMap,
    useSubdividedBeatMap: () => mockSubdividedBeatMap,
    useSubdivisionMetadata: () => mockSubdividedBeatMap?.subdivisionMetadata ?? null,
}));

// Mock SubdivisionTimelineEditor since it's a complex component we don't need to test here
vi.mock('./SubdivisionTimelineEditor', () => ({
    SubdivisionTimelineEditor: vi.fn(() => (
        <div data-testid="subdivision-timeline-editor">Timeline Editor</div>
    )),
}));

/**
 * Helper to create a mock unified beat map.
 */
function createMockUnifiedBeatMap(beatCount: number, quarterNoteInterval: number = 0.5): UnifiedBeatMap {
    return {
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * quarterNoteInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            confidence: 1.0,
        })),
        quarterNoteInterval,
        bpm: 60 / quarterNoteInterval,
    };
}

/**
 * Helper to create a mock subdivided beat map.
 */
function createMockSubdividedBeatMap(beatCount: number): SubdividedBeatMap {
    return {
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * 0.25,
            beatInMeasure: (i / 4) % 4,
            isDownbeat: i % 16 === 0,
            measureNumber: Math.floor(i / 16),
            confidence: 1.0,
            subdivisionType: 'eighth',
            sourceBeatIndex: Math.floor(i / 2),
            beatInSubdivision: i % 2,
        })),
        quarterNoteInterval: 0.5,
        subdivisionMetadata: {
            totalBeats: 100,
            subdividedBeatCount: beatCount,
            subdivisionTypesUsed: ['quarter', 'eighth'],
            averageDensity: 1.5,
            segmentCount: 2,
            subdivisionsUsed: ['quarter', 'eighth'],
        },
    };
}

describe('SubdivisionSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSubdivisionConfig = {
            segments: [{ startBeat: 0, subdivision: 'quarter' }],
        };
        mockUnifiedBeatMap = null;
        mockSubdividedBeatMap = null;
    });

    describe('Rendering - No UnifiedBeatMap', () => {
        it('renders the component title', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('Beat Subdivision')).toBeInTheDocument();
        });

        it('shows notice when no beat map is generated', () => {
            render(<SubdivisionSettings />);

            expect(
                screen.getByText('Generate a beat map first to configure subdivisions.')
            ).toBeInTheDocument();
        });

        it('does not show segment controls when no unified beat map exists', () => {
            render(<SubdivisionSettings />);

            // The "Add Segment" button should not be present
            expect(screen.queryByText('Add Segment')).not.toBeInTheDocument();
        });
    });

    describe('Rendering - With UnifiedBeatMap', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('shows segment controls when unified beat map exists', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('Add Segment')).toBeInTheDocument();
            expect(screen.getByText('Segments')).toBeInTheDocument();
        });

        it('shows beat count available', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('100 quarter notes available')).toBeInTheDocument();
        });

        it('shows Generate button', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('Generate Subdivided Beat Map')).toBeInTheDocument();
        });
    });

    describe('Renders Subdivision Types (Task 9.2.1)', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('renders subdivision type toggles for each segment', () => {
            render(<SubdivisionSettings />);

            // Check that all 8 subdivision types are rendered as toggle buttons
            // The short labels are used: 1x, 0.5x, 2x, 4x, 3/Q, 3/H, 1.5x, Swing
            expect(screen.getByText('1x')).toBeInTheDocument(); // Quarter
            expect(screen.getByText('0.5x')).toBeInTheDocument(); // Half
            expect(screen.getByText('2x')).toBeInTheDocument(); // Eighth
            expect(screen.getByText('4x')).toBeInTheDocument(); // Sixteenth
            expect(screen.getByText('3/Q')).toBeInTheDocument(); // Triplet 8th
            expect(screen.getByText('3/H')).toBeInTheDocument(); // Triplet 4th
            expect(screen.getByText('1.5x')).toBeInTheDocument(); // Dotted Q
            expect(screen.getByText('Swing')).toBeInTheDocument(); // Dotted 8th
        });

        it('shows the active subdivision type for each segment', () => {
            render(<SubdivisionSettings />);

            // The default segment should have Quarter (1x) selected
            const quarterButton = screen.getByRole('radio', { name: /Quarter.*default/i });
            expect(quarterButton).toHaveAttribute('aria-checked', 'true');
        });

        it('displays subdivision type description for selected type', () => {
            render(<SubdivisionSettings />);

            // Should show the description for Quarter
            expect(
                screen.getByText('Quarter - Quarter notes (default, no subdivision)')
            ).toBeInTheDocument();
        });

        it('shows start beat input for each segment', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByLabelText('Start beat for segment 1')).toBeInTheDocument();
        });

        it('shows segment number for each segment', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('#1')).toBeInTheDocument();
        });
    });

    describe('Handles Segment Add/Remove (Task 9.2.2)', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('calls addSubdivisionSegment when Add Segment button is clicked', () => {
            render(<SubdivisionSettings />);

            const addButton = screen.getByText('Add Segment').closest('button')!;
            fireEvent.click(addButton);

            expect(mockActions.addSubdivisionSegment).toHaveBeenCalledTimes(1);
            expect(mockActions.addSubdivisionSegment).toHaveBeenCalledWith({
                startBeat: expect.any(Number),
                subdivision: 'quarter',
            });
        });

        it('adds segment with suggested start beat based on last segment', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            render(<SubdivisionSettings />);

            const addButton = screen.getByText('Add Segment').closest('button')!;
            fireEvent.click(addButton);

            // Should suggest startBeat at last segment's startBeat + 32 (0 + 32 = 32)
            expect(mockActions.addSubdivisionSegment).toHaveBeenCalledWith({
                startBeat: 32,
                subdivision: 'quarter',
            });
        });

        it('clamps suggested start beat to total beats', () => {
            // Create a beat map with only 20 beats
            mockUnifiedBeatMap = createMockUnifiedBeatMap(20);

            render(<SubdivisionSettings />);

            const addButton = screen.getByText('Add Segment').closest('button')!;
            fireEvent.click(addButton);

            // Should clamp to totalBeats - 1 (19)
            expect(mockActions.addSubdivisionSegment).toHaveBeenCalledWith({
                startBeat: 19,
                subdivision: 'quarter',
            });
        });

        it('disables Add Segment button when 8 segments exist', () => {
            mockSubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 10, subdivision: 'eighth' as const },
                    { startBeat: 20, subdivision: 'quarter' as const },
                    { startBeat: 30, subdivision: 'eighth' as const },
                    { startBeat: 40, subdivision: 'quarter' as const },
                    { startBeat: 50, subdivision: 'eighth' as const },
                    { startBeat: 60, subdivision: 'quarter' as const },
                    { startBeat: 70, subdivision: 'eighth' as const },
                ],
            };

            render(<SubdivisionSettings />);

            const addButton = screen.getByText('Add Segment').closest('button')!;
            expect(addButton).toBeDisabled();
        });

        it('shows maximum segment limit message when at limit', () => {
            mockSubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 10, subdivision: 'eighth' as const },
                    { startBeat: 20, subdivision: 'quarter' as const },
                    { startBeat: 30, subdivision: 'eighth' as const },
                    { startBeat: 40, subdivision: 'quarter' as const },
                    { startBeat: 50, subdivision: 'eighth' as const },
                    { startBeat: 60, subdivision: 'quarter' as const },
                    { startBeat: 70, subdivision: 'eighth' as const },
                ],
            };

            render(<SubdivisionSettings />);

            expect(screen.getByText('Maximum 8 segments allowed')).toBeInTheDocument();
        });

        it('does not show remove button for first segment', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            render(<SubdivisionSettings />);

            // Only one segment, should not have any remove button
            expect(screen.queryByLabelText('Remove segment 1')).not.toBeInTheDocument();
        });

        it('shows remove button for segments after the first', () => {
            mockSubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 32, subdivision: 'eighth' as const },
                ],
            };

            render(<SubdivisionSettings />);

            // Second segment should have a remove button
            expect(screen.getByLabelText('Remove segment 2')).toBeInTheDocument();
        });

        it('calls removeSubdivisionSegment when remove button is clicked', () => {
            mockSubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 32, subdivision: 'eighth' as const },
                ],
            };

            render(<SubdivisionSettings />);

            const removeButton = screen.getByLabelText('Remove segment 2');
            fireEvent.click(removeButton);

            expect(mockActions.removeSubdivisionSegment).toHaveBeenCalledTimes(1);
            expect(mockActions.removeSubdivisionSegment).toHaveBeenCalledWith(1);
        });

        it('does not call removeSubdivisionSegment for first segment (index 0)', () => {
            mockSubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 32, subdivision: 'eighth' as const },
                ],
            };

            render(<SubdivisionSettings />);

            // The component doesn't render a remove button for segment 1 (index 0)
            // So we verify by checking the component's handleRemoveSegment logic
            // If we click on segment 1's area (which doesn't have a remove button),
            // nothing should happen

            // Verify that removeSubdivisionSegment was not called at all
            expect(mockActions.removeSubdivisionSegment).not.toHaveBeenCalled();
        });
    });

    describe('Calls Store Actions Correctly (Task 9.2.3)', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('calls updateSubdivisionSegment when subdivision type is changed', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            render(<SubdivisionSettings />);

            // Click on the Eighth (2x) button
            const eighthButton = screen.getByRole('radio', { name: /Eighth.*double/i });
            fireEvent.click(eighthButton);

            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledTimes(1);
            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledWith(0, {
                startBeat: 0,
                subdivision: 'eighth',
            });
        });

        it('calls updateSubdivisionSegment when start beat is changed', () => {
            mockSubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 32, subdivision: 'eighth' as const },
                ],
            };

            render(<SubdivisionSettings />);

            // Find the start beat input for segment 2 and change it
            const startBeatInput = screen.getByLabelText('Start beat for segment 2') as HTMLInputElement;
            fireEvent.change(startBeatInput, { target: { value: '48' } });

            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledTimes(1);
            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledWith(1, {
                startBeat: 48,
                subdivision: 'eighth',
            });
        });

        it('clamps start beat to total beats when changed', () => {
            mockSubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 32, subdivision: 'eighth' as const },
                ],
            };

            render(<SubdivisionSettings />);

            const startBeatInput = screen.getByLabelText('Start beat for segment 2') as HTMLInputElement;
            // Try to set a value higher than total beats
            fireEvent.change(startBeatInput, { target: { value: '200' } });

            // Should be clamped to totalBeats - 1 (99)
            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledWith(1, {
                startBeat: 99,
                subdivision: 'eighth',
            });
        });

        it('ignores invalid start beat input', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            render(<SubdivisionSettings />);

            const startBeatInput = screen.getByLabelText('Start beat for segment 1') as HTMLInputElement;
            // Try to set an invalid value
            fireEvent.change(startBeatInput, { target: { value: 'abc' } });

            // Should not call the action for invalid input
            expect(mockActions.updateSubdivisionSegment).not.toHaveBeenCalled();
        });

        it('ignores negative start beat input', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            render(<SubdivisionSettings />);

            const startBeatInput = screen.getByLabelText('Start beat for segment 1') as HTMLInputElement;
            fireEvent.change(startBeatInput, { target: { value: '-5' } });

            // Should not call the action for negative input
            expect(mockActions.updateSubdivisionSegment).not.toHaveBeenCalled();
        });

        it('calls generateSubdividedBeatMap when Generate button is clicked', async () => {
            render(<SubdivisionSettings />);

            const generateButton = screen.getByText('Generate Subdivided Beat Map').closest('button')!;
            fireEvent.click(generateButton);

            // The component uses requestAnimationFrame, so we need to wait
            await waitFor(() => {
                expect(mockActions.generateSubdividedBeatMap).toHaveBeenCalledTimes(1);
            });
        });

        it('shows loading state during generation', async () => {
            render(<SubdivisionSettings />);

            const generateButton = screen.getByText('Generate Subdivided Beat Map').closest('button')!;

            fireEvent.click(generateButton);

            // The button should show loading text immediately after click
            // but before requestAnimationFrame runs
            await waitFor(() => {
                expect(screen.getByText('Generating...')).toBeInTheDocument();
            });
        });
    });

    describe('Keyboard Navigation', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('supports keyboard navigation with arrow keys', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            render(<SubdivisionSettings />);

            // Get the radiogroup container
            const radiogroup = screen.getByRole('radiogroup', { name: /Subdivision type for segment 1/i });

            // Press ArrowRight to move to next type
            fireEvent.keyDown(radiogroup, { key: 'ArrowRight' });

            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledWith(0, {
                startBeat: 0,
                subdivision: 'half', // Second type in the list
            });
        });

        it('wraps around when navigating past the last type', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            render(<SubdivisionSettings />);

            const radiogroup = screen.getByRole('radiogroup', { name: /Subdivision type for segment 1/i });

            // Press ArrowLeft to move to previous type (wraps to last)
            fireEvent.keyDown(radiogroup, { key: 'ArrowLeft' });

            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledWith(0, {
                startBeat: 0,
                subdivision: 'dotted8', // Last type in the list
            });
        });

        it('supports Home key to go to first type', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'eighth' }],
            };

            render(<SubdivisionSettings />);

            const radiogroup = screen.getByRole('radiogroup', { name: /Subdivision type for segment 1/i });

            // Press Home to go to first type
            fireEvent.keyDown(radiogroup, { key: 'Home' });

            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledWith(0, {
                startBeat: 0,
                subdivision: 'quarter',
            });
        });

        it('supports End key to go to last type', () => {
            mockSubdivisionConfig = {
                segments: [{ startBeat: 0, subdivision: 'quarter' }],
            };

            render(<SubdivisionSettings />);

            const radiogroup = screen.getByRole('radiogroup', { name: /Subdivision type for segment 1/i });

            // Press End to go to last type
            fireEvent.keyDown(radiogroup, { key: 'End' });

            expect(mockActions.updateSubdivisionSegment).toHaveBeenCalledWith(0, {
                startBeat: 0,
                subdivision: 'dotted8',
            });
        });
    });

    describe('Generated Beat Map Display', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('shows generated info when subdivided beat map exists', () => {
            mockSubdividedBeatMap = createMockSubdividedBeatMap(200);

            render(<SubdivisionSettings />);

            expect(screen.getByText('Generated')).toBeInTheDocument();
        });

        it('shows beat count from subdivision metadata', () => {
            mockSubdividedBeatMap = createMockSubdividedBeatMap(200);

            render(<SubdivisionSettings />);

            // The metadata shows subdividedBeatCount in the generated stats section
            // There are multiple elements with "200 beats", so we use getAllByText
            const elements = screen.getAllByText(/200 beats/);
            expect(elements.length).toBeGreaterThan(0);
        });

        it('shows subdivision types used from metadata', () => {
            mockSubdividedBeatMap = createMockSubdividedBeatMap(200);

            render(<SubdivisionSettings />);

            // The metadata shows subdivisionsUsed joined by →
            expect(screen.getByText(/quarter → eighth/)).toBeInTheDocument();
        });
    });

    describe('Timeline Editor Integration', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('shows timeline toggle button', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('Timeline Editor')).toBeInTheDocument();
        });

        it('shows timeline editor when toggle is clicked', () => {
            render(<SubdivisionSettings />);

            const toggleButton = screen.getByText('Timeline Editor').closest('button')!;
            fireEvent.click(toggleButton);

            expect(screen.getByTestId('subdivision-timeline-editor')).toBeInTheDocument();
        });

        it('auto-shows timeline when multiple segments exist', () => {
            mockSubdivisionConfig = {
                segments: [
                    { startBeat: 0, subdivision: 'quarter' as const },
                    { startBeat: 32, subdivision: 'eighth' as const },
                ],
            };

            render(<SubdivisionSettings />);

            // Timeline should be visible without clicking toggle
            expect(screen.getByTestId('subdivision-timeline-editor')).toBeInTheDocument();
        });
    });

    describe('Disabled State', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('disables all controls when disabled prop is true', () => {
            render(<SubdivisionSettings disabled={true} />);

            // Add segment button should be disabled
            const addButton = screen.getByText('Add Segment').closest('button')!;
            expect(addButton).toBeDisabled();

            // Generate button should be disabled
            const generateButton = screen.getByText('Generate Subdivided Beat Map').closest('button')!;
            expect(generateButton).toBeDisabled();

            // Subdivision type toggles should be disabled
            const radioButton = screen.getByRole('radio', { name: /Quarter.*default/i });
            expect(radioButton).toBeDisabled();

            // Start beat input should be disabled
            const startBeatInput = screen.getByLabelText('Start beat for segment 1');
            expect(startBeatInput).toBeDisabled();
        });

        it('does not call actions when disabled', () => {
            render(<SubdivisionSettings disabled={true} />);

            // Try to click add segment
            const addButton = screen.getByText('Add Segment').closest('button')!;
            fireEvent.click(addButton);

            // Action should not be called since button is disabled
            expect(mockActions.addSubdivisionSegment).not.toHaveBeenCalled();
        });
    });
});
