/**
 * Tests for SubdivisionSettings Component
 *
 * Phase 9, Task 9.2: Component Tests
 * - Test SubdivisionSettings component with per-beat subdivision format
 * - Renders BeatSubdivisionGrid and SubdivisionToolbar
 * - Generate button works with new config format
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SubdivisionSettings } from './SubdivisionSettings';
import type { SubdivisionConfig, UnifiedBeatMap, SubdividedBeatMap, SubdivisionType } from '@/types';

// Mock the store module
const mockActions = {
    generateSubdividedBeatMap: vi.fn(),
    setBeatSubdivision: vi.fn(),
    setBeatSubdivisionRange: vi.fn(),
    clearAllBeatSubdivisions: vi.fn(),
    setSubdivisionConfig: vi.fn(),
};

// Mock store state - using per-beat format
let mockSubdivisionConfig: SubdivisionConfig = {
    beatSubdivisions: new Map<number, SubdivisionType>(),
    defaultSubdivision: 'quarter',
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

// Mock BeatSubdivisionGrid since it's a complex component
vi.mock('./BeatSubdivisionGrid', () => ({
    BeatSubdivisionGrid: vi.fn(() => (
        <div data-testid="beat-subdivision-grid">Beat Subdivision Grid</div>
    )),
}));

// Mock SubdivisionToolbar
vi.mock('./SubdivisionToolbar', () => ({
    SubdivisionToolbar: vi.fn(() => (
        <div data-testid="subdivision-toolbar">Subdivision Toolbar</div>
    )),
    SUBDIVISION_TYPES: [
        { id: 'half', label: 'Half', density: 0.5, description: 'Half notes' },
        { id: 'quarter', label: 'Quarter', density: 1, description: 'Quarter notes' },
        { id: 'eighth', label: 'Eighth', density: 2, description: 'Eighth notes' },
        { id: 'sixteenth', label: 'Sixteenth', density: 4, description: 'Sixteenth notes' },
        { id: 'triplet8', label: 'Triplet 8th', density: 1.5, description: 'Triplet eighth notes' },
        { id: 'triplet4', label: 'Triplet 4th', density: 0.67, description: 'Triplet quarter notes' },
        { id: 'dotted4', label: 'Dotted Q', density: 0.67, description: 'Dotted quarter notes' },
        { id: 'dotted8', label: 'Swing', density: 1.5, description: 'Swing feel' },
    ],
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
        downbeatConfig: { segments: [] },
    };
}

/**
 * Helper to create a mock subdivided beat map.
 */
function createMockSubdividedBeatMap(beatCount: number): SubdividedBeatMap {
    return {
        audioId: 'test-audio',
        duration: beatCount * 0.25,
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * 0.25,
            beatInMeasure: (i / 4) % 4,
            isDownbeat: i % 16 === 0,
            measureNumber: Math.floor(i / 16),
            confidence: 1.0,
            intensity: 0.8,
            subdivisionType: 'eighth',
            isDetected: i % 2 === 0,
            originalBeatIndex: Math.floor(i / 2),
        })),
        detectedBeatIndices: Array.from({ length: Math.floor(beatCount / 2) }, (_, i) => i * 2),
        subdivisionConfig: mockSubdivisionConfig,
        subdivisionMetadata: {
            originalBeatCount: 100,
            subdividedBeatCount: beatCount,
            averageDensityMultiplier: 1.5,
            explicitBeatCount: 0,
            subdivisionsUsed: ['quarter', 'eighth'],
            hasMultipleTempos: false,
            maxDensity: 2,
        },
    };
}

describe('SubdivisionSettings', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockSubdivisionConfig = {
            beatSubdivisions: new Map<number, SubdivisionType>(),
            defaultSubdivision: 'quarter',
        };
        mockUnifiedBeatMap = null;
        mockSubdividedBeatMap = null;
    });

    describe('Rendering - No UnifiedBeatMap', () => {
        it('renders the component title', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('Subdivision Settings')).toBeInTheDocument();
        });

        it('shows notice when no beat map is generated', () => {
            render(<SubdivisionSettings />);

            expect(
                screen.getByText('Generate a beat map first to configure subdivisions')
            ).toBeInTheDocument();
        });

        it('does not show toolbar when no unified beat map exists', () => {
            render(<SubdivisionSettings />);

            expect(screen.queryByTestId('subdivision-toolbar')).not.toBeInTheDocument();
        });
    });

    describe('Rendering - With UnifiedBeatMap', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('shows toolbar when unified beat map exists', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByTestId('subdivision-toolbar')).toBeInTheDocument();
        });

        it('shows the BeatSubdivisionGrid', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByTestId('beat-subdivision-grid')).toBeInTheDocument();
        });

        it('shows Generate button', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('Generate Subdivided Beat Map')).toBeInTheDocument();
        });

        it('shows summary stats', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('Total Beats')).toBeInTheDocument();
            expect(screen.getByText('100')).toBeInTheDocument();
        });

        it('shows default subdivision in summary', () => {
            render(<SubdivisionSettings />);

            expect(screen.getByText('Default')).toBeInTheDocument();
            expect(screen.getByText('Quarter')).toBeInTheDocument();
        });
    });

    describe('Generate Button', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
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
            await waitFor(() => {
                expect(screen.getByText('Generating...')).toBeInTheDocument();
            });
        });

        it('disables generate button when no unified beat map exists', () => {
            mockUnifiedBeatMap = null;
            render(<SubdivisionSettings />);

            const generateButton = screen.getByText('Generate Subdivided Beat Map').closest('button')!;
            expect(generateButton).toBeDisabled();
        });
    });

    describe('Generated Beat Map Display', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('shows generated info when subdivided beat map exists', () => {
            mockSubdividedBeatMap = createMockSubdividedBeatMap(200);

            render(<SubdivisionSettings />);

            expect(screen.getByText('Generated Beat Map')).toBeInTheDocument();
        });

        it('shows original beat count from subdivision metadata', () => {
            mockSubdividedBeatMap = createMockSubdividedBeatMap(200);

            render(<SubdivisionSettings />);

            expect(screen.getByText('Original Beats')).toBeInTheDocument();
            // Check the stat container for the value
            const originalStat = screen.getByText('Original Beats').closest('.subdivision-settings-stat');
            expect(originalStat).toHaveTextContent('100');
        });

        it('shows subdivided beat count from metadata', () => {
            mockSubdividedBeatMap = createMockSubdividedBeatMap(200);

            render(<SubdivisionSettings />);

            expect(screen.getByText('Subdivided Beats')).toBeInTheDocument();
            expect(screen.getByText('200')).toBeInTheDocument();
        });

        it('shows average density from metadata', () => {
            mockSubdividedBeatMap = createMockSubdividedBeatMap(200);

            render(<SubdivisionSettings />);

            expect(screen.getByText('Avg Density')).toBeInTheDocument();
            expect(screen.getByText('1.5x')).toBeInTheDocument();
        });
    });

    describe('Distribution Display', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('shows distribution when beats are configured', () => {
            // All 100 beats use default 'quarter'
            render(<SubdivisionSettings />);

            expect(screen.getByText('Distribution:')).toBeInTheDocument();
            expect(screen.getByText(/100 quarter/)).toBeInTheDocument();
        });

        it('shows custom subdivision count', () => {
            // Add some custom subdivisions
            mockSubdivisionConfig = {
                beatSubdivisions: new Map([
                    [0, 'eighth'],
                    [1, 'eighth'],
                    [2, 'sixteenth'],
                ]),
                defaultSubdivision: 'quarter',
            };

            render(<SubdivisionSettings />);

            expect(screen.getByText('Custom')).toBeInTheDocument();
            // 3 custom subdivisions - check the stat value container
            const customStat = screen.getByText('Custom').closest('.subdivision-settings-summary-stat');
            expect(customStat).toHaveTextContent('3');
        });

        it('counts unique subdivisions correctly', () => {
            mockSubdivisionConfig = {
                beatSubdivisions: new Map([
                    [0, 'eighth'],
                    [1, 'sixteenth'],
                ]),
                defaultSubdivision: 'quarter',
            };

            render(<SubdivisionSettings />);

            // quarter (default), eighth, sixteenth = 3 unique
            expect(screen.getByText('Unique')).toBeInTheDocument();
            expect(screen.getByText('3')).toBeInTheDocument();
        });
    });

    describe('Disabled State', () => {
        beforeEach(() => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
        });

        it('disables generate button when disabled prop is true', () => {
            render(<SubdivisionSettings disabled={true} />);

            const generateButton = screen.getByText('Generate Subdivided Beat Map').closest('button')!;
            expect(generateButton).toBeDisabled();
        });

        it('does not call generateSubdividedBeatMap when disabled', async () => {
            render(<SubdivisionSettings disabled={true} />);

            const generateButton = screen.getByText('Generate Subdivided Beat Map').closest('button')!;
            fireEvent.click(generateButton);

            // Action should not be called since button is disabled
            expect(mockActions.generateSubdividedBeatMap).not.toHaveBeenCalled();
        });
    });

    describe('Per-Beat Config Format', () => {
        it('works with empty beatSubdivisions Map', () => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
            mockSubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'quarter',
            };

            render(<SubdivisionSettings />);

            expect(screen.getByText('Subdivision Settings')).toBeInTheDocument();
        });

        it('works with populated beatSubdivisions Map', () => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
            mockSubdivisionConfig = {
                beatSubdivisions: new Map([
                    [0, 'eighth'],
                    [1, 'eighth'],
                    [2, 'quarter'],
                    [3, 'sixteenth'],
                ]),
                defaultSubdivision: 'quarter',
            };

            render(<SubdivisionSettings />);

            expect(screen.getByText('Subdivision Settings')).toBeInTheDocument();
            // Shows 4 custom subdivisions - check the Custom stat
            const customStat = screen.getByText('Custom').closest('.subdivision-settings-summary-stat');
            expect(customStat).toHaveTextContent('4');
        });

        it('handles different default subdivisions', () => {
            mockUnifiedBeatMap = createMockUnifiedBeatMap(100);
            mockSubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth',
            };

            render(<SubdivisionSettings />);

            expect(screen.getByText('Eighth')).toBeInTheDocument();
        });
    });
});
