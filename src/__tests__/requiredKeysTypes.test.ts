/**
 * Unit Tests for Required Keys Types
 *
 * Task 9.1: Test type definitions for chart mode
 * - Test `ExtendedBeatAccuracy` includes 'wrongKey'
 * - Test `ExtendedButtonPressResult` with key fields
 * - Test helper function re-exports
 * - Test `LevelExportData` type validation
 */

import { describe, it, expect } from 'vitest';
import {
    // Types - we test these via type checking and runtime values
    type ExtendedBeatAccuracy,
    type ExtendedButtonPressResult,
    type LevelExportData,
    type LevelExportBeat,
    type LevelImportValidationResult,
    type ChartStyle,
    type SupportedKey,
    type DdrKey,
    type GuitarKey,
    // Validation function
    validateLevelExportData,
    // Helper functions re-exported from engine
    assignKeyToBeat,
    assignKeysToBeats,
    extractKeyMap,
    clearAllKeys,
    hasRequiredKeys,
    getKeyCount,
    getUsedKeys,
    // Types for creating test data
    type Beat,
    type KeyAssignment,
} from '../types';

// ============================================================
// Task 9.1.1: Test ExtendedBeatAccuracy includes 'wrongKey'
// ============================================================

describe('ExtendedBeatAccuracy', () => {
    it('should include all standard accuracy levels', () => {
        const accuracies: ExtendedBeatAccuracy[] = ['perfect', 'great', 'good', 'ok', 'miss', 'wrongKey'];

        // Type check passes if this compiles
        expect(accuracies).toContain('perfect');
        expect(accuracies).toContain('great');
        expect(accuracies).toContain('good');
        expect(accuracies).toContain('ok');
        expect(accuracies).toContain('miss');
    });

    it('should include wrongKey accuracy level', () => {
        const wrongKeyAccuracy: ExtendedBeatAccuracy = 'wrongKey';

        // Type check passes if this compiles
        expect(wrongKeyAccuracy).toBe('wrongKey');
    });

    it('should be assignable to variables of type ExtendedBeatAccuracy', () => {
        // This test ensures TypeScript compilation passes for all valid values
        const testCases: { value: ExtendedBeatAccuracy; expected: string }[] = [
            { value: 'perfect', expected: 'perfect' },
            { value: 'great', expected: 'great' },
            { value: 'good', expected: 'good' },
            { value: 'ok', expected: 'ok' },
            { value: 'miss', expected: 'miss' },
            { value: 'wrongKey', expected: 'wrongKey' },
        ];

        testCases.forEach(({ value, expected }) => {
            expect(value).toBe(expected);
        });
    });
});

// ============================================================
// Task 9.1.2: Test ExtendedButtonPressResult with key fields
// ============================================================

describe('ExtendedButtonPressResult', () => {
    // Helper to create a minimal mock Beat for testing
    const createMockBeat = (overrides: Partial<Beat> = {}): Beat => ({
        timestamp: 1.0,
        beatInMeasure: 0,
        isDownbeat: true,
        measureNumber: 0,
        intensity: 0.5,
        confidence: 0.9,
        ...overrides,
    });

    it('should include keyMatch field', () => {
        const result: ExtendedButtonPressResult = {
            accuracy: 'perfect',
            offset: 0.01,
            matchedBeat: createMockBeat(),
            absoluteOffset: 0.01,
            keyMatch: true,
        };

        expect(result.keyMatch).toBe(true);
    });

    it('should include pressedKey field (optional)', () => {
        const result: ExtendedButtonPressResult = {
            accuracy: 'great',
            offset: 0.02,
            matchedBeat: createMockBeat(),
            absoluteOffset: 0.02,
            keyMatch: true,
            pressedKey: 'up',
        };

        expect(result.pressedKey).toBe('up');
    });

    it('should include requiredKey field (optional)', () => {
        const result: ExtendedButtonPressResult = {
            accuracy: 'perfect',
            offset: 0.01,
            matchedBeat: createMockBeat({ requiredKey: 'down' }),
            absoluteOffset: 0.01,
            keyMatch: true,
            pressedKey: 'down',
            requiredKey: 'down',
        };

        expect(result.requiredKey).toBe('down');
    });

    it('should support wrongKey accuracy with key mismatch', () => {
        const result: ExtendedButtonPressResult = {
            accuracy: 'wrongKey',
            offset: 0.02,
            matchedBeat: createMockBeat({ requiredKey: 'left' }),
            absoluteOffset: 0.02,
            keyMatch: false,
            pressedKey: 'right',
            requiredKey: 'left',
        };

        expect(result.accuracy).toBe('wrongKey');
        expect(result.keyMatch).toBe(false);
        expect(result.pressedKey).toBe('right');
        expect(result.requiredKey).toBe('left');
    });

    it('should work without key fields (optional)', () => {
        const result: ExtendedButtonPressResult = {
            accuracy: 'good',
            offset: 0.05,
            matchedBeat: createMockBeat(),
            absoluteOffset: 0.05,
            keyMatch: true,
        };

        // keyMatch is required, but pressedKey and requiredKey are optional
        expect(result.keyMatch).toBe(true);
        expect(result.pressedKey).toBeUndefined();
        expect(result.requiredKey).toBeUndefined();
    });

    it('should support all ExtendedBeatAccuracy values', () => {
        const accuracies: ExtendedBeatAccuracy[] = ['perfect', 'great', 'good', 'ok', 'miss', 'wrongKey'];

        accuracies.forEach((accuracy) => {
            const result: ExtendedButtonPressResult = {
                accuracy,
                offset: 0.01,
                matchedBeat: createMockBeat(),
                absoluteOffset: 0.01,
                keyMatch: accuracy !== 'wrongKey',
            };

            expect(result.accuracy).toBe(accuracy);
        });
    });
});

// ============================================================
// Task 9.1.3: Test helper function re-exports
// ============================================================

describe('Helper Function Re-exports', () => {
    it('should export assignKeyToBeat function', () => {
        expect(typeof assignKeyToBeat).toBe('function');
    });

    it('should export assignKeysToBeats function', () => {
        expect(typeof assignKeysToBeats).toBe('function');
    });

    it('should export extractKeyMap function', () => {
        expect(typeof extractKeyMap).toBe('function');
    });

    it('should export clearAllKeys function', () => {
        expect(typeof clearAllKeys).toBe('function');
    });

    it('should export hasRequiredKeys function', () => {
        expect(typeof hasRequiredKeys).toBe('function');
    });

    it('should export getKeyCount function', () => {
        expect(typeof getKeyCount).toBe('function');
    });

    it('should export getUsedKeys function', () => {
        expect(typeof getUsedKeys).toBe('function');
    });

    describe('assignKeyToBeat', () => {
        // Helper to create a minimal beat map for testing
        const createTestBeatMap = (beats: Beat[] = []): { beats: Beat[] } => ({
            beats,
        });

        it('should assign a key to a beat', () => {
            const beatMap = createTestBeatMap([{
                timestamp: 1.0,
                beatInMeasure: 0,
                isDownbeat: true,
                measureNumber: 0,
                intensity: 0.5,
                confidence: 0.9,
            }]);

            const result = assignKeyToBeat(beatMap, 0, 'up');
            expect(result.beats[0].requiredKey).toBe('up');
        });

        it('should clear key assignment when passed null', () => {
            const beatMap = createTestBeatMap([{
                timestamp: 1.0,
                beatInMeasure: 0,
                isDownbeat: true,
                measureNumber: 0,
                intensity: 0.5,
                confidence: 0.9,
                requiredKey: 'up',
            }]);

            const result = assignKeyToBeat(beatMap, 0, null);
            expect(result.beats[0].requiredKey).toBeUndefined();
        });
    });

    describe('assignKeysToBeats', () => {
        // Helper to create a minimal beat map for testing
        const createTestBeatMap = (beats: Beat[] = []): { beats: Beat[] } => ({
            beats,
        });

        it('should assign keys to multiple beats', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
                { timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
                { timestamp: 1.0, beatInMeasure: 2, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
            ]);

            const assignments: KeyAssignment[] = [
                { beatIndex: 0, key: 'up' },
                { beatIndex: 2, key: 'down' },
            ];

            const result = assignKeysToBeats(beatMap, assignments);
            expect(result.beats[0].requiredKey).toBe('up');
            expect(result.beats[1].requiredKey).toBeUndefined();
            expect(result.beats[2].requiredKey).toBe('down');
        });
    });

    describe('extractKeyMap', () => {
        // Helper to create a minimal beat map for testing
        const createTestBeatMap = (beats: Beat[] = []): { beats: Beat[] } => ({
            beats,
        });

        it('should extract key assignments as a map', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'up' },
                { timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
                { timestamp: 1.0, beatInMeasure: 2, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'down' },
            ]);

            const keyMap = extractKeyMap(beatMap);
            expect(keyMap.size).toBe(2);
            expect(keyMap.get(0)).toBe('up');
            expect(keyMap.get(2)).toBe('down');
            expect(keyMap.has(1)).toBe(false);
        });
    });

    describe('clearAllKeys', () => {
        // Helper to create a minimal beat map for testing
        const createTestBeatMap = (beats: Beat[] = []): { beats: Beat[] } => ({
            beats,
        });

        it('should clear all key assignments', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'up' },
                { timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'down' },
                { timestamp: 1.0, beatInMeasure: 2, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'left' },
            ]);

            const result = clearAllKeys(beatMap);
            expect(result.beats.every(b => b.requiredKey === undefined)).toBe(true);
        });
    });

    describe('hasRequiredKeys', () => {
        // Helper to create a minimal beat map for testing
        const createTestBeatMap = (beats: Beat[] = []): { beats: Beat[] } => ({
            beats,
        });

        it('should return true when beats have required keys', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'up' },
            ]);

            expect(hasRequiredKeys(beatMap)).toBe(true);
        });

        it('should return false when no beats have required keys', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
            ]);

            expect(hasRequiredKeys(beatMap)).toBe(false);
        });
    });

    describe('getKeyCount', () => {
        // Helper to create a minimal beat map for testing
        const createTestBeatMap = (beats: Beat[] = []): { beats: Beat[] } => ({
            beats,
        });

        it('should count beats with required keys', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'up' },
                { timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
                { timestamp: 1.0, beatInMeasure: 2, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'down' },
            ]);

            expect(getKeyCount(beatMap)).toBe(2);
        });

        it('should return 0 when no beats have required keys', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
            ]);

            expect(getKeyCount(beatMap)).toBe(0);
        });
    });

    describe('getUsedKeys', () => {
        // Helper to create a minimal beat map for testing
        const createTestBeatMap = (beats: Beat[] = []): { beats: Beat[] } => ({
            beats,
        });

        it('should return unique keys used in beats', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'up' },
                { timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'up' },
                { timestamp: 1.0, beatInMeasure: 2, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'down' },
            ]);

            const usedKeys = getUsedKeys(beatMap);
            expect(usedKeys).toContain('down');
            expect(usedKeys).toContain('up');
            expect(usedKeys.length).toBe(2);
        });

        it('should return empty array when no keys are used', () => {
            const beatMap = createTestBeatMap([
                { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
            ]);

            expect(getUsedKeys(beatMap)).toEqual([]);
        });
    });
});

// ============================================================
// Task 9.1.4: Test LevelExportData type validation
// ============================================================

describe('validateLevelExportData', () => {
    // Helper to create valid level export data for testing
    const createValidLevelData = (overrides: Partial<LevelExportData> = {}): LevelExportData => {
        const defaultBeat: LevelExportBeat = {
            timestamp: 0.0,
            beatInMeasure: 0,
            isDownbeat: true,
            measureNumber: 0,
            intensity: 0.5,
            confidence: 0.9,
        };

        return {
            version: 1,
            audioId: 'test-audio-123',
            audioTitle: 'Test Song',
            exportedAt: Date.now(),
            beatCount: 2,
            beats: [
                { ...defaultBeat, timestamp: 0.0, requiredKey: 'up' },
                { ...defaultBeat, timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'down' },
            ],
            subdivisionConfig: {
                subdivisionType: 'eighth',
                beatsPerMeasure: 4,
                subdivisionMultiplier: 2,
            },
            chartStyle: 'ddr',
            metadata: {
                keyCount: 2,
                usedKeys: ['up', 'down'],
            },
            ...overrides,
        };
    };

    describe('valid data', () => {
        it('should validate correct level export data', () => {
            const data = createValidLevelData();
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate data with guitar-hero chart style', () => {
            const data = createValidLevelData({
                chartStyle: 'guitar-hero',
                metadata: { keyCount: 1, usedKeys: ['1'] },
                beats: [
                    { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: '1' },
                ],
                beatCount: 1,
            });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should validate data without optional audioTitle', () => {
            const data = createValidLevelData();
            delete (data as Record<string, unknown>).audioTitle;

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(true);
            expect(result.warnings).toContain('audioTitle is missing - this is optional but recommended');
        });

        it('should validate beats without requiredKey (optional)', () => {
            const data = createValidLevelData({
                beats: [
                    { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
                ],
                beatCount: 1,
                metadata: { keyCount: 0, usedKeys: [] },
            });

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(true);
        });
    });

    describe('invalid data types', () => {
        it('should reject null data', () => {
            const result = validateLevelExportData(null);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Data must be a non-null object');
        });

        it('should reject non-object data', () => {
            const result = validateLevelExportData('not an object');

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('Data must be a non-null object');
        });

        it('should reject array data', () => {
            const result = validateLevelExportData([]);

            expect(result.valid).toBe(false);
        });
    });

    describe('version validation', () => {
        it('should reject version other than 1', () => {
            const data = createValidLevelData({ version: 2 as unknown as 1 });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('version must be 1'))).toBe(true);
        });

        it('should reject missing version', () => {
            const data = createValidLevelData();
            delete (data as Record<string, unknown>).version;

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
        });
    });

    describe('audioId validation', () => {
        it('should reject empty audioId', () => {
            const data = createValidLevelData({ audioId: '' });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('audioId must be a non-empty string');
        });

        it('should reject non-string audioId', () => {
            const data = createValidLevelData({ audioId: 123 as unknown as string });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('audioId must be a non-empty string');
        });

        it('should reject missing audioId', () => {
            const data = createValidLevelData();
            delete (data as Record<string, unknown>).audioId;

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
        });
    });

    describe('exportedAt validation', () => {
        it('should reject non-number exportedAt', () => {
            const data = createValidLevelData({ exportedAt: '2024-01-01' as unknown as number });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('exportedAt must be a positive number'))).toBe(true);
        });

        it('should reject zero exportedAt', () => {
            const data = createValidLevelData({ exportedAt: 0 });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
        });

        it('should reject negative exportedAt', () => {
            const data = createValidLevelData({ exportedAt: -1 });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
        });
    });

    describe('beatCount validation', () => {
        it('should reject non-number beatCount', () => {
            const data = createValidLevelData({ beatCount: '10' as unknown as number });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('beatCount must be a non-negative number'))).toBe(true);
        });

        it('should reject negative beatCount', () => {
            const data = createValidLevelData({ beatCount: -1 });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
        });

        it('should allow zero beatCount', () => {
            const data = createValidLevelData({ beatCount: 0, beats: [] });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(true);
        });
    });

    describe('beats validation', () => {
        it('should reject non-array beats', () => {
            const data = createValidLevelData({ beats: {} as LevelExportBeat[] });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('beats must be an array');
        });

        it('should reject mismatched beatCount and beats length', () => {
            const data = createValidLevelData({ beatCount: 5 });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('beatCount') && e.includes('does not match beats array length'))).toBe(true);
        });

        it('should validate each beat has required fields', () => {
            const data = createValidLevelData({
                beats: [
                    { timestamp: 0 } as LevelExportBeat, // Missing required fields
                ],
                beatCount: 1,
            });

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('beats[0].beatInMeasure must be a number'))).toBe(true);
            expect(result.errors.some(e => e.includes('beats[0].isDownbeat must be a boolean'))).toBe(true);
        });

        it('should reject non-number timestamp', () => {
            const data = createValidLevelData({
                beats: [
                    { timestamp: '0.0' as unknown as number, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
                ],
                beatCount: 1,
            });

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('beats[0].timestamp must be a number'))).toBe(true);
        });

        it('should reject non-string requiredKey if present', () => {
            const data = createValidLevelData({
                beats: [
                    { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 123 as unknown as string },
                ],
                beatCount: 1,
            });

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('beats[0].requiredKey must be a string if present'))).toBe(true);
        });

        it('should reject null beat object', () => {
            const data = createValidLevelData({
                beats: [null as unknown as LevelExportBeat],
                beatCount: 1,
            });

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes('beats[0] must be an object'))).toBe(true);
        });
    });

    describe('subdivisionConfig validation', () => {
        it('should reject missing subdivisionConfig', () => {
            const data = createValidLevelData();
            delete (data as Record<string, unknown>).subdivisionConfig;

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('subdivisionConfig must be an object');
        });

        it('should reject null subdivisionConfig', () => {
            const data = createValidLevelData({ subdivisionConfig: null as unknown as LevelExportData['subdivisionConfig'] });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('subdivisionConfig must be an object');
        });
    });

    describe('chartStyle validation', () => {
        it('should reject invalid chartStyle', () => {
            const data = createValidLevelData({ chartStyle: 'invalid' as ChartStyle });
            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.some(e => e.includes("chartStyle must be 'ddr' or 'guitar-hero'"))).toBe(true);
        });

        it('should reject missing chartStyle', () => {
            const data = createValidLevelData();
            delete (data as Record<string, unknown>).chartStyle;

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
        });
    });

    describe('metadata validation', () => {
        it('should reject missing metadata', () => {
            const data = createValidLevelData();
            delete (data as Record<string, unknown>).metadata;

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('metadata must be an object');
        });

        it('should reject non-number keyCount', () => {
            const data = createValidLevelData({
                metadata: { keyCount: '5' as unknown as number, usedKeys: ['up'] },
            });

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('metadata.keyCount must be a number');
        });

        it('should reject non-array usedKeys', () => {
            const data = createValidLevelData({
                metadata: { keyCount: 1, usedKeys: 'up' as unknown as string[] },
            });

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors).toContain('metadata.usedKeys must be an array');
        });
    });

    describe('multiple errors', () => {
        it('should collect multiple validation errors', () => {
            const data = {
                version: 2,
                audioId: '',
                // Missing many required fields
            };

            const result = validateLevelExportData(data);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(1);
        });
    });
});

// ============================================================
// Additional Type Tests: Chart-related types
// ============================================================

describe('Chart-related Types', () => {
    describe('ChartStyle', () => {
        it('should accept ddr style', () => {
            const style: ChartStyle = 'ddr';
            expect(style).toBe('ddr');
        });

        it('should accept guitar-hero style', () => {
            const style: ChartStyle = 'guitar-hero';
            expect(style).toBe('guitar-hero');
        });
    });

    describe('SupportedKey', () => {
        it('should accept arrow keys', () => {
            const keys: SupportedKey[] = ['up', 'down', 'left', 'right'];
            expect(keys).toHaveLength(4);
        });

        it('should accept number keys', () => {
            const keys: SupportedKey[] = ['1', '2', '3', '4', '5'];
            expect(keys).toHaveLength(5);
        });
    });

    describe('DdrKey', () => {
        it('should accept DDR arrow keys', () => {
            const keys: DdrKey[] = ['up', 'down', 'left', 'right'];
            expect(keys).toHaveLength(4);
        });
    });

    describe('GuitarKey', () => {
        it('should accept Guitar Hero number keys', () => {
            const keys: GuitarKey[] = ['1', '2', '3', '4', '5'];
            expect(keys).toHaveLength(5);
        });
    });
});
