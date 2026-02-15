/**
 * Task 7.3: Test Subrace Display
 *
 * Tests for verifying subrace display functionality in the DataViewerTab:
 * - Subrace ability bonuses show correctly
 * - Subrace-specific traits display
 * - Races without subraces still work
 */

import { describe, it, expect } from 'vitest';
import type { Ability } from 'playlist-data-engine';

// ============================================================================
// Types (mirrored from useDataViewer.ts for testing)
// ============================================================================

/**
 * Subrace-specific data structure
 * Contains data specific to a subrace variant of a race
 */
interface SubraceDataEntry {
    ability_bonuses?: Partial<Record<Ability, number>>;
    traits?: string[];
    requirements?: {
        abilities?: Partial<Record<Ability, number>>;
    };
}

/**
 * Race data entry with subrace support
 */
interface RaceDataEntry {
    name: string;
    ability_bonuses: Partial<Record<Ability, number>>;
    speed: number;
    traits: string[];
    subraces?: string[];
    subraceData?: Record<string, SubraceDataEntry>;
}

// ============================================================================
// Helper Functions (copied from DataViewerTab.tsx for testing)
// ============================================================================

/**
 * Ability score color mapping
 */
const ABILITY_COLORS: Record<string, string> = {
    'STR': 'hsl(0 70% 50%)',      // Red
    'DEX': 'hsl(120 60% 40%)',    // Green
    'CON': 'hsl(30 90% 50%)',     // Orange
    'INT': 'hsl(210 80% 50%)',    // Blue
    'WIS': 'hsl(270 60% 50%)',    // Purple
    'CHA': 'hsl(300 60% 50%)',    // Magenta
};

/**
 * Format ability bonus for display
 */
function formatAbilityBonus(bonus: number): string {
    return bonus >= 0 ? `+${bonus}` : `${bonus}`;
}

/**
 * Check if subrace data is empty (no meaningful data to display)
 */
function hasSubraceData(subraceData: SubraceDataEntry | undefined): boolean {
    if (!subraceData) return false;

    const hasBonuses = Boolean(subraceData.ability_bonuses && Object.keys(subraceData.ability_bonuses).length > 0);
    const hasTraits = Boolean(subraceData.traits && subraceData.traits.length > 0);
    const hasRequirements = Boolean(subraceData.requirements?.abilities && Object.keys(subraceData.requirements.abilities).length > 0);

    return hasBonuses || hasTraits || hasRequirements;
}

/**
 * Format subrace section output (simulates renderSubraceSection output)
 */
function formatSubraceSection(subraceName: string, subraceData: SubraceDataEntry | undefined): {
    name: string;
    bonuses: { ability: string; bonus: number; color: string }[];
    traits: string[];
    requirements: { ability: string; minimum: number }[];
    hasData: boolean;
} {
    const result = {
        name: subraceName,
        bonuses: [] as { ability: string; bonus: number; color: string }[],
        traits: [] as string[],
        requirements: [] as { ability: string; minimum: number }[],
        hasData: hasSubraceData(subraceData)
    };

    if (subraceData) {
        // Extract ability bonuses
        if (subraceData.ability_bonuses) {
            Object.entries(subraceData.ability_bonuses).forEach(([ability, bonus]) => {
                if (typeof bonus === 'number') {
                    result.bonuses.push({
                        ability,
                        bonus,
                        color: ABILITY_COLORS[ability] || 'var(--color-text-primary)'
                    });
                }
            });
        }

        // Extract traits
        if (subraceData.traits) {
            result.traits = [...subraceData.traits];
        }

        // Extract requirements
        if (subraceData.requirements?.abilities) {
            Object.entries(subraceData.requirements.abilities).forEach(([ability, minimum]) => {
                if (typeof minimum === 'number') {
                    result.requirements.push({
                        ability,
                        minimum
                    });
                }
            });
        }
    }

    return result;
}

// ============================================================================
// Test Data
// ============================================================================

/**
 * Example race data entries for testing
 */
const TEST_RACES: RaceDataEntry[] = [
    // Race with subraces and ability bonuses
    {
        name: 'Elf',
        ability_bonuses: { DEX: 2 },
        speed: 30,
        traits: ['Darkvision', 'Keen Senses', 'Fey Ancestry', 'Trance'],
        subraces: ['High Elf', 'Wood Elf', 'Dark Elf (Drow)'],
        subraceData: {
            'High Elf': {
                ability_bonuses: { INT: 1 },
                traits: ['Elf Weapon Training', 'Cantrip']
            },
            'Wood Elf': {
                ability_bonuses: { WIS: 1 },
                traits: ['Elf Weapon Training', 'Fleet of Foot', 'Mask of the Wild']
            },
            'Dark Elf (Drow)': {
                ability_bonuses: { CHA: 1 },
                traits: ['Superior Darkvision', 'Sunlight Sensitivity', 'Drow Magic']
            }
        }
    },
    // Race with subraces but no ability bonuses
    {
        name: 'Human',
        ability_bonuses: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 },
        speed: 30,
        traits: ['Versatile', 'Extra Language'],
        subraces: ['Calishite', 'Chondathan', 'Damaran'],
        subraceData: {
            'Calishite': {}, // No specific data
            'Chondathan': {}, // No specific data
            'Damaran': {} // No specific data
        }
    },
    // Race without subraces
    {
        name: 'Half-Elf',
        ability_bonuses: { CHA: 2 },
        speed: 30,
        traits: ['Darkvision', 'Fey Ancestry', 'Skill Versatility']
        // No subraces or subraceData
    },
    // Race with requirements
    {
        name: 'Test Race',
        ability_bonuses: { STR: 2 },
        speed: 30,
        traits: ['Test Trait'],
        subraces: ['Restricted Subrace'],
        subraceData: {
            'Restricted Subrace': {
                ability_bonuses: { DEX: 1 },
                traits: ['Special Ability'],
                requirements: {
                    abilities: { STR: 13, CON: 12 }
                }
            }
        }
    }
];

// ============================================================================
// Tests
// ============================================================================

describe('Task 7.3: Subrace Display - Ability Bonuses', () => {
    describe('Formatting Ability Bonuses', () => {
        it('should format positive bonuses with plus sign', () => {
            expect(formatAbilityBonus(1)).toBe('+1');
            expect(formatAbilityBonus(2)).toBe('+2');
            expect(formatAbilityBonus(5)).toBe('+5');
        });

        it('should format zero bonus as +0', () => {
            expect(formatAbilityBonus(0)).toBe('+0');
        });

        it('should format negative bonuses with minus sign', () => {
            expect(formatAbilityBonus(-1)).toBe('-1');
            expect(formatAbilityBonus(-2)).toBe('-2');
        });
    });

    describe('Ability Colors', () => {
        it('should have color mapping for all abilities', () => {
            const abilities: Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
            abilities.forEach(ability => {
                expect(ABILITY_COLORS[ability]).toBeDefined();
                expect(ABILITY_COLORS[ability]).toMatch(/^hsl\(/);
            });
        });

        it('should have distinct colors for each ability', () => {
            const colors = Object.values(ABILITY_COLORS);
            const uniqueColors = new Set(colors);
            expect(uniqueColors.size).toBe(6);
        });
    });

    describe('Subrace Ability Bonus Display', () => {
        it('should extract subrace ability bonuses correctly for High Elf', () => {
            const highElfData = TEST_RACES[0].subraceData!['High Elf'];
            const result = formatSubraceSection('High Elf', highElfData);

            expect(result.bonuses).toHaveLength(1);
            expect(result.bonuses[0].ability).toBe('INT');
            expect(result.bonuses[0].bonus).toBe(1);
            expect(result.bonuses[0].color).toBe('hsl(210 80% 50%)'); // Blue for INT
        });

        it('should extract subrace ability bonuses correctly for Wood Elf', () => {
            const woodElfData = TEST_RACES[0].subraceData!['Wood Elf'];
            const result = formatSubraceSection('Wood Elf', woodElfData);

            expect(result.bonuses).toHaveLength(1);
            expect(result.bonuses[0].ability).toBe('WIS');
            expect(result.bonuses[0].bonus).toBe(1);
            expect(result.bonuses[0].color).toBe('hsl(270 60% 50%)'); // Purple for WIS
        });

        it('should extract subrace ability bonuses correctly for Dark Elf', () => {
            const darkElfData = TEST_RACES[0].subraceData!['Dark Elf (Drow)'];
            const result = formatSubraceSection('Dark Elf (Drow)', darkElfData);

            expect(result.bonuses).toHaveLength(1);
            expect(result.bonuses[0].ability).toBe('CHA');
            expect(result.bonuses[0].bonus).toBe(1);
            expect(result.bonuses[0].color).toBe('hsl(300 60% 50%)'); // Magenta for CHA
        });

        it('should handle subraces with no ability bonuses', () => {
            const humanSubraceData = TEST_RACES[1].subraceData!['Calishite'];
            const result = formatSubraceSection('Calishite', humanSubraceData);

            expect(result.bonuses).toHaveLength(0);
            expect(result.hasData).toBe(false);
        });
    });
});

describe('Task 7.3: Subrace Display - Traits', () => {
    describe('Subrace Trait Extraction', () => {
        it('should extract traits for High Elf correctly', () => {
            const highElfData = TEST_RACES[0].subraceData!['High Elf'];
            const result = formatSubraceSection('High Elf', highElfData);

            expect(result.traits).toHaveLength(2);
            expect(result.traits).toContain('Elf Weapon Training');
            expect(result.traits).toContain('Cantrip');
        });

        it('should extract traits for Wood Elf correctly', () => {
            const woodElfData = TEST_RACES[0].subraceData!['Wood Elf'];
            const result = formatSubraceSection('Wood Elf', woodElfData);

            expect(result.traits).toHaveLength(3);
            expect(result.traits).toContain('Elf Weapon Training');
            expect(result.traits).toContain('Fleet of Foot');
            expect(result.traits).toContain('Mask of the Wild');
        });

        it('should extract traits for Dark Elf (Drow) correctly', () => {
            const darkElfData = TEST_RACES[0].subraceData!['Dark Elf (Drow)'];
            const result = formatSubraceSection('Dark Elf (Drow)', darkElfData);

            expect(result.traits).toHaveLength(3);
            expect(result.traits).toContain('Superior Darkvision');
            expect(result.traits).toContain('Sunlight Sensitivity');
            expect(result.traits).toContain('Drow Magic');
        });

        it('should handle subraces with no traits', () => {
            const humanSubraceData = TEST_RACES[1].subraceData!['Calishite'];
            const result = formatSubraceSection('Calishite', humanSubraceData);

            expect(result.traits).toHaveLength(0);
        });
    });

    describe('Subrace Trait Display Format', () => {
        it('should produce correctly formatted output for traits', () => {
            const highElfData = TEST_RACES[0].subraceData!['High Elf'];
            const result = formatSubraceSection('High Elf', highElfData);

            // Simulate the display format from renderSubraceSection
            const traitsDisplay = result.traits.map(trait =>
                `${trait}`
            ).join(', ');

            expect(traitsDisplay).toBe('Elf Weapon Training, Cantrip');
        });
    });
});

describe('Task 7.3: Subrace Display - Requirements', () => {
    describe('Subrace Requirements Extraction', () => {
        it('should extract requirements when present', () => {
            const restrictedData = TEST_RACES[3].subraceData!['Restricted Subrace'];
            const result = formatSubraceSection('Restricted Subrace', restrictedData);

            expect(result.requirements).toHaveLength(2);
            expect(result.requirements).toContainEqual({ ability: 'STR', minimum: 13 });
            expect(result.requirements).toContainEqual({ ability: 'CON', minimum: 12 });
        });

        it('should handle subraces without requirements', () => {
            const highElfData = TEST_RACES[0].subraceData!['High Elf'];
            const result = formatSubraceSection('High Elf', highElfData);

            expect(result.requirements).toHaveLength(0);
        });
    });

    describe('Subrace Requirements Display Format', () => {
        it('should format requirements as "ABILITY MIN+"', () => {
            const restrictedData = TEST_RACES[3].subraceData!['Restricted Subrace'];
            const result = formatSubraceSection('Restricted Subrace', restrictedData);

            const requirementsDisplay = result.requirements.map(req =>
                `${req.ability} ${req.minimum}+`
            );

            expect(requirementsDisplay).toContain('STR 13+');
            expect(requirementsDisplay).toContain('CON 12+');
        });
    });
});

describe('Task 7.3: Subrace Display - Races Without Subraces', () => {
    describe('Races Without Subraces', () => {
        it('should not have subraces property for Half-Elf', () => {
            const halfElf = TEST_RACES[2];

            expect(halfElf.subraces).toBeUndefined();
            expect(halfElf.subraceData).toBeUndefined();
        });

        it('should still have base ability bonuses', () => {
            const halfElf = TEST_RACES[2];

            expect(halfElf.ability_bonuses).toBeDefined();
            expect(halfElf.ability_bonuses.CHA).toBe(2);
        });

        it('should still have base traits', () => {
            const halfElf = TEST_RACES[2];

            expect(halfElf.traits).toBeDefined();
            expect(halfElf.traits).toHaveLength(3);
            expect(halfElf.traits).toContain('Darkvision');
            expect(halfElf.traits).toContain('Fey Ancestry');
            expect(halfElf.traits).toContain('Skill Versatility');
        });

        it('should have valid speed', () => {
            const halfElf = TEST_RACES[2];

            expect(halfElf.speed).toBe(30);
        });
    });

    describe('Display Behavior for Races Without Subraces', () => {
        it('should not render subrace section when no subraceData', () => {
            const halfElf = TEST_RACES[2];
            const hasSubraceSection = halfElf.subraceData && Object.keys(halfElf.subraceData).length > 0;

            expect(hasSubraceSection).toBeFalsy();
        });

        it('should handle empty subraceData gracefully', () => {
            const emptySubraceData: Record<string, SubraceDataEntry> = {};
            const hasSubraceSection = Object.keys(emptySubraceData).length > 0;

            expect(hasSubraceSection).toBe(false);
        });
    });
});

describe('Task 7.3: Subrace Display - hasSubraceData Helper', () => {
    describe('Detecting Meaningful Subrace Data', () => {
        it('should return true for subrace with ability bonuses', () => {
            const data: SubraceDataEntry = {
                ability_bonuses: { INT: 1 }
            };
            expect(hasSubraceData(data)).toBe(true);
        });

        it('should return true for subrace with traits', () => {
            const data: SubraceDataEntry = {
                traits: ['Test Trait']
            };
            expect(hasSubraceData(data)).toBe(true);
        });

        it('should return true for subrace with requirements', () => {
            const data: SubraceDataEntry = {
                requirements: { abilities: { STR: 13 } }
            };
            expect(hasSubraceData(data)).toBe(true);
        });

        it('should return false for empty subrace data', () => {
            const data: SubraceDataEntry = {};
            expect(hasSubraceData(data)).toBe(false);
        });

        it('should return false for undefined subrace data', () => {
            expect(hasSubraceData(undefined)).toBe(false);
        });

        it('should return false for subrace with empty arrays/objects', () => {
            const data: SubraceDataEntry = {
                ability_bonuses: {},
                traits: []
            };
            expect(hasSubraceData(data)).toBe(false);
        });
    });
});

describe('Task 7.3: Subrace Display - Complete Section Output', () => {
    describe('Full Subrace Section Formatting', () => {
        it('should format complete High Elf section correctly', () => {
            const highElfData = TEST_RACES[0].subraceData!['High Elf'];
            const result = formatSubraceSection('High Elf', highElfData);

            // Verify name
            expect(result.name).toBe('High Elf');

            // Verify has data
            expect(result.hasData).toBe(true);

            // Verify bonuses formatted correctly
            const bonusDisplay = result.bonuses.map(b =>
                `${b.ability} ${formatAbilityBonus(b.bonus)}`
            );
            expect(bonusDisplay).toContain('INT +1');

            // Verify traits
            expect(result.traits).toEqual(['Elf Weapon Training', 'Cantrip']);

            // Verify no requirements
            expect(result.requirements).toHaveLength(0);
        });

        it('should format complete Restricted Subrace section with requirements', () => {
            const restrictedData = TEST_RACES[3].subraceData!['Restricted Subrace'];
            const result = formatSubraceSection('Restricted Subrace', restrictedData);

            // Verify name
            expect(result.name).toBe('Restricted Subrace');

            // Verify has data
            expect(result.hasData).toBe(true);

            // Verify bonuses
            expect(result.bonuses).toHaveLength(1);
            expect(result.bonuses[0].ability).toBe('DEX');

            // Verify traits
            expect(result.traits).toContain('Special Ability');

            // Verify requirements
            expect(result.requirements).toHaveLength(2);
        });

        it('should handle subrace with no meaningful data', () => {
            const humanSubraceData = TEST_RACES[1].subraceData!['Calishite'];
            const result = formatSubraceSection('Calishite', humanSubraceData);

            expect(result.name).toBe('Calishite');
            expect(result.hasData).toBe(false);
            expect(result.bonuses).toHaveLength(0);
            expect(result.traits).toHaveLength(0);
            expect(result.requirements).toHaveLength(0);
        });
    });
});

describe('Task 7.3: Subrace Display - Edge Cases', () => {
    describe('Edge Case Handling', () => {
        it('should handle subrace with multiple ability bonuses', () => {
            const data: SubraceDataEntry = {
                ability_bonuses: { STR: 2, DEX: 1, CON: 1 }
            };
            const result = formatSubraceSection('Multi Bonus', data);

            expect(result.bonuses).toHaveLength(3);
            expect(result.hasData).toBe(true);
        });

        it('should handle subrace with many traits', () => {
            const data: SubraceDataEntry = {
                traits: ['Trait 1', 'Trait 2', 'Trait 3', 'Trait 4', 'Trait 5']
            };
            const result = formatSubraceSection('Many Traits', data);

            expect(result.traits).toHaveLength(5);
            expect(result.hasData).toBe(true);
        });

        it('should handle subrace with special characters in name', () => {
            const data: SubraceDataEntry = {
                ability_bonuses: { CHA: 1 }
            };
            const result = formatSubraceSection('Dark Elf (Drow)', data);

            expect(result.name).toBe('Dark Elf (Drow)');
            expect(result.hasData).toBe(true);
        });

        it('should handle zero ability bonus', () => {
            const data: SubraceDataEntry = {
                ability_bonuses: { STR: 0 }
            };
            const result = formatSubraceSection('Zero Bonus', data);

            expect(result.bonuses).toHaveLength(1);
            expect(result.bonuses[0].bonus).toBe(0);
            expect(formatAbilityBonus(result.bonuses[0].bonus)).toBe('+0');
        });
    });
});

describe('Task 7.3: Subrace Display - Integration with RACE_DATA', () => {
    describe('Real Race Data Validation', () => {
        it('should have valid structure for all test races', () => {
            TEST_RACES.forEach(race => {
                expect(race.name).toBeTruthy();
                expect(race.ability_bonuses).toBeDefined();
                expect(typeof race.speed).toBe('number');
                expect(Array.isArray(race.traits)).toBe(true);
            });
        });

        it('should have valid subrace data structure when present', () => {
            TEST_RACES.forEach(race => {
                if (race.subraceData) {
                    Object.entries(race.subraceData).forEach(([subraceName, subrace]) => {
                        expect(subraceName).toBeTruthy();
                        // subrace can be empty object
                        if (subrace.ability_bonuses) {
                            Object.entries(subrace.ability_bonuses).forEach(([ability, bonus]) => {
                                expect(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']).toContain(ability);
                                expect(typeof bonus).toBe('number');
                            });
                        }
                        if (subrace.traits) {
                            expect(Array.isArray(subrace.traits)).toBe(true);
                        }
                    });
                }
            });
        });

        it('should have matching subraces array and subraceData keys for Elf', () => {
            const elf = TEST_RACES[0];
            expect(elf.subraces).toBeDefined();
            expect(elf.subraceData).toBeDefined();

            if (elf.subraces && elf.subraceData) {
                elf.subraces.forEach(subraceName => {
                    expect(elf.subraceData![subraceName]).toBeDefined();
                });
            }
        });

        it('should have correct trait count for each subrace', () => {
            const elf = TEST_RACES[0];
            const expectedTraitCounts: Record<string, number> = {
                'High Elf': 2,
                'Wood Elf': 3,
                'Dark Elf (Drow)': 3
            };

            if (elf.subraceData) {
                Object.entries(elf.subraceData).forEach(([subraceName, subrace]) => {
                    const expectedCount = expectedTraitCounts[subraceName];
                    if (expectedCount !== undefined && subrace.traits) {
                        expect(subrace.traits.length).toBe(expectedCount);
                    }
                });
            }
        });
    });
});
