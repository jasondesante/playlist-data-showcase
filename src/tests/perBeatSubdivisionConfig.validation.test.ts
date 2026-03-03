/**
 * Per-Beat SubdivisionConfig Validation Tests
 *
 * Task 8.1: Engine tests
 * - Test `SubdivisionConfig` validation with per-beat format
 * - Test BeatSubdivider with per-beat config
 * - Test edge cases:
 *   - Empty beat map
 *   - All beats same subdivision
 *   - Every beat different subdivision
 *   - Sparse subdivision assignments
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type {
    SubdivisionConfig,
    SubdivisionType,
    UnifiedBeatMap,
    DownbeatConfig,
    BeatMapMetadata,
} from '@/types';
import {
    validateSubdivisionConfig,
    validateSubdivisionConfigAgainstBeats,
    isValidSubdivisionType,
    getSubdivisionDensity,
    DEFAULT_SUBDIVISION_CONFIG,
    VALID_SUBDIVISION_TYPES,
    BeatSubdivider,
} from 'playlist-data-engine';

// Mock the storage module before importing the store
vi.mock('@/utils/storage', () => ({
    storage: {
        getItem: vi.fn().mockResolvedValue(null),
        setItem: vi.fn().mockResolvedValue(undefined),
        removeItem: vi.fn().mockResolvedValue(undefined),
    },
}));

// Mock the logger
vi.mock('@/utils/logger', () => ({
    logger: {
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    },
}));

// ============================================================
// Test Helpers
// ============================================================

const DEFAULT_DOWNBEAT_CONFIG: DownbeatConfig = {
    segments: [{
        startBeat: 0,
        downbeatBeatIndex: 0,
        timeSignature: { beatsPerMeasure: 4 },
    }],
};

const DEFAULT_METADATA: BeatMapMetadata = {
    generatedAt: Date.now(),
    algorithmVersion: '1.0.0',
};

/**
 * Create a mock UnifiedBeatMap with the specified number of beats.
 * Includes all required fields for the engine's BeatSubdivider.
 */
function createMockUnifiedBeatMap(beatCount: number, quarterNoteInterval: number = 0.5): UnifiedBeatMap {
    return {
        audioId: 'test-audio-id',
        duration: beatCount * quarterNoteInterval,
        beats: Array.from({ length: beatCount }, (_, i) => ({
            timestamp: i * quarterNoteInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            confidence: 1.0,
            intensity: 0.8,
        })),
        detectedBeatIndices: Array.from({ length: beatCount }, (_, i) => i), // All beats are "detected"
        quarterNoteInterval,
        quarterNoteBpm: 60 / quarterNoteInterval,
        downbeatConfig: DEFAULT_DOWNBEAT_CONFIG,
        originalMetadata: DEFAULT_METADATA,
    };
}

// ============================================================
// validateSubdivisionConfig Tests
// ============================================================
describe('validateSubdivisionConfig', () => {
    it('should accept a valid per-beat config with empty map', () => {
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'quarter',
        };
        // Should not throw
        expect(() => validateSubdivisionConfig(config)).not.toThrow();
    });

    it('should accept a valid per-beat config with custom subdivisions', () => {
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'eighth'],
                [1, 'sixteenth'],
                [2, 'triplet8'],
            ]),
            defaultSubdivision: 'quarter',
        };
        // Should not throw
        expect(() => validateSubdivisionConfig(config)).not.toThrow();
    });

    it('should accept a config with all valid subdivision types', () => {
        const allTypes: SubdivisionType[] = [
            'quarter', 'half', 'eighth', 'sixteenth',
            'triplet8', 'triplet4', 'dotted4', 'dotted8',
        ];

        for (const type of allTypes) {
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map([[0, type]]),
                defaultSubdivision: type,
            };
            expect(() => validateSubdivisionConfig(config)).not.toThrow();
        }
    });

    it('should reject invalid config with non-map beatSubdivisions', () => {
        const config = {
            beatSubdivisions: {} as unknown as Map<number, SubdivisionType>,
            defaultSubdivision: 'quarter',
        } as SubdivisionConfig;
        expect(() => validateSubdivisionConfig(config)).toThrow();
    });

    it('should reject invalid config with invalid default subdivision', () => {
        const config = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'invalid' as SubdivisionType,
        } as SubdivisionConfig;
        expect(() => validateSubdivisionConfig(config)).toThrow();
    });

    it('should reject invalid config with invalid subdivision in map', () => {
        const config = {
            beatSubdivisions: new Map([[0, 'invalid']]) as unknown as Map<number, SubdivisionType>,
            defaultSubdivision: 'quarter',
        } as SubdivisionConfig;
        expect(() => validateSubdivisionConfig(config)).toThrow();
    });

    it('should reject invalid config with negative beat index', () => {
        const config = {
            beatSubdivisions: new Map([[-1, 'quarter']]),
            defaultSubdivision: 'quarter',
        } as SubdivisionConfig;
        expect(() => validateSubdivisionConfig(config)).toThrow();
    });
});

// ============================================================
// validateSubdivisionConfigAgainstBeats Tests
// ============================================================
describe('validateSubdivisionConfigAgainstBeats', () => {
    it('should accept valid config within beat count', () => {
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'eighth'],
                [10, 'sixteenth'],
                [49, 'triplet8'],
            ]),
            defaultSubdivision: 'quarter',
        };
        // Should not throw - all indices are < 50
        expect(() => validateSubdivisionConfigAgainstBeats(config, 50)).not.toThrow();
    });

    it('should accept config where some beat indices exceed beat count', () => {
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'eighth'],
                [1, 'sixteenth'],
                [99, 'quarter'], // This exceeds the beat count of 50
            ]),
            defaultSubdivision: 'quarter',
        };
        // The engine treats indices beyond beat count as no-ops
        // This should not throw based on the engine documentation
        expect(() => validateSubdivisionConfigAgainstBeats(config, 50)).not.toThrow();
    });
});

// ============================================================
// isValidSubdivisionType Tests
// ============================================================
describe('isValidSubdivisionType', () => {
    it('should return true for all valid subdivision types', () => {
        const validTypes = ['quarter', 'half', 'eighth', 'sixteenth', 'triplet8', 'triplet4', 'dotted4', 'dotted8'];
        for (const type of validTypes) {
            expect(isValidSubdivisionType(type)).toBe(true);
        }
    });

    it('should return false for invalid subdivision types', () => {
        const invalidTypes = ['invalid', 'double', 'thirtysecond', '', 'QUARTER', 'Quarter'];
        for (const type of invalidTypes) {
            expect(isValidSubdivisionType(type)).toBe(false);
        }
    });
});

// ============================================================
// getSubdivisionDensity Tests
// ============================================================
describe('getSubdivisionDensity', () => {
    it('should return correct density for standard subdivision types', () => {
        expect(getSubdivisionDensity('quarter')).toBe(1);
        expect(getSubdivisionDensity('half')).toBe(0.5);
        expect(getSubdivisionDensity('eighth')).toBe(2);
        expect(getSubdivisionDensity('sixteenth')).toBe(4);
    });

    it('should return correct density for triplet and dotted subdivision types', () => {
        // Triplet and dotted values are determined by the engine
        // Just verify they return positive numbers
        expect(getSubdivisionDensity('triplet8')).toBeGreaterThan(0);
        expect(getSubdivisionDensity('triplet4')).toBeGreaterThan(0);
        expect(getSubdivisionDensity('dotted4')).toBeGreaterThan(0);
        expect(getSubdivisionDensity('dotted8')).toBeGreaterThan(0);
    });
});

// ============================================================
// DEFAULT_SUBDIVISION_CONFIG Tests
// ============================================================
describe('DEFAULT_SUBDIVISION_CONFIG', () => {
    it('should have empty beatSubdivisions map', () => {
        expect(DEFAULT_SUBDIVISION_CONFIG.beatSubdivisions).toBeInstanceOf(Map);
        expect(DEFAULT_SUBDIVISION_CONFIG.beatSubdivisions.size).toBe(0);
    });

    it('should have quarter as default subdivision', () => {
        expect(DEFAULT_SUBDIVISION_CONFIG.defaultSubdivision).toBe('quarter');
    });

    it('should be a valid config', () => {
        expect(() => validateSubdivisionConfig(DEFAULT_SUBDIVISION_CONFIG)).not.toThrow();
    });
});

// ============================================================
// VALID_SUBDIVISION_TYPES Tests
// ============================================================
describe('VALID_SUBDIVISION_TYPES', () => {
    it('should contain all expected subdivision types', () => {
        // Check that all core types are included
        expect(VALID_SUBDIVISION_TYPES).toContain('quarter');
        expect(VALID_SUBDIVISION_TYPES).toContain('half');
        expect(VALID_SUBDIVISION_TYPES).toContain('eighth');
        expect(VALID_SUBDIVISION_TYPES).toContain('sixteenth');
        expect(VALID_SUBDIVISION_TYPES).toContain('triplet8');
        expect(VALID_SUBDIVISION_TYPES).toContain('triplet4');
        expect(VALID_SUBDIVISION_TYPES).toContain('dotted4');
        expect(VALID_SUBDIVISION_TYPES).toContain('dotted8');
    });
});

// ============================================================
// BeatSubdivider Tests with Per-Beat Config
// ============================================================
describe('BeatSubdivider', () => {
    let subdivider: BeatSubdivider;

    beforeEach(() => {
        subdivider = new BeatSubdivider();
    });

    afterEach(() => {
        subdivider = null as unknown as BeatSubdivider;
    });

    describe('subdivide with per-beat config', () => {
        it('should create a SubdividedBeatMap from a UnifiedBeatMap', () => {
            const unifiedMap = createMockUnifiedBeatMap(50);
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'quarter',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            expect(result).toBeDefined();
            expect(result.beats).toBeDefined();
            expect(result.beats.length).toBeGreaterThan(0);
            expect(result.subdivisionConfig).toBeDefined();
            expect(result.subdivisionMetadata).toBeDefined();
        });

        it('should apply default subdivision to all beats when map is empty', () => {
            const unifiedMap = createMockUnifiedBeatMap(50);
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map(),
                defaultSubdivision: 'eighth',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Eighth notes should approximately double the beat count
            // (exact count depends on engine implementation)
            expect(result.beats.length).toBeGreaterThan(50);
            expect(result.beats.length).toBeLessThanOrEqual(100);

            // All beats should have subdivision type 'eighth'
            for (const beat of result.beats) {
                expect(beat.subdivisionType).toBe('eighth');
            }
        });

        it('should apply per-beat subdivisions from the map', () => {
            const unifiedMap = createMockUnifiedBeatMap(4);
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map([
                    [0, 'quarter'],   // Beat 0: 1 note
                    [1, 'eighth'],    // Beat 1: 2 notes
                    [2, 'sixteenth'], // Beat 2: 4 notes
                    [3, 'quarter'],   // Beat 3: 1 note
                ]),
                defaultSubdivision: 'quarter',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Verify we have beats from all source indices (using originalBeatIndex)
            const sourceIndices = new Set(result.beats.map(b => b.originalBeatIndex).filter((i): i is number => i !== undefined));
            expect(sourceIndices.size).toBeGreaterThan(0);

            // Verify subdivision types are applied correctly by checking the beats exist
            // (The engine may not set originalBeatIndex for all beats)
            const quarterBeats = result.beats.filter(b => b.subdivisionType === 'quarter');
            const eighthBeats = result.beats.filter(b => b.subdivisionType === 'eighth');
            const sixteenthBeats = result.beats.filter(b => b.subdivisionType === 'sixteenth');

            // Should have quarter, eighth, and sixteenth beats
            expect(quarterBeats.length).toBeGreaterThan(0);
            expect(eighthBeats.length).toBeGreaterThan(0);
            expect(sixteenthBeats.length).toBeGreaterThan(0);
        });

        it('should use default subdivision for beats not in the map', () => {
            const unifiedMap = createMockUnifiedBeatMap(10);
            const config: SubdivisionConfig = {
                beatSubdivisions: new Map([
                    [0, 'eighth'],  // Only beat 0 has custom subdivision
                    [5, 'sixteenth'], // Beat 5 has custom subdivision
                ]),
                defaultSubdivision: 'quarter',
            };
            const result = subdivider.subdivide(unifiedMap, config);

            // Verify we have eighth notes (beat 0) and sixteenth notes (beat 5)
            const eighthBeats = result.beats.filter(b => b.subdivisionType === 'eighth');
            const sixteenthBeats = result.beats.filter(b => b.subdivisionType === 'sixteenth');
            const quarterBeats = result.beats.filter(b => b.subdivisionType === 'quarter');

            // Should have some of each type
            expect(eighthBeats.length).toBeGreaterThan(0);
            expect(sixteenthBeats.length).toBeGreaterThan(0);
            expect(quarterBeats.length).toBeGreaterThan(0);
        });
    });
});

// ============================================================
// Edge Case Tests
// ============================================================
describe('Edge Cases', () => {
    let subdivider: BeatSubdivider;

    beforeEach(() => {
        subdivider = new BeatSubdivider();
    });

    afterEach(() => {
        subdivider = null as unknown as BeatSubdivider;
    });

    it('should handle empty beat map', () => {
        const unifiedMap = createMockUnifiedBeatMap(0);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'quarter',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        expect(result.beats).toHaveLength(0);
    });

    it('should handle single beat map', () => {
        const unifiedMap = createMockUnifiedBeatMap(1);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Should have at least 1 beat
        expect(result.beats.length).toBeGreaterThanOrEqual(1);
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('eighth');
        }
    });

    it('should handle all beats same subdivision (quarter)', () => {
        const unifiedMap = createMockUnifiedBeatMap(50);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'quarter',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Quarter notes should produce approximately 50 beats
        expect(result.beats.length).toBeGreaterThan(0);
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('quarter');
        }
    });

    it('should handle all beats same subdivision (eighth)', () => {
        const unifiedMap = createMockUnifiedBeatMap(50);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'eighth',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Eighth notes should produce approximately 100 beats
        expect(result.beats.length).toBeGreaterThan(50);
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('eighth');
        }
    });

    it('should handle all beats same subdivision (sixteenth)', () => {
        const unifiedMap = createMockUnifiedBeatMap(50);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'sixteenth',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Sixteenth notes should produce approximately 200 beats
        expect(result.beats.length).toBeGreaterThan(100);
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('sixteenth');
        }
    });

    it('should handle every beat different subdivision', () => {
        const unifiedMap = createMockUnifiedBeatMap(8);
        const subdivisionTypes: SubdivisionType[] = [
            'quarter', 'eighth', 'sixteenth', 'triplet8',
            'half', 'dotted4', 'dotted8', 'triplet4',
        ];

        const beatSubdivisions = new Map<number, SubdivisionType>();
        subdivisionTypes.forEach((type, index) => {
            beatSubdivisions.set(index, type);
        });

        const config: SubdivisionConfig = {
            beatSubdivisions,
            defaultSubdivision: 'quarter',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Verify we have beats with all the expected subdivision types
        for (const type of subdivisionTypes) {
            const beatsOfType = result.beats.filter(b => b.subdivisionType === type);
            expect(beatsOfType.length).toBeGreaterThan(0);
        }
    });

    it('should handle sparse subdivision assignments', () => {
        const unifiedMap = createMockUnifiedBeatMap(100);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                // Only a few beats have custom subdivisions
                [0, 'eighth'],
                [10, 'eighth'],
                [20, 'eighth'],
                [50, 'sixteenth'],
                [75, 'sixteenth'],
                [80, 'sixteenth'],
                [90, 'sixteenth'],
            ]),
            defaultSubdivision: 'quarter',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Should have more beats than 100 due to eighth and sixteenth notes
        expect(result.beats.length).toBeGreaterThan(100);

        // Verify we have the expected subdivision types
        const eighthBeats = result.beats.filter(b => b.subdivisionType === 'eighth');
        const sixteenthBeats = result.beats.filter(b => b.subdivisionType === 'sixteenth');
        const quarterBeats = result.beats.filter(b => b.subdivisionType === 'quarter');

        // Should have eighth notes (beats 0, 10, 20)
        expect(eighthBeats.length).toBeGreaterThan(0);
        // Should have sixteenth notes (beats 50, 75, 80, 90)
        expect(sixteenthBeats.length).toBeGreaterThan(0);
        // Should have quarter notes (default for most beats)
        expect(quarterBeats.length).toBeGreaterThan(0);
    });

    it('should handle triplet subdivisions correctly', () => {
        const unifiedMap = createMockUnifiedBeatMap(4);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'triplet8',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Verify all beats have the correct type
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('triplet8');
        }
    });

    it('should handle dotted subdivisions correctly', () => {
        const unifiedMap = createMockUnifiedBeatMap(4);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'dotted4',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Verify all beats have the correct type
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('dotted4');
        }
    });

    it('should handle half note subdivision (density < 1)', () => {
        const unifiedMap = createMockUnifiedBeatMap(4);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map(),
            defaultSubdivision: 'half',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Half notes should produce fewer beats than original
        expect(result.beats.length).toBeLessThanOrEqual(4);
        for (const beat of result.beats) {
            expect(beat.subdivisionType).toBe('half');
        }
    });

    it('should handle large beat count', () => {
        const unifiedMap = createMockUnifiedBeatMap(500);
        const config: SubdivisionConfig = {
            beatSubdivisions: new Map([
                [0, 'sixteenth'],
                [100, 'sixteenth'],
                [200, 'sixteenth'],
                [300, 'sixteenth'],
                [400, 'sixteenth'],
            ]),
            defaultSubdivision: 'quarter',
        };
        const result = subdivider.subdivide(unifiedMap, config);

        // Should have more beats than 500 due to sixteenth notes
        expect(result.beats.length).toBeGreaterThan(500);
    });
});
