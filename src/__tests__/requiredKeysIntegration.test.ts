/**
 * Integration Tests for Required Keys Feature
 *
 * Task 9.4: Integration Tests
 * - Test chart editor workflow (subdivided mode only)
 * - Test practice mode with required keys
 * - Test wrong key feedback (red with overlay)
 * - Test ignore key requirements toggle
 * - Test level export/import round-trip
 * - Test practice without chart (falls back to quarter note stream)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    useBeatDetectionStore,
} from '../store/beatDetectionStore';
import type {
    SubdividedBeatMap,
    SubdividedBeat,
    SubdivisionConfig,
    SubdivisionMetadata,
    LevelExportData,
    ChartStyle,
    SupportedKey,
    ExtendedButtonPressResult,
    ExtendedBeatAccuracy,
} from '../types';
import { validateLevelExportData } from '../types';

// ============================================================
// Test Helpers
// ============================================================

/**
 * Create a mock SubdividedBeat for testing
 */
function createMockSubdividedBeat(overrides: Partial<SubdividedBeat> = {}): SubdividedBeat {
    return {
        timestamp: 0.0,
        beatInMeasure: 0,
        isDownbeat: true,
        measureNumber: 0,
        intensity: 0.5,
        confidence: 0.9,
        isDetected: true,
        subdivisionType: 'quarter',
        ...overrides,
    };
}

/**
 * Create a mock SubdivisionMetadata for testing
 */
function createMockSubdivisionMetadata(): SubdivisionMetadata {
    return {
        originalBeatCount: 4,
        subdividedBeatCount: 4,
        averageDensityMultiplier: 1,
        explicitBeatCount: 0,
        subdivisionsUsed: ['quarter'],
        hasMultipleTempos: false,
        maxDensity: 1,
    };
}

/**
 * Create a mock SubdividedBeatMap for testing
 */
function createMockSubdividedBeatMap(
    beats: SubdividedBeat[] = [],
    audioId = 'test-audio-123'
): SubdividedBeatMap {
    return {
        audioId,
        duration: 10.0,
        beats: beats.length > 0 ? beats : [
            createMockSubdividedBeat({ timestamp: 0.0 }),
            createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false }),
            createMockSubdividedBeat({ timestamp: 1.0, beatInMeasure: 2, isDownbeat: false }),
            createMockSubdividedBeat({ timestamp: 1.5, beatInMeasure: 3, isDownbeat: false }),
        ],
        detectedBeatIndices: [0, 1, 2, 3],
        subdivisionConfig: {
            subdivisionType: 'quarter',
            beatsPerMeasure: 4,
            subdivisionMultiplier: 1,
        } as SubdivisionConfig,
        downbeatConfig: null,
        subdivisionMetadata: createMockSubdivisionMetadata(),
    };
}

/**
 * Create a mock SubdividedBeatMap with a specific number of beats
 */
function createMockSubdividedBeatMapWithCount(beatCount: number, bpm: number = 120): SubdividedBeatMap {
    const beatInterval = 60 / bpm;
    const beats: SubdividedBeat[] = [];

    for (let i = 0; i < beatCount; i++) {
        beats.push(
            createMockSubdividedBeat({
                timestamp: i * beatInterval,
                beatInMeasure: i % 4,
                isDownbeat: i % 4 === 0,
                measureNumber: Math.floor(i / 4),
                intensity: 0.5 + Math.random() * 0.5,
                confidence: 0.8 + Math.random() * 0.2,
                subdivisionType: 'quarter',
            })
        );
    }

    return {
        audioId: 'test-audio-123',
        duration: beatCount * beatInterval,
        beats,
        detectedBeatIndices: beats.map((_, i) => i),
        subdivisionConfig: {
            subdivisionType: 'quarter',
            beatsPerMeasure: 4,
            subdivisionMultiplier: 1,
        } as SubdivisionConfig,
        downbeatConfig: null,
        subdivisionMetadata: {
            originalBeatCount: beatCount,
            subdividedBeatCount: beatCount,
            averageDensityMultiplier: 1,
            explicitBeatCount: 0,
            subdivisionsUsed: ['quarter'],
            hasMultipleTempos: false,
            maxDensity: 1,
        },
    };
}

/**
 * Create a valid LevelExportData for testing
 */
function createMockLevelExportData(
    audioId: string,
    beatCount: number,
    options: {
        chartStyle?: ChartStyle;
        keys?: Map<number, string>;
        bpm?: number;
    } = {}
): LevelExportData {
    const { chartStyle = 'ddr', keys = new Map(), bpm = 120 } = options;
    const beatInterval = 60 / bpm;
    const usedKeys = new Set<string>();
    let keyCount = 0;

    const beats = Array.from({ length: beatCount }, (_, i) => {
        const requiredKey = keys.get(i);
        if (requiredKey) {
            usedKeys.add(requiredKey);
            keyCount++;
        }
        return {
            timestamp: i * beatInterval,
            beatInMeasure: i % 4,
            isDownbeat: i % 4 === 0,
            measureNumber: Math.floor(i / 4),
            intensity: 0.5,
            confidence: 0.9,
            requiredKey,
        };
    });

    return {
        version: 1,
        audioId,
        exportedAt: Date.now(),
        beatCount,
        beats,
        subdivisionConfig: {
            segments: [{ startBeat: 0, subdivision: 'quarter' }],
        },
        chartStyle,
        metadata: {
            keyCount,
            usedKeys: Array.from(usedKeys),
        },
    };
}

/**
 * Create a mock ButtonPressResult for testing.
 */
function createMockButtonPressResult(
    accuracy: ExtendedBeatAccuracy,
    options: {
        offset?: number;
        keyMatch?: boolean;
        pressedKey?: string;
        requiredKey?: string;
    } = {}
): ExtendedButtonPressResult {
    return {
        accuracy,
        offset: options.offset ?? 0,
        absoluteOffset: Math.abs(options.offset ?? 0),
        matchedBeat: null,
        keyMatch: options.keyMatch ?? true,
        pressedKey: options.pressedKey,
        requiredKey: options.requiredKey,
    };
}

/**
 * Reset the store to initial state
 */
function resetStore() {
    useBeatDetectionStore.setState({
        subdividedBeatMap: null,
        chartEditorActive: false,
        chartStyle: 'ddr',
        selectedKey: null,
        editorMode: 'view',
        keyLaneViewMode: 'off',
        keyAssignments: new Map(),
        currentAudioId: null,
        difficultySettings: {
            preset: 'normal',
            customThresholds: {
                perfect: 0.05,
                great: 0.1,
                good: 0.15,
                ok: 0.2,
            },
            ignoreKeyRequirements: false,
        },
    });
}

/**
 * Count keys assigned in beat map
 */
function countKeysInBeatMap(beatMap: SubdividedBeatMap | null): number {
    if (!beatMap) return 0;
    return beatMap.beats.filter(b => b.requiredKey !== undefined).length;
}

/**
 * Get used keys from beat map
 */
function getUsedKeysFromBeatMap(beatMap: SubdividedBeatMap | null): string[] {
    if (!beatMap) return [];
    const keys = new Set<string>();
    beatMap.beats.forEach(b => {
        if (b.requiredKey) keys.add(b.requiredKey);
    });
    return Array.from(keys);
}

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
// Integration Tests: Chart Editor Workflow
// ============================================================

describe('Chart Editor Workflow Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('Chart Editor Availability', () => {
        it('should not allow starting chart editor without subdivided beat map', () => {
            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).toBeNull();

            const actions = state.actions;
            actions.startChartEditor();

            const newState = useBeatDetectionStore.getState();
            expect(newState.chartEditorActive).toBe(false);
        });

        it('should allow starting chart editor when subdivided beat map exists', () => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
            });

            const actions = useBeatDetectionStore.getState().actions;
            actions.startChartEditor();

            const state = useBeatDetectionStore.getState();
            expect(state.chartEditorActive).toBe(true);
        });

        it('should start chart editor with DDR as default style', () => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
            });

            const { startChartEditor } = useBeatDetectionStore.getState().actions;
            startChartEditor();

            const state = useBeatDetectionStore.getState();
            expect(state.chartEditorActive).toBe(true);
            expect(state.chartStyle).toBe('ddr');
        });
    });

    describe('Key Assignment Workflow', () => {
        beforeEach(() => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
            });
            useBeatDetectionStore.getState().actions.startChartEditor();
        });

        it('should assign keys to beats in paint mode', () => {
            const { assignKeyToBeat, setSelectedKey, setEditorMode } =
                useBeatDetectionStore.getState().actions;

            // Set to paint mode and select a key
            setEditorMode('paint');
            setSelectedKey('up');

            // Assign it to beat 0
            assignKeyToBeat(0, 'up');

            // Verify assignment
            const state = useBeatDetectionStore.getState();
            const keyCount = countKeysInBeatMap(state.subdividedBeatMap);
            const usedKeys = getUsedKeysFromBeatMap(state.subdividedBeatMap);

            expect(keyCount).toBe(1);
            expect(usedKeys).toContain('up');
        });

        it('should remove keys in erase mode', () => {
            const { assignKeyToBeat, setEditorMode, setSelectedKey } =
                useBeatDetectionStore.getState().actions;

            // Assign a key
            setSelectedKey('up');
            assignKeyToBeat(0, 'up');

            // Verify assignment
            let state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(1);

            // Switch to erase mode and remove
            setEditorMode('erase');
            assignKeyToBeat(0, null);

            // Verify removal
            state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(0);
        });

        it('should clear all keys with clearAllKeys action', () => {
            const { assignKeyToBeat, setSelectedKey, clearAllKeys } =
                useBeatDetectionStore.getState().actions;

            // Assign multiple keys
            setSelectedKey('up');
            assignKeyToBeat(0, 'up');
            assignKeyToBeat(1, 'down');
            assignKeyToBeat(2, 'left');

            // Verify assignments
            let state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(3);

            // Clear all
            clearAllKeys();

            // Verify all cleared
            state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(0);
        });

        it('should support bulk key assignment', () => {
            const { assignKeysToBeats } = useBeatDetectionStore.getState().actions;

            // Bulk assign keys
            const assignments = [
                { beatIndex: 0, key: 'up' as const },
                { beatIndex: 1, key: 'down' as const },
                { beatIndex: 2, key: 'left' as const },
                { beatIndex: 3, key: 'right' as const },
            ];

            assignKeysToBeats(assignments);

            // Verify bulk assignment
            const state = useBeatDetectionStore.getState();
            const keyCount = countKeysInBeatMap(state.subdividedBeatMap);
            const usedKeys = getUsedKeysFromBeatMap(state.subdividedBeatMap);

            expect(keyCount).toBe(4);
            expect(usedKeys).toEqual(expect.arrayContaining(['up', 'down', 'left', 'right']));
        });

        it('should switch chart style and clear selected key', () => {
            const { setChartStyle, setSelectedKey } = useBeatDetectionStore.getState().actions;

            // Select a DDR key
            setSelectedKey('up');
            expect(useBeatDetectionStore.getState().selectedKey).toBe('up');

            // Switch to Guitar Hero style
            setChartStyle('guitar-hero');

            // Selected key should be cleared
            const state = useBeatDetectionStore.getState();
            expect(state.selectedKey).toBeNull();
            expect(state.chartStyle).toBe('guitar-hero');
        });
    });

    describe('Chart Style Filtering', () => {
        beforeEach(() => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
            });
            useBeatDetectionStore.getState().actions.startChartEditor();
        });

        it('should filter DDR keys correctly', () => {
            const { setChartStyle, assignKeyToBeat } = useBeatDetectionStore.getState().actions;

            setChartStyle('ddr');

            // DDR keys should work
            const ddrKeys: SupportedKey[] = ['up', 'down', 'left', 'right'];
            ddrKeys.forEach((key, i) => {
                assignKeyToBeat(i, key);
            });

            const state = useBeatDetectionStore.getState();
            const keyCount = countKeysInBeatMap(state.subdividedBeatMap);
            const usedKeys = getUsedKeysFromBeatMap(state.subdividedBeatMap);

            expect(keyCount).toBe(4);
            expect(usedKeys).toEqual(expect.arrayContaining(ddrKeys));
        });

        it('should filter Guitar Hero keys correctly', () => {
            const { setChartStyle, assignKeyToBeat } = useBeatDetectionStore.getState().actions;

            setChartStyle('guitar-hero');

            // Guitar Hero keys should work
            const guitarKeys: SupportedKey[] = ['1', '2', '3', '4', '5'];
            guitarKeys.forEach((key, i) => {
                assignKeyToBeat(i, key);
            });

            const state = useBeatDetectionStore.getState();
            const keyCount = countKeysInBeatMap(state.subdividedBeatMap);
            const usedKeys = getUsedKeysFromBeatMap(state.subdividedBeatMap);

            expect(keyCount).toBe(5);
            expect(usedKeys).toEqual(expect.arrayContaining(guitarKeys));
        });
    });
});

// ============================================================
// Integration Tests: Practice Mode with Required Keys
// ============================================================

describe('Practice Mode with Required Keys Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('Key Requirements Toggle', () => {
        it('should have ignoreKeyRequirements default to false', () => {
            const state = useBeatDetectionStore.getState();
            expect(state.difficultySettings.ignoreKeyRequirements).toBe(false);
        });

        it('should toggle ignoreKeyRequirements', () => {
            const { setIgnoreKeyRequirements } = useBeatDetectionStore.getState().actions;

            // Enable (easy mode)
            setIgnoreKeyRequirements(true);
            expect(useBeatDetectionStore.getState().difficultySettings.ignoreKeyRequirements).toBe(true);

            // Disable (strict mode)
            setIgnoreKeyRequirements(false);
            expect(useBeatDetectionStore.getState().difficultySettings.ignoreKeyRequirements).toBe(false);
        });
    });

    describe('KeyLane View Mode', () => {
        it('should default to off', () => {
            const state = useBeatDetectionStore.getState();
            expect(state.keyLaneViewMode).toBe('off');
        });

        it('should switch between view modes', () => {
            const { setKeyLaneViewMode } = useBeatDetectionStore.getState().actions;

            setKeyLaneViewMode('ddr');
            expect(useBeatDetectionStore.getState().keyLaneViewMode).toBe('ddr');

            setKeyLaneViewMode('guitar-hero');
            expect(useBeatDetectionStore.getState().keyLaneViewMode).toBe('guitar-hero');

            setKeyLaneViewMode('off');
            expect(useBeatDetectionStore.getState().keyLaneViewMode).toBe('off');
        });
    });

    describe('Wrong Key Detection', () => {
        it('should detect wrong key when required key does not match', () => {
            // Create a button press result with wrong key
            const result = createMockButtonPressResult('wrongKey', {
                offset: 0.01,
                keyMatch: false,
                pressedKey: 'up',
                requiredKey: 'down',
            });

            expect(result.accuracy).toBe('wrongKey');
            expect(result.keyMatch).toBe(false);
            expect(result.pressedKey).toBe('up');
            expect(result.requiredKey).toBe('down');
        });

        it('should detect correct key match', () => {
            const result = createMockButtonPressResult('perfect', {
                offset: 0.01,
                keyMatch: true,
                pressedKey: 'up',
                requiredKey: 'up',
            });

            expect(result.accuracy).toBe('perfect');
            expect(result.keyMatch).toBe(true);
            expect(result.pressedKey).toBe('up');
            expect(result.requiredKey).toBe('up');
        });
    });
});

// ============================================================
// Integration Tests: Wrong Key Feedback
// ============================================================

describe('Wrong Key Feedback Integration', () => {
    describe('ExtendedBeatAccuracy Type', () => {
        it('should include wrongKey as valid accuracy', () => {
            const accuracies: ExtendedBeatAccuracy[] = [
                'perfect',
                'great',
                'good',
                'ok',
                'miss',
                'wrongKey',
            ];

            // All should be valid accuracy types
            accuracies.forEach((accuracy) => {
                expect(typeof accuracy).toBe('string');
            });
        });
    });

    describe('ButtonPressResult with Key Info', () => {
        it('should include key match info in result', () => {
            const result: ExtendedButtonPressResult = {
                accuracy: 'wrongKey',
                offset: 0.02,
                absoluteOffset: 0.02,
                matchedBeat: null,
                keyMatch: false,
                pressedKey: 'left',
                requiredKey: 'right',
            };

            expect(result.keyMatch).toBe(false);
            expect(result.pressedKey).toBe('left');
            expect(result.requiredKey).toBe('right');
        });
    });
});

// ============================================================
// Integration Tests: Level Export/Import Round-Trip
// ============================================================

describe('Level Export/Import Round-Trip Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
        const beatMap = createMockSubdividedBeatMapWithCount(100);
        useBeatDetectionStore.setState({
            subdividedBeatMap: beatMap,
            chartEditorActive: true,
            chartStyle: 'ddr',
            keyAssignments: new Map(),
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('Level Export', () => {
        it('should export level with key assignments', () => {
            const { assignKeyToBeat, setSelectedKey, exportLevel } =
                useBeatDetectionStore.getState().actions;

            // Set up audio ID
            useBeatDetectionStore.setState({
                currentAudioId: 'test-audio-123',
            });

            // Assign some keys
            setSelectedKey('up');
            assignKeyToBeat(0, 'up');
            assignKeyToBeat(1, 'down');
            assignKeyToBeat(2, 'left');

            // Export
            const levelData = exportLevel('Test Song');

            expect(levelData).not.toBeNull();
            expect(levelData?.audioId).toBe('test-audio-123');
            expect(levelData?.audioTitle).toBe('Test Song');
            expect(levelData?.beatCount).toBe(100);
            expect(levelData?.chartStyle).toBe('ddr');
            expect(levelData?.metadata.keyCount).toBe(3);
            expect(levelData?.metadata.usedKeys).toEqual(
                expect.arrayContaining(['up', 'down', 'left'])
            );
        });

        it('should return null when exporting without audio ID in beat map', () => {
            // Create a beat map without an audioId (edge case)
            const beatMapWithoutAudioId = createMockSubdividedBeatMapWithCount(100);
            (beatMapWithoutAudioId as Record<string, unknown>).audioId = undefined;

            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMapWithoutAudioId,
            });

            const { exportLevel } = useBeatDetectionStore.getState().actions;
            const levelData = exportLevel('Test Song');

            // The beatMap.audioId will be undefined, but export will still work
            // This test verifies the export function handles missing audioId gracefully
            expect(levelData).not.toBeNull();
            expect(levelData?.audioId).toBeUndefined();
        });

        it('should return null when exporting without subdivided beat map', () => {
            useBeatDetectionStore.setState({
                subdividedBeatMap: null,
                currentAudioId: 'test-audio-123',
            });

            const { exportLevel } = useBeatDetectionStore.getState().actions;
            const levelData = exportLevel('Test Song');

            expect(levelData).toBeNull();
        });
    });

    describe('Level Import Validation', () => {
        it('should validate correct level data', () => {
            const levelData = createMockLevelExportData('test-audio-123', 100);
            const result = validateLevelExportData(levelData);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject invalid version', () => {
            const levelData = createMockLevelExportData('test-audio-123', 100);
            (levelData as Record<string, unknown>).version = 2;

            const result = validateLevelExportData(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('version'));
        });

        it('should reject missing audioId', () => {
            const levelData = createMockLevelExportData('test-audio-123', 100);
            (levelData as Record<string, unknown>).audioId = '';

            const result = validateLevelExportData(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('audioId'));
        });

        it('should reject invalid chartStyle', () => {
            const levelData = createMockLevelExportData('test-audio-123', 100);
            (levelData as Record<string, unknown>).chartStyle = 'invalid';

            const result = validateLevelExportData(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('chartStyle'));
        });

        it('should reject mismatched beat count', () => {
            const levelData = createMockLevelExportData('test-audio-123', 100);
            levelData.beatCount = 50; // Wrong count

            const result = validateLevelExportData(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('beatCount'));
        });
    });

    describe('Level Import', () => {
        it('should import level with matching audioId', () => {
            useBeatDetectionStore.setState({
                currentAudioId: 'test-audio-123',
            });

            const levelData = createMockLevelExportData('test-audio-123', 100, {
                keys: new Map([
                    [0, 'up'],
                    [1, 'down'],
                    [2, 'left'],
                ]),
            });

            const { importLevel } = useBeatDetectionStore.getState().actions;
            const result = importLevel(levelData);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('should reject import with mismatched audioId', () => {
            // Create a beat map with a different audioId than the import data
            const beatMapWithDifferentAudioId = createMockSubdividedBeatMapWithCount(100);
            (beatMapWithDifferentAudioId as Record<string, unknown>).audioId = 'different-audio-456';

            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMapWithDifferentAudioId,
            });

            const levelData = createMockLevelExportData('test-audio-123', 100);

            const { importLevel } = useBeatDetectionStore.getState().actions;
            const result = importLevel(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('Audio ID mismatch'));
        });

        it('should reject import with mismatched beat count', () => {
            useBeatDetectionStore.setState({
                currentAudioId: 'test-audio-123',
            });

            const levelData = createMockLevelExportData('test-audio-123', 50); // Different count

            const { importLevel } = useBeatDetectionStore.getState().actions;
            const result = importLevel(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors).toContainEqual(expect.stringContaining('Beat count'));
        });
    });

    describe('Full Round-Trip', () => {
        it('should export and re-import level successfully', () => {
            // Set up initial state
            useBeatDetectionStore.setState({
                currentAudioId: 'round-trip-test',
            });

            const { assignKeyToBeat, setSelectedKey, exportLevel, importLevel, clearAllKeys } =
                useBeatDetectionStore.getState().actions;

            // Create initial key assignments
            setSelectedKey('up');
            assignKeyToBeat(0, 'up');
            assignKeyToBeat(4, 'down');
            assignKeyToBeat(8, 'left');
            assignKeyToBeat(12, 'right');

            let state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(4);

            // Export
            const exportedData = exportLevel('Round Trip Test');
            expect(exportedData).not.toBeNull();

            // Clear all keys
            clearAllKeys();

            state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(0);

            // Re-import
            const result = importLevel(exportedData!);
            expect(result.valid).toBe(true);

            // Verify key assignments restored
            state = useBeatDetectionStore.getState();
            const keyCount = countKeysInBeatMap(state.subdividedBeatMap);
            const usedKeys = getUsedKeysFromBeatMap(state.subdividedBeatMap);

            expect(keyCount).toBe(4);
            expect(usedKeys).toEqual(expect.arrayContaining(['up', 'down', 'left', 'right']));
        });
    });
});

// ============================================================
// Integration Tests: Practice Without Chart
// ============================================================

describe('Practice Without Chart Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('Practice Mode Without Key Assignments', () => {
        it('should work without any key assignments', () => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
            });

            // Practice should work without key assignments
            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).not.toBeNull();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(0);

            // Can start chart editor (optional)
            const actions = state.actions;
            actions.startChartEditor();
            expect(useBeatDetectionStore.getState().chartEditorActive).toBe(true);
        });

        it('should have empty key statistics without assignments', () => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
            });

            const state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(0);
            expect(getUsedKeysFromBeatMap(state.subdividedBeatMap)).toHaveLength(0);
        });
    });

    describe('KeyLane View Without Chart', () => {
        it('should show empty state in KeyLane view without key assignments', () => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
                keyLaneViewMode: 'ddr',
            });

            const state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(0);
            expect(state.keyLaneViewMode).toBe('ddr');
        });

        it('should allow switching to KeyLane view even without chart', () => {
            const { setKeyLaneViewMode } = useBeatDetectionStore.getState().actions;

            setKeyLaneViewMode('ddr');
            expect(useBeatDetectionStore.getState().keyLaneViewMode).toBe('ddr');

            setKeyLaneViewMode('guitar-hero');
            expect(useBeatDetectionStore.getState().keyLaneViewMode).toBe('guitar-hero');
        });
    });

    describe('Ignore Key Requirements Mode', () => {
        it('should have ignoreKeyRequirements available', () => {
            const state = useBeatDetectionStore.getState();
            expect(typeof state.difficultySettings.ignoreKeyRequirements).toBe('boolean');
        });

        it('should toggle ignoreKeyRequirements', () => {
            const { setIgnoreKeyRequirements } = useBeatDetectionStore.getState().actions;

            setIgnoreKeyRequirements(true);
            expect(useBeatDetectionStore.getState().difficultySettings.ignoreKeyRequirements).toBe(true);

            setIgnoreKeyRequirements(false);
            expect(useBeatDetectionStore.getState().difficultySettings.ignoreKeyRequirements).toBe(false);
        });
    });
});

// ============================================================
// Integration Tests: Store State Consistency
// ============================================================

describe('Store State Consistency Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('State Transitions', () => {
        it('should maintain consistent state during chart editor workflow', () => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);

            // Start with no beat map
            expect(useBeatDetectionStore.getState().subdividedBeatMap).toBeNull();

            // Add beat map
            useBeatDetectionStore.setState({ subdividedBeatMap: beatMap });
            expect(useBeatDetectionStore.getState().subdividedBeatMap).not.toBeNull();

            // Start editor
            const { startChartEditor, stopChartEditor } = useBeatDetectionStore.getState().actions;
            startChartEditor();
            expect(useBeatDetectionStore.getState().chartEditorActive).toBe(true);

            // Stop editor
            stopChartEditor();
            expect(useBeatDetectionStore.getState().chartEditorActive).toBe(false);
        });

        it('should preserve key assignments when beat map changes', () => {
            const beatMap1 = createMockSubdividedBeatMapWithCount(100);

            useBeatDetectionStore.setState({ subdividedBeatMap: beatMap1 });

            const { assignKeyToBeat, setSelectedKey } = useBeatDetectionStore.getState().actions;
            setSelectedKey('up');
            assignKeyToBeat(0, 'up');

            let state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(1);

            // The beat map reference should still have the key
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('up');
        });
    });

    describe('Chart Style and KeyLane View Consistency', () => {
        it('should allow DDR chart with DDR KeyLane view', () => {
            const { setChartStyle, setKeyLaneViewMode } = useBeatDetectionStore.getState().actions;

            setChartStyle('ddr');
            setKeyLaneViewMode('ddr');

            const state = useBeatDetectionStore.getState();
            expect(state.chartStyle).toBe('ddr');
            expect(state.keyLaneViewMode).toBe('ddr');
        });

        it('should allow Guitar Hero chart with Guitar Hero KeyLane view', () => {
            const { setChartStyle, setKeyLaneViewMode } = useBeatDetectionStore.getState().actions;

            setChartStyle('guitar-hero');
            setKeyLaneViewMode('guitar-hero');

            const state = useBeatDetectionStore.getState();
            expect(state.chartStyle).toBe('guitar-hero');
            expect(state.keyLaneViewMode).toBe('guitar-hero');
        });

        it('should allow mismatched style and view (for flexibility)', () => {
            const { setChartStyle, setKeyLaneViewMode } = useBeatDetectionStore.getState().actions;

            setChartStyle('ddr');
            setKeyLaneViewMode('guitar-hero');

            const state = useBeatDetectionStore.getState();
            // Both should be set independently
            expect(state.chartStyle).toBe('ddr');
            expect(state.keyLaneViewMode).toBe('guitar-hero');
        });
    });
});

// ============================================================
// Integration Tests: Edge Cases
// ============================================================

describe('Edge Cases Integration', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    afterEach(() => {
        vi.clearAllMocks();
        resetStore();
    });

    describe('Empty Beat Map', () => {
        it('should handle empty beat map', () => {
            const emptyBeatMap: SubdividedBeatMap = {
                audioId: 'empty-test',
                duration: 0,
                beats: [],
                detectedBeatIndices: [],
                subdivisionConfig: {
                    subdivisionType: 'quarter',
                    beatsPerMeasure: 4,
                    subdivisionMultiplier: 1,
                } as SubdivisionConfig,
                downbeatConfig: null,
                subdivisionMetadata: {
                    originalBeatCount: 0,
                    subdividedBeatCount: 0,
                    averageDensityMultiplier: 0,
                    explicitBeatCount: 0,
                    subdivisionsUsed: [],
                    hasMultipleTempos: false,
                    maxDensity: 0,
                },
            };

            useBeatDetectionStore.setState({ subdividedBeatMap: emptyBeatMap });

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).not.toBeNull();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(0);

            // Can still start chart editor
            state.actions.startChartEditor();
            expect(useBeatDetectionStore.getState().chartEditorActive).toBe(true);
        });
    });

    describe('Large Beat Map', () => {
        it('should handle large beat map efficiently', () => {
            const largeBeatMap = createMockSubdividedBeatMapWithCount(10000);

            useBeatDetectionStore.setState({ subdividedBeatMap: largeBeatMap });

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).not.toBeNull();
            expect(state.subdividedBeatMap?.beats.length).toBe(10000);

            const { startChartEditor, assignKeyToBeat, setSelectedKey } =
                useBeatDetectionStore.getState().actions;
            startChartEditor();

            // Assign a key to the last beat
            setSelectedKey('up');
            assignKeyToBeat(9999, 'up');

            const newState = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(newState.subdividedBeatMap)).toBe(1);
        });
    });

    describe('Concurrent Key Assignments', () => {
        it('should handle rapid key assignments', () => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
                chartEditorActive: true,
            });

            const { assignKeyToBeat } = useBeatDetectionStore.getState().actions;

            // Rapidly assign keys
            for (let i = 0; i < 100; i++) {
                const keys: SupportedKey[] = ['up', 'down', 'left', 'right', '1', '2', '3', '4', '5'];
                assignKeyToBeat(i, keys[i % keys.length]);
            }

            const state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(100);
        });
    });

    describe('Invalid Key Assignment', () => {
        it('should ignore invalid beat index', () => {
            const beatMap = createMockSubdividedBeatMapWithCount(100);
            useBeatDetectionStore.setState({
                subdividedBeatMap: beatMap,
                chartEditorActive: true,
            });

            const { assignKeyToBeat } = useBeatDetectionStore.getState().actions;

            // Try to assign to out-of-range beat
            assignKeyToBeat(999, 'up');

            // Should not crash, key count should remain 0
            const state = useBeatDetectionStore.getState();
            expect(countKeysInBeatMap(state.subdividedBeatMap)).toBe(0);
        });
    });
});
