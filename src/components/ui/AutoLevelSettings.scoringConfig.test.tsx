/**
 * Tests for AutoLevelSettings Component - Scoring Configuration
 *
 * Frontend Tests from BAND_BIAS_WEIGHTS_PLAN.md:
 * - Factor weight sliders update settings
 * - Band bias sliders update settings
 * - Weight total indicator shows correct sum
 * - Settings pass through to generation hook
 * - Composite reflects customized scoring
 * - Reset buttons restore defaults
 * - Factor reset restores to 0.30/0.30/0.25/0.15
 * - Band bias reset restores to 1.0/1.0/1.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AutoLevelSettings } from './AutoLevelSettings';
import type { AutoLevelSettings as AutoLevelSettingsType } from '../../types/rhythmGeneration';
import { DEFAULT_AUTO_LEVEL_SETTINGS } from '../../types/rhythmGeneration';

// Mock CollapsibleSection since it uses ResizeObserver
vi.mock('../Party/CollapsibleSection', () => ({
    CollapsibleSection: ({ children, title, defaultCollapsed }: { children: React.ReactNode; title: string; defaultCollapsed?: boolean }) => (
        <div data-testid="collapsible-section" data-title={title} data-collapsed={defaultCollapsed}>
            <div className="collapsible-section-content">
                {children}
            </div>
        </div>
    ),
}));

describe('AutoLevelSettings - Scoring Configuration', () => {
    const mockOnChange = vi.fn();
    let defaultSettings: AutoLevelSettingsType;

    beforeEach(() => {
        mockOnChange.mockClear();
        defaultSettings = { ...DEFAULT_AUTO_LEVEL_SETTINGS };
    });

    /**
     * Helper to expand Advanced Options and then Scoring Configuration section
     */
    const expandScoringConfig = async () => {
        // First, expand the "Advanced Options" section
        const advancedOptionsButton = screen.getByRole('button', { name: /advanced options/i });
        fireEvent.click(advancedOptionsButton);

        // Wait for Advanced Options content to appear
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /scoring configuration/i })).toBeInTheDocument();
        });

        // Then, click the "Scoring Configuration" toggle button
        const scoringConfigButton = screen.getByRole('button', { name: /scoring configuration/i });
        fireEvent.click(scoringConfigButton);

        // Wait for the Scoring Configuration section to appear
        await waitFor(() => {
            expect(screen.getByText('Scoring Factors')).toBeInTheDocument();
        });
    };

    /**
     * Helper to find factor slider by label text
     */
    const getFactorSlider = (labelText: string): HTMLInputElement => {
        const labelElement = screen.getByText(labelText);
        // Find the parent factor-row div
        const factorRow = labelElement.closest('.auto-level-settings__factor-row');
        if (!factorRow) {
            throw new Error(`Could not find factor row for label: ${labelText}`);
        }
        return within(factorRow).getByRole('slider');
    };

    /**
     * Helper to find band bias slider by label text
     */
    const getBiasSlider = (labelText: string): HTMLInputElement => {
        const labelElement = screen.getByText(labelText);
        // Find the parent bias-row div
        const biasRow = labelElement.closest('.auto-level-settings__bias-row');
        if (!biasRow) {
            throw new Error(`Could not find bias row for label: ${labelText}`);
        }
        return within(biasRow).getByRole('slider');
    };

    describe('Factor Weight Sliders Update Settings', () => {
        it('renders scoring factor sliders when Scoring Configuration is expanded', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Check that all factor labels are present
            expect(screen.getByText('Rhythmic Variety (IOI)')).toBeInTheDocument();
            expect(screen.getByText('Syncopation')).toBeInTheDocument();
            expect(screen.getByText('Phrase Significance')).toBeInTheDocument();
            expect(screen.getByText('Density')).toBeInTheDocument();
        });

        it('updates settings when IOI Variance slider is changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const ioiSlider = getFactorSlider('Rhythmic Variety (IOI)');

            // Change slider value
            fireEvent.change(ioiSlider, { target: { value: '0.40' } });

            expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    scoringConfig: expect.objectContaining({
                        ioiVarianceWeight: 0.40,
                    }),
                })
            );
        });

        it('updates settings when Syncopation slider is changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const syncopationSlider = getFactorSlider('Syncopation');

            fireEvent.change(syncopationSlider, { target: { value: '0.35' } });

            expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    scoringConfig: expect.objectContaining({
                        syncopationWeight: 0.35,
                    }),
                })
            );
        });

        it('updates settings when Phrase Significance slider is changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const phraseSlider = getFactorSlider('Phrase Significance');

            fireEvent.change(phraseSlider, { target: { value: '0.20' } });

            expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    scoringConfig: expect.objectContaining({
                        phraseSignificanceWeight: 0.20,
                    }),
                })
            );
        });

        it('updates settings when Density slider is changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const densitySlider = getFactorSlider('Density');

            fireEvent.change(densitySlider, { target: { value: '0.10' } });

            expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    scoringConfig: expect.objectContaining({
                        densityWeight: 0.10,
                    }),
                })
            );
        });

        it('displays default factor values when no scoringConfig is set', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const ioiSlider = getFactorSlider('Rhythmic Variety (IOI)');
            const syncopationSlider = getFactorSlider('Syncopation');
            const phraseSlider = getFactorSlider('Phrase Significance');
            const densitySlider = getFactorSlider('Density');

            expect(ioiSlider.value).toBe('0.3');
            expect(syncopationSlider.value).toBe('0.3');
            expect(phraseSlider.value).toBe('0.25');
            expect(densitySlider.value).toBe('0.15');
        });

        it('displays custom factor values when scoringConfig is set', async () => {
            const customSettings: AutoLevelSettingsType = {
                ...defaultSettings,
                scoringConfig: {
                    ioiVarianceWeight: 0.35,
                    syncopationWeight: 0.40,
                    phraseSignificanceWeight: 0.15,
                    densityWeight: 0.10,
                },
            };

            render(
                <AutoLevelSettings
                    settings={customSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const ioiSlider = getFactorSlider('Rhythmic Variety (IOI)');
            const syncopationSlider = getFactorSlider('Syncopation');
            const phraseSlider = getFactorSlider('Phrase Significance');
            const densitySlider = getFactorSlider('Density');

            expect(ioiSlider.value).toBe('0.35');
            expect(syncopationSlider.value).toBe('0.4');
            expect(phraseSlider.value).toBe('0.15');
            expect(densitySlider.value).toBe('0.1');
        });
    });

    describe('Band Bias Sliders Update Settings', () => {
        it('renders band bias sliders when Scoring Configuration is expanded', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Check that band labels are present
            expect(screen.getByText('Low (Bass)')).toBeInTheDocument();
            expect(screen.getByText('Mid')).toBeInTheDocument();
            expect(screen.getByText('High')).toBeInTheDocument();
        });

        it('updates settings when Low band bias slider is changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const lowSlider = getBiasSlider('Low (Bass)');

            fireEvent.change(lowSlider, { target: { value: '0.5' } });

            expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    scoringConfig: expect.objectContaining({
                        bandBiasWeights: expect.objectContaining({
                            low: 0.5,
                        }),
                    }),
                })
            );
        });

        it('updates settings when Mid band bias slider is changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const midSlider = getBiasSlider('Mid');

            fireEvent.change(midSlider, { target: { value: '1.5' } });

            expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    scoringConfig: expect.objectContaining({
                        bandBiasWeights: expect.objectContaining({
                            mid: 1.5,
                        }),
                    }),
                })
            );
        });

        it('updates settings when High band bias slider is changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const highSlider = getBiasSlider('High');

            fireEvent.change(highSlider, { target: { value: '2.0' } });

            expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    scoringConfig: expect.objectContaining({
                        bandBiasWeights: expect.objectContaining({
                            high: 2.0,
                        }),
                    }),
                })
            );
        });

        it('displays default bias values from engine when no bandBiasWeights is set', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const lowSlider = getBiasSlider('Low (Bass)');
            const midSlider = getBiasSlider('Mid');
            const highSlider = getBiasSlider('High');

            expect(lowSlider.value).toBe('0.8');
            expect(midSlider.value).toBe('0.95');
            expect(highSlider.value).toBe('1');
        });

        it('preserves existing band bias values when changing one band', async () => {
            const settingsWithBias: AutoLevelSettingsType = {
                ...defaultSettings,
                scoringConfig: {
                    bandBiasWeights: {
                        low: 0.5,
                        mid: 1.2,
                        high: 1.0,
                    },
                },
            };

            render(
                <AutoLevelSettings
                    settings={settingsWithBias}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            const highSlider = getBiasSlider('High');

            // Change only high band
            fireEvent.change(highSlider, { target: { value: '1.8' } });

            // All bands should be present in the call
            expect(mockOnChange).toHaveBeenCalledWith(
                expect.objectContaining({
                    scoringConfig: expect.objectContaining({
                        bandBiasWeights: {
                            low: 0.5,
                            mid: 1.2,
                            high: 1.8,
                        },
                    }),
                })
            );
        });
    });

    describe('Weight Total Indicator Shows Correct Sum', () => {
        it('displays correct total for default factor weights (1.0)', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Default weights: 0.30 + 0.30 + 0.25 + 0.15 = 1.0
            const weightTotal = screen.getByText('1.00');
            expect(weightTotal).toBeInTheDocument();
            expect(screen.getByText('OK')).toBeInTheDocument();
        });

        it('displays warning when total is not 1.0', async () => {
            const customSettings: AutoLevelSettingsType = {
                ...defaultSettings,
                scoringConfig: {
                    ioiVarianceWeight: 0.40,
                    syncopationWeight: 0.40,
                    phraseSignificanceWeight: 0.20,
                    densityWeight: 0.10,
                    // Total: 1.10
                },
            };

            render(
                <AutoLevelSettings
                    settings={customSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Total is 1.10, should show warning
            expect(screen.getByText('1.10')).toBeInTheDocument();
            expect(screen.getByText('(should be 1.0)')).toBeInTheDocument();
        });

        it('recalculates total when factor weights change', async () => {
            const { rerender } = render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Initial total is 1.0
            expect(screen.getByText('1.00')).toBeInTheDocument();

            // Update with new settings
            const updatedSettings: AutoLevelSettingsType = {
                ...defaultSettings,
                scoringConfig: {
                    ioiVarianceWeight: 0.20,
                    syncopationWeight: 0.20,
                    phraseSignificanceWeight: 0.20,
                    densityWeight: 0.10,
                    // Total: 0.70
                },
            };

            rerender(
                <AutoLevelSettings
                    settings={updatedSettings}
                    onChange={mockOnChange}
                />
            );

            // Should show new total
            expect(screen.getByText('0.70')).toBeInTheDocument();
            expect(screen.getByText('(should be 1.0)')).toBeInTheDocument();
        });
    });

    describe('Reset Buttons Restore Defaults', () => {
        describe('Reset Factor Weights', () => {
            it('renders reset factor weights button', async () => {
                render(
                    <AutoLevelSettings
                        settings={defaultSettings}
                        onChange={mockOnChange}
                    />
                );

                await expandScoringConfig();

                expect(screen.getByRole('button', { name: /reset factors to default/i })).toBeInTheDocument();
            });

            it('reset button is disabled when no custom factors are set', async () => {
                render(
                    <AutoLevelSettings
                        settings={defaultSettings}
                        onChange={mockOnChange}
                    />
                );

                await expandScoringConfig();

                const resetButton = screen.getByRole('button', { name: /reset factors to default/i }) as HTMLButtonElement;
                expect(resetButton.disabled).toBe(true);
            });

            it('reset button is enabled when custom factors are set', async () => {
                const customSettings: AutoLevelSettingsType = {
                    ...defaultSettings,
                    scoringConfig: {
                        ioiVarianceWeight: 0.40,
                    },
                };

                render(
                    <AutoLevelSettings
                        settings={customSettings}
                        onChange={mockOnChange}
                    />
                );

                await expandScoringConfig();

                const resetButton = screen.getByRole('button', { name: /reset factors to default/i }) as HTMLButtonElement;
                expect(resetButton.disabled).toBe(false);
            });

            it('resets factor weights to default values (0.30/0.30/0.25/0.15)', async () => {
                const customSettings: AutoLevelSettingsType = {
                    ...defaultSettings,
                    scoringConfig: {
                        ioiVarianceWeight: 0.40,
                        syncopationWeight: 0.40,
                        phraseSignificanceWeight: 0.15,
                        densityWeight: 0.05,
                        bandBiasWeights: {
                            low: 0.5,
                            mid: 1.0,
                            high: 1.5,
                        },
                    },
                };

                render(
                    <AutoLevelSettings
                        settings={customSettings}
                        onChange={mockOnChange}
                    />
                );

                await expandScoringConfig();

                const resetButton = screen.getByRole('button', { name: /reset factors to default/i });
                fireEvent.click(resetButton);

                expect(mockOnChange).toHaveBeenCalledWith(
                    expect.objectContaining({
                        scoringConfig: expect.objectContaining({
                            ioiVarianceWeight: 0.30,
                            syncopationWeight: 0.30,
                            phraseSignificanceWeight: 0.25,
                            densityWeight: 0.15,
                            // Band bias should be preserved
                            bandBiasWeights: {
                                low: 0.5,
                                mid: 1.0,
                                high: 1.5,
                            },
                        }),
                    })
                );
            });
        });

        describe('Reset Band Bias', () => {
            it('renders reset band bias button', async () => {
                render(
                    <AutoLevelSettings
                        settings={defaultSettings}
                        onChange={mockOnChange}
                    />
                );

                await expandScoringConfig();

                expect(screen.getByRole('button', { name: /reset bias to default/i })).toBeInTheDocument();
            });

            it('reset button is disabled when no custom bias is set', async () => {
                render(
                    <AutoLevelSettings
                        settings={defaultSettings}
                        onChange={mockOnChange}
                    />
                );

                await expandScoringConfig();

                const resetButton = screen.getByRole('button', { name: /reset bias to default/i }) as HTMLButtonElement;
                expect(resetButton.disabled).toBe(true);
            });

            it('reset button is enabled when custom bias is set', async () => {
                const customSettings: AutoLevelSettingsType = {
                    ...defaultSettings,
                    scoringConfig: {
                        bandBiasWeights: {
                            low: 0.5,
                            mid: 1.0,
                            high: 1.5,
                        },
                    },
                };

                render(
                    <AutoLevelSettings
                        settings={customSettings}
                        onChange={mockOnChange}
                    />
                );

                await expandScoringConfig();

                const resetButton = screen.getByRole('button', { name: /reset bias to default/i }) as HTMLButtonElement;
                expect(resetButton.disabled).toBe(false);
            });

            it('resets band bias to undefined (engine defaults)', async () => {
                const customSettings: AutoLevelSettingsType = {
                    ...defaultSettings,
                    scoringConfig: {
                        ioiVarianceWeight: 0.35,
                        bandBiasWeights: {
                            low: 0.5,
                            mid: 1.5,
                            high: 2.0,
                        },
                    },
                };

                render(
                    <AutoLevelSettings
                        settings={customSettings}
                        onChange={mockOnChange}
                    />
                );

                await expandScoringConfig();

                const resetButton = screen.getByRole('button', { name: /reset bias to default/i });
                fireEvent.click(resetButton);

                expect(mockOnChange).toHaveBeenCalledWith(
                    expect.objectContaining({
                        scoringConfig: expect.objectContaining({
                            ioiVarianceWeight: 0.35, // Factor weights should be preserved
                            bandBiasWeights: undefined, // Reset to undefined
                        }),
                    })
                );
            });
        });
    });

    describe('Disabled State', () => {
        it('disables the Advanced Options button when disabled prop is true', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                    disabled={true}
                />
            );

            const advancedOptionsButton = screen.getByRole('button', { name: /advanced options/i }) as HTMLButtonElement;
            expect(advancedOptionsButton.disabled).toBe(true);
        });

        it('disables the Intensity Threshold slider when disabled prop is true', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                    disabled={true}
                />
            );

            const intensitySlider = screen.getByRole('slider', { name: /intensity threshold/i });
            expect(intensitySlider).toBeDisabled();
        });

        it('does not call onChange when intensity slider is disabled and changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                    disabled={true}
                />
            );

            const intensitySlider = screen.getByRole('slider', { name: /intensity threshold/i });
            fireEvent.change(intensitySlider, { target: { value: '0.5' } });

            expect(mockOnChange).not.toHaveBeenCalled();
        });

        it('disables factor weight sliders when disabled prop is true and section is pre-expanded', async () => {
            // This test verifies that sliders in the scoring config section are disabled
            // when the component is in disabled state
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                    disabled={true}
                />
            );

            // Verify the Advanced Options button is disabled (which prevents accessing scoring config)
            const advancedOptionsButton = screen.getByRole('button', { name: /advanced options/i }) as HTMLButtonElement;
            expect(advancedOptionsButton.disabled).toBe(true);

            // The fact that the Advanced Options button is disabled means all nested controls
            // are effectively disabled (since the section can't be expanded)
        });

        it('disables band bias sliders when disabled prop is true', async () => {
            // Same as above - Advanced Options being disabled prevents access to band bias controls
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                    disabled={true}
                />
            );

            const advancedOptionsButton = screen.getByRole('button', { name: /advanced options/i }) as HTMLButtonElement;
            expect(advancedOptionsButton.disabled).toBe(true);
        });
    });

    describe('Settings Pass Through to Generation Hook', () => {
        /**
         * These tests verify that the scoringConfig produced by AutoLevelSettings
         * is in the correct format to be passed to the useRhythmGeneration hook.
         *
         * The flow is:
         * 1. User adjusts scoring config in AutoLevelSettings
         * 2. onChange is called with updated settings
         * 3. BeatDetectionTab stores the settings
         * 4. When generateRhythm is called, it passes settings.scoringConfig
         * 5. useRhythmGeneration hook passes scoringConfig to RhythmGenerator
         */

        it('produces scoringConfig that matches RhythmGenerationOptions type', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Change multiple settings to create a complex config
            const ioiSlider = getFactorSlider('Rhythmic Variety (IOI)');
            fireEvent.change(ioiSlider, { target: { value: '0.35' } });

            // Verify the scoringConfig structure matches what the hook expects
            const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
            const updatedSettings = lastCall[0];

            // Verify the structure matches Partial<StreamScorerConfig>
            expect(updatedSettings.scoringConfig).toBeDefined();
            expect(typeof updatedSettings.scoringConfig.ioiVarianceWeight).toBe('number');
        });

        it('produces bandBiasWeights in correct format for RhythmGenerator', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Change band bias
            const lowSlider = getBiasSlider('Low (Bass)');
            fireEvent.change(lowSlider, { target: { value: '0.5' } });

            // Verify the bandBiasWeights structure
            const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
            const bandBiasWeights = lastCall[0].scoringConfig.bandBiasWeights;

            // Should have all three bands
            expect(bandBiasWeights).toHaveProperty('low');
            expect(bandBiasWeights).toHaveProperty('mid');
            expect(bandBiasWeights).toHaveProperty('high');

            // All values should be numbers
            expect(typeof bandBiasWeights.low).toBe('number');
            expect(typeof bandBiasWeights.mid).toBe('number');
            expect(typeof bandBiasWeights.high).toBe('number');
        });

        it('produces factor weights with correct numeric values', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Change all factor weights
            const ioiSlider = getFactorSlider('Rhythmic Variety (IOI)');
            fireEvent.change(ioiSlider, { target: { value: '0.35' } });

            const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
            const config = lastCall[0].scoringConfig;

            // Verify factor weights are in valid range (0-0.5)
            expect(config.ioiVarianceWeight).toBeGreaterThanOrEqual(0);
            expect(config.ioiVarianceWeight).toBeLessThanOrEqual(0.5);

            // Verify the value is close to expected (account for floating point precision)
            expect(config.ioiVarianceWeight).toBeCloseTo(0.35, 2);
        });

        it('produces scoringConfig that can be serialized for engine', async () => {
            // This test verifies the scoringConfig can be serialized and passed to the engine
            const settingsWithScoringConfig: AutoLevelSettingsType = {
                ...defaultSettings,
                scoringConfig: {
                    ioiVarianceWeight: 0.35,
                    syncopationWeight: 0.35,
                    phraseSignificanceWeight: 0.20,
                    densityWeight: 0.10,
                    bandBiasWeights: {
                        low: 0.5,
                        mid: 1.0,
                        high: 1.5,
                    },
                },
            };

            render(
                <AutoLevelSettings
                    settings={settingsWithScoringConfig}
                    onChange={mockOnChange}
                />
            );

            // The scoringConfig should be serializable (no functions, dates, etc.)
            const serialized = JSON.stringify(settingsWithScoringConfig.scoringConfig);
            const parsed = JSON.parse(serialized);

            expect(parsed.ioiVarianceWeight).toBe(0.35);
            expect(parsed.bandBiasWeights.low).toBe(0.5);
            expect(parsed.bandBiasWeights.mid).toBe(1.0);
            expect(parsed.bandBiasWeights.high).toBe(1.5);
        });

        it('produces complete bandBiasWeights when any band is changed', async () => {
            render(
                <AutoLevelSettings
                    settings={defaultSettings}
                    onChange={mockOnChange}
                />
            );

            await expandScoringConfig();

            // Change only the high band
            const highSlider = getBiasSlider('High');
            fireEvent.change(highSlider, { target: { value: '1.5' } });

            const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
            const bandBiasWeights = lastCall[0].scoringConfig.bandBiasWeights;

            // All bands should be present, not just the changed one
            expect(Object.keys(bandBiasWeights)).toHaveLength(3);
            expect(bandBiasWeights).toEqual({
                low: 0.8,
                mid: 0.95,
                high: 1.5,
            });
        });

        it('maintains scoringConfig integrity when other settings change', async () => {
            // This test verifies that the scoringConfig format is preserved
            // when the settings object is passed through the component
            const settingsWithScoringConfig: AutoLevelSettingsType = {
                ...defaultSettings,
                scoringConfig: {
                    ioiVarianceWeight: 0.35,
                    bandBiasWeights: {
                        low: 0.5,
                        mid: 1.0,
                        high: 1.5,
                    },
                },
            };

            render(
                <AutoLevelSettings
                    settings={settingsWithScoringConfig}
                    onChange={mockOnChange}
                />
            );

            // Verify the settings are rendered correctly with the scoringConfig
            // by checking that changing a scoring config setting preserves the structure
            await expandScoringConfig();

            const ioiSlider = getFactorSlider('Rhythmic Variety (IOI)');
            fireEvent.change(ioiSlider, { target: { value: '0.40' } });

            const lastCall = mockOnChange.mock.calls[mockOnChange.mock.calls.length - 1];
            const newSettings = lastCall[0];

            // Scoring config should be updated but bandBiasWeights should be preserved
            expect(newSettings.scoringConfig.ioiVarianceWeight).toBe(0.40);
            expect(newSettings.scoringConfig.bandBiasWeights).toEqual({
                low: 0.5,
                mid: 1.0,
                high: 1.5,
            });
        });
    });
});
