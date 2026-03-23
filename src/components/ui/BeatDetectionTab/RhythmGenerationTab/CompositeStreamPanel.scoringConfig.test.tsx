/**
 * Tests for CompositeStreamPanel Component - Scoring Configuration Display
 *
 * Frontend Test from BAND_BIAS_WEIGHTS_PLAN.md:
 * - Composite reflects customized scoring
 *
 * Verifies that the CompositeStreamPanel correctly displays the scoring configuration
 * that was used during rhythm generation, including:
 * - Band bias weights with color coding
 * - Factor weights (IOI, Syncopation, Phrase, Density)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CompositeStreamPanel } from './CompositeStreamPanel';
import type { GeneratedRhythm, StreamScorerConfig } from '../../../../types/rhythmGeneration';

// Mock the audio player store
vi.mock('../../../../store/audioPlayerStore', () => ({
    useAudioPlayerStore: vi.fn((selector) => {
        const state = {
            currentTime: 0,
            playbackState: 'paused',
            seek: vi.fn(),
        };
        return selector ? selector(state) : state;
    }),
}));

// Mock ZoomControls since it's not relevant to this test
vi.mock('../../../ZoomControls', () => ({
    ZoomControls: () => <div data-testid="zoom-controls" />,
}));

/**
 * Creates a minimal mock GeneratedRhythm for testing
 */
function createMockRhythm(overrides: Partial<GeneratedRhythm> = {}): GeneratedRhythm {
    return {
        difficultyVariants: {
            easy: { beats: [], difficulty: 'easy', metadata: { averageIntensity: 0.5, beatCount: 0 } },
            medium: { beats: [], difficulty: 'medium', metadata: { averageIntensity: 0.5, beatCount: 0 } },
            hard: { beats: [], difficulty: 'hard', metadata: { averageIntensity: 0.5, beatCount: 0 } },
        },
        bandStreams: {
            low: { audioId: 'test', duration: 60, beats: [], gridDecisions: [] },
            mid: { audioId: 'test', duration: 60, beats: [], gridDecisions: [] },
            high: { audioId: 'test', duration: 60, beats: [], gridDecisions: [] },
        },
        composite: {
            beats: [],
            sections: [],
            naturalDifficulty: 'medium',
            quarterNoteInterval: 0.5,
            metadata: {
                totalBeats: 100,
                sectionCount: 10,
                beatsPerBand: { low: 30, mid: 40, high: 30 },
                sectionsPerBand: { low: 3, mid: 4, high: 3 },
            },
        },
        analysis: {
            transientAnalysis: {} as any,
            quantizationResult: {} as any,
            phraseAnalysis: {} as any,
            densityAnalysis: {} as any,
            scoringResult: {} as any,
        },
        metadata: {
            difficulty: 'medium' as any,
            bandsAnalyzed: ['low', 'mid', 'high'],
            transientsDetected: 100,
            transientsFilteredByIntensity: 20,
            densityValidationRetries: 0,
            phrasesDetected: 5,
        },
        ...overrides,
    } as GeneratedRhythm;
}

describe('CompositeStreamPanel - Scoring Configuration Display', () => {
    let mockRhythm: GeneratedRhythm;

    beforeEach(() => {
        mockRhythm = createMockRhythm();
    });

    describe('No Scoring Config', () => {
        it('does not display scoring config info when scoringConfig is not provided', () => {
            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                />
            );

            // Should NOT show "Custom scoring applied" message
            expect(screen.queryByText(/custom scoring applied/i)).not.toBeInTheDocument();
        });

        it('does not display scoring config info when scoringConfig is undefined', () => {
            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={undefined}
                />
            );

            expect(screen.queryByText(/custom scoring applied/i)).not.toBeInTheDocument();
        });
    });

    describe('Band Bias Weights Display', () => {
        it('displays "Custom scoring applied" when scoringConfig is provided', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: { low: 0.5, mid: 1.0, high: 1.5 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            expect(screen.getByText(/custom scoring applied/i)).toBeInTheDocument();
        });

        it('displays band bias weights with color coding', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: { low: 0.3, mid: 1.2, high: 1.8 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Check that bias values are displayed
            expect(screen.getByText(/Low 0\.3x/i)).toBeInTheDocument();
            expect(screen.getByText(/Mid 1\.2x/i)).toBeInTheDocument();
            expect(screen.getByText(/High 1\.8x/i)).toBeInTheDocument();
        });

        it('displays "Bias:" label when bandBiasWeights is provided', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: { low: 1.0, mid: 1.0, high: 1.0 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            expect(screen.getByText('Bias:')).toBeInTheDocument();
        });

        it('does not display bias section when bandBiasWeights is undefined', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.35,
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Should show custom scoring applied (because factor weights are set)
            expect(screen.getByText(/custom scoring applied/i)).toBeInTheDocument();
            // But should NOT show Bias: label
            expect(screen.queryByText('Bias:')).not.toBeInTheDocument();
        });
    });

    describe('Factor Weights Display', () => {
        it('displays factor weights when custom factor values are provided', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.35,
                syncopationWeight: 0.35,
                phraseSignificanceWeight: 0.20,
                densityWeight: 0.10,
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            expect(screen.getByText('Factors:')).toBeInTheDocument();
            expect(screen.getByText(/IOI/)).toBeInTheDocument();
            expect(screen.getByText(/Sync/)).toBeInTheDocument();
            expect(screen.getByText(/Phrase/)).toBeInTheDocument();
            expect(screen.getByText(/Density/)).toBeInTheDocument();
        });

        it('displays correct factor values with custom weights', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.40,
                syncopationWeight: 0.30,
                phraseSignificanceWeight: 0.20,
                densityWeight: 0.10,
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Check that the custom values are displayed (0.40, 0.30, 0.20, 0.10)
            expect(screen.getByText('0.40')).toBeInTheDocument();
            expect(screen.getByText('0.30')).toBeInTheDocument();
            expect(screen.getByText('0.20')).toBeInTheDocument();
            expect(screen.getByText('0.10')).toBeInTheDocument();
        });

        it('displays default factor values when only some factors are overridden', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.40,
                // Other factors will use defaults: 0.30, 0.25, 0.15
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Custom IOI value
            expect(screen.getByText('0.40')).toBeInTheDocument();
            // Default values for others
            expect(screen.getByText('0.30')).toBeInTheDocument();
            expect(screen.getByText('0.25')).toBeInTheDocument();
            expect(screen.getByText('0.15')).toBeInTheDocument();
        });

        it('does not display factor weights section when no factor weights are set', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: { low: 0.5, mid: 1.0, high: 1.5 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Should show custom scoring applied
            expect(screen.getByText(/custom scoring applied/i)).toBeInTheDocument();
            // Should show Bias section
            expect(screen.getByText('Bias:')).toBeInTheDocument();
            // But should NOT show Factors section
            expect(screen.queryByText('Factors:')).not.toBeInTheDocument();
        });
    });

    describe('Combined Display', () => {
        it('displays both band bias and factor weights when both are provided', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.35,
                syncopationWeight: 0.35,
                phraseSignificanceWeight: 0.20,
                densityWeight: 0.10,
                bandBiasWeights: { low: 0.3, mid: 1.0, high: 1.5 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Both sections should be present
            expect(screen.getByText(/custom scoring applied/i)).toBeInTheDocument();
            expect(screen.getByText('Bias:')).toBeInTheDocument();
            expect(screen.getByText('Factors:')).toBeInTheDocument();
        });

        it('displays complete scoring config with all values', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                ioiVarianceWeight: 0.40,
                syncopationWeight: 0.25,
                phraseSignificanceWeight: 0.20,
                densityWeight: 0.15,
                bandBiasWeights: { low: 0.2, mid: 1.5, high: 2.0 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Band bias values
            expect(screen.getByText(/Low 0\.2x/i)).toBeInTheDocument();
            expect(screen.getByText(/Mid 1\.5x/i)).toBeInTheDocument();
            expect(screen.getByText(/High 2\.0x/i)).toBeInTheDocument();

            // Factor values
            expect(screen.getByText('0.40')).toBeInTheDocument();
            expect(screen.getByText('0.25')).toBeInTheDocument();
            expect(screen.getByText('0.20')).toBeInTheDocument();
            expect(screen.getByText('0.15')).toBeInTheDocument();
        });
    });

    describe('Info Icon', () => {
        it('displays the Info icon when scoringConfig is provided', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: { low: 1.0, mid: 1.0, high: 1.0 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // The scoring config info container should exist
            const configInfo = screen.getByText(/custom scoring applied/i).closest('div');
            expect(configInfo).toHaveClass('composite-scoring-config-info');
        });
    });

    describe('Edge Cases', () => {
        it('handles empty scoringConfig object', () => {
            // An empty scoringConfig object is still truthy, so it should show the message
            // But since no factors or bias are set, it will only show "Custom scoring applied"
            const scoringConfig: Partial<StreamScorerConfig> = {};

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Empty object is still truthy, but shows only the base message
            expect(screen.getByText(/custom scoring applied/i)).toBeInTheDocument();
        });

        it('handles partial factor weights', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                syncopationWeight: 0.45,
                // Only syncopation is set, others will use defaults
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            // Factors section should appear because at least one factor is set
            expect(screen.getByText('Factors:')).toBeInTheDocument();
        });

        it('handles zero band bias values', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: { low: 0, mid: 1.0, high: 1.0 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            expect(screen.getByText(/Low 0\.0x/i)).toBeInTheDocument();
        });

        it('handles maximum band bias values', () => {
            const scoringConfig: Partial<StreamScorerConfig> = {
                bandBiasWeights: { low: 2.0, mid: 2.0, high: 2.0 },
            };

            render(
                <CompositeStreamPanel
                    rhythm={mockRhythm}
                    duration={60}
                    scoringConfig={scoringConfig}
                />
            );

            expect(screen.getByText(/Low 2\.0x/i)).toBeInTheDocument();
            expect(screen.getByText(/Mid 2\.0x/i)).toBeInTheDocument();
            expect(screen.getByText(/High 2\.0x/i)).toBeInTheDocument();
        });
    });
});
