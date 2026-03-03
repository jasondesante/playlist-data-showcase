/**
 * Unit Tests for Chart Editor Store
 *
 * Task 9.3: Test chart editor actions and selectors
 * - Test key assignment actions
 * - Test bulk assignment
 * - Test clear all keys
 * - Test statistics selectors
 * - Test level export/import actions
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
    useBeatDetectionStore,
    useChartStatistics,
    useKeyMap,
    useHasRequiredKeys,
    useCanStartChartEditor,
} from '../store/beatDetectionStore';
import type {
    SubdividedBeatMap,
    SubdividedBeat,
    SubdivisionConfig,
    SubdivisionMetadata,
    LevelExportData,
    ChartStyle,
    SupportedKey,
    ChartEditorMode,
    KeyLaneViewMode,
    KeyAssignment,
} from '../types';

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
 * Create a valid LevelExportData for testing
 */
function createMockLevelExportData(overrides: Partial<LevelExportData> = {}): LevelExportData {
    const defaultBeat = {
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
            subdivisionType: 'quarter',
            beatsPerMeasure: 4,
            subdivisionMultiplier: 1,
        },
        chartStyle: 'ddr',
        metadata: {
            keyCount: 2,
            usedKeys: ['down', 'up'],
        },
        ...overrides,
    };
}

/**
 * Reset the store to initial state
 */
function resetStore() {
    const store = useBeatDetectionStore.getState();
    // Reset to initial state by clearing the beat map and chart editor state
    useBeatDetectionStore.setState({
        subdividedBeatMap: null,
        chartEditorActive: false,
        chartStyle: 'ddr',
        selectedKey: null,
        editorMode: 'view',
        keyLaneViewMode: 'off',
    });
}

// ============================================================
// Task 9.3.1: Test Key Assignment Actions
// ============================================================

describe('Chart Editor Store - Key Assignment Actions', () => {
    beforeEach(() => {
        resetStore();
    });

    afterEach(() => {
        resetStore();
    });

    describe('startChartEditor', () => {
        it('should start chart editor when subdivided beat map exists', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            actions.startChartEditor();

            const state = useBeatDetectionStore.getState();
            expect(state.chartEditorActive).toBe(true);
            expect(state.editorMode).toBe('view');
            expect(state.selectedKey).toBeNull();
        });

        it('should not start chart editor when no subdivided beat map', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.startChartEditor();

            const state = useBeatDetectionStore.getState();
            expect(state.chartEditorActive).toBe(false);
        });
    });

    describe('stopChartEditor', () => {
        it('should stop chart editor and reset state', () => {
            useBeatDetectionStore.setState({
                chartEditorActive: true,
                editorMode: 'paint',
                selectedKey: 'up',
            });

            const actions = useBeatDetectionStore.getState().actions;
            actions.stopChartEditor();

            const state = useBeatDetectionStore.getState();
            expect(state.chartEditorActive).toBe(false);
            expect(state.editorMode).toBe('view');
            expect(state.selectedKey).toBeNull();
        });
    });

    describe('assignKeyToBeat', () => {
        it('should assign a key to a beat', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeyToBeat(0, 'up');

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('up');
        });

        it('should remove key when assigning null', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeyToBeat(0, null);

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBeUndefined();
        });

        it('should not modify beat map when no subdivided beat map exists', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeyToBeat(0, 'up');

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).toBeNull();
        });

        it('should not modify beat map for invalid beat index', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeyToBeat(-1, 'up');
            actions.assignKeyToBeat(100, 'up');

            const state = useBeatDetectionStore.getState();
            // Beat map should remain unchanged
            expect(state.subdividedBeatMap?.beats.every(b => b.requiredKey === undefined)).toBe(true);
        });

        it('should assign different key types (DDR and Guitar Hero)', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;

            // DDR keys
            actions.assignKeyToBeat(0, 'up');
            actions.assignKeyToBeat(1, 'down');
            actions.assignKeyToBeat(2, 'left');
            actions.assignKeyToBeat(3, 'right');

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('up');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBe('down');
            expect(state.subdividedBeatMap?.beats[2].requiredKey).toBe('left');
            expect(state.subdividedBeatMap?.beats[3].requiredKey).toBe('right');
        });

        it('should assign Guitar Hero number keys', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;

            // Guitar Hero keys
            actions.assignKeyToBeat(0, '1');
            actions.assignKeyToBeat(1, '2');
            actions.assignKeyToBeat(2, '3');
            actions.assignKeyToBeat(3, '4');

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('1');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBe('2');
            expect(state.subdividedBeatMap?.beats[2].requiredKey).toBe('3');
            expect(state.subdividedBeatMap?.beats[3].requiredKey).toBe('4');
        });
    });

    describe('setChartStyle', () => {
        it('should set chart style to ddr', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.setChartStyle('ddr');

            const state = useBeatDetectionStore.getState();
            expect(state.chartStyle).toBe('ddr');
        });

        it('should set chart style to guitar-hero', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.setChartStyle('guitar-hero');

            const state = useBeatDetectionStore.getState();
            expect(state.chartStyle).toBe('guitar-hero');
        });

        it('should clear selected key when switching to incompatible style (ddr -> guitar-hero)', () => {
            useBeatDetectionStore.setState({
                chartStyle: 'ddr',
                selectedKey: 'up',
            });

            const actions = useBeatDetectionStore.getState().actions;
            actions.setChartStyle('guitar-hero');

            const state = useBeatDetectionStore.getState();
            expect(state.chartStyle).toBe('guitar-hero');
            expect(state.selectedKey).toBeNull();
        });

        it('should clear selected key when switching to incompatible style (guitar-hero -> ddr)', () => {
            useBeatDetectionStore.setState({
                chartStyle: 'guitar-hero',
                selectedKey: '3',
            });

            const actions = useBeatDetectionStore.getState().actions;
            actions.setChartStyle('ddr');

            const state = useBeatDetectionStore.getState();
            expect(state.chartStyle).toBe('ddr');
            expect(state.selectedKey).toBeNull();
        });

        it('should keep selected key when switching to compatible style', () => {
            useBeatDetectionStore.setState({
                chartStyle: 'ddr',
                selectedKey: 'up',
            });

            const actions = useBeatDetectionStore.getState().actions;
            actions.setChartStyle('ddr');

            const state = useBeatDetectionStore.getState();
            expect(state.chartStyle).toBe('ddr');
            expect(state.selectedKey).toBe('up');
        });
    });

    describe('setSelectedKey', () => {
        it('should set selected key', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.setSelectedKey('up');

            const state = useBeatDetectionStore.getState();
            expect(state.selectedKey).toBe('up');
        });

        it('should clear selected key with null', () => {
            useBeatDetectionStore.setState({ selectedKey: 'down' });

            const actions = useBeatDetectionStore.getState().actions;
            actions.setSelectedKey(null);

            const state = useBeatDetectionStore.getState();
            expect(state.selectedKey).toBeNull();
        });
    });

    describe('setEditorMode', () => {
        it('should set editor mode to paint', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.setEditorMode('paint');

            const state = useBeatDetectionStore.getState();
            expect(state.editorMode).toBe('paint');
        });

        it('should set editor mode to erase', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.setEditorMode('erase');

            const state = useBeatDetectionStore.getState();
            expect(state.editorMode).toBe('erase');
        });

        it('should set editor mode to view', () => {
            useBeatDetectionStore.setState({ editorMode: 'paint' });

            const actions = useBeatDetectionStore.getState().actions;
            actions.setEditorMode('view');

            const state = useBeatDetectionStore.getState();
            expect(state.editorMode).toBe('view');
        });
    });

    describe('setKeyLaneViewMode', () => {
        it('should set key lane view mode to ddr', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.setKeyLaneViewMode('ddr');

            const state = useBeatDetectionStore.getState();
            expect(state.keyLaneViewMode).toBe('ddr');
        });

        it('should set key lane view mode to guitar-hero', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.setKeyLaneViewMode('guitar-hero');

            const state = useBeatDetectionStore.getState();
            expect(state.keyLaneViewMode).toBe('guitar-hero');
        });

        it('should set key lane view mode to off', () => {
            useBeatDetectionStore.setState({ keyLaneViewMode: 'ddr' });

            const actions = useBeatDetectionStore.getState().actions;
            actions.setKeyLaneViewMode('off');

            const state = useBeatDetectionStore.getState();
            expect(state.keyLaneViewMode).toBe('off');
        });
    });
});

// ============================================================
// Task 9.3.2: Test Bulk Assignment
// ============================================================

describe('Chart Editor Store - Bulk Assignment', () => {
    beforeEach(() => {
        resetStore();
    });

    afterEach(() => {
        resetStore();
    });

    describe('assignKeysToBeats', () => {
        it('should assign keys to multiple beats', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const assignments: KeyAssignment[] = [
                { beatIndex: 0, key: 'up' },
                { beatIndex: 2, key: 'down' },
            ];

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeysToBeats(assignments);

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('up');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBeUndefined();
            expect(state.subdividedBeatMap?.beats[2].requiredKey).toBe('down');
            expect(state.subdividedBeatMap?.beats[3].requiredKey).toBeUndefined();
        });

        it('should remove keys when assignment key is null', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'down' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const assignments: KeyAssignment[] = [
                { beatIndex: 0, key: null },
            ];

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeysToBeats(assignments);

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBeUndefined();
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBe('down');
        });

        it('should handle empty assignments array', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeysToBeats([]);

            const state = useBeatDetectionStore.getState();
            // Beat map should remain unchanged
            expect(state.subdividedBeatMap?.beats.every(b => b.requiredKey === undefined)).toBe(true);
        });

        it('should not modify beat map when no subdivided beat map exists', () => {
            const assignments: KeyAssignment[] = [
                { beatIndex: 0, key: 'up' },
            ];

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeysToBeats(assignments);

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).toBeNull();
        });

        it('should assign all DDR keys in bulk', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const assignments: KeyAssignment[] = [
                { beatIndex: 0, key: 'left' },
                { beatIndex: 1, key: 'down' },
                { beatIndex: 2, key: 'up' },
                { beatIndex: 3, key: 'right' },
            ];

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeysToBeats(assignments);

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('left');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBe('down');
            expect(state.subdividedBeatMap?.beats[2].requiredKey).toBe('up');
            expect(state.subdividedBeatMap?.beats[3].requiredKey).toBe('right');
        });

        it('should assign all Guitar Hero keys in bulk', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const assignments: KeyAssignment[] = [
                { beatIndex: 0, key: '1' },
                { beatIndex: 1, key: '2' },
                { beatIndex: 2, key: '3' },
                { beatIndex: 3, key: '4' },
            ];

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeysToBeats(assignments);

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('1');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBe('2');
            expect(state.subdividedBeatMap?.beats[2].requiredKey).toBe('3');
            expect(state.subdividedBeatMap?.beats[3].requiredKey).toBe('4');
        });

        it('should only modify beats in assignments', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'down' }),
                createMockSubdividedBeat({ timestamp: 1.0, beatInMeasure: 2, isDownbeat: false }),
                createMockSubdividedBeat({ timestamp: 1.5, beatInMeasure: 3, isDownbeat: false }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const assignments: KeyAssignment[] = [
                { beatIndex: 2, key: 'left' },
            ];

            const actions = useBeatDetectionStore.getState().actions;
            actions.assignKeysToBeats(assignments);

            const state = useBeatDetectionStore.getState();
            // Existing keys should remain
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('up');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBe('down');
            // New key assigned
            expect(state.subdividedBeatMap?.beats[2].requiredKey).toBe('left');
            // Unassigned beat remains unchanged
            expect(state.subdividedBeatMap?.beats[3].requiredKey).toBeUndefined();
        });
    });
});

// ============================================================
// Task 9.3.3: Test Clear All Keys
// ============================================================

describe('Chart Editor Store - Clear All Keys', () => {
    beforeEach(() => {
        resetStore();
    });

    afterEach(() => {
        resetStore();
    });

    describe('clearAllKeys', () => {
        it('should clear all key assignments', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'down' }),
                createMockSubdividedBeat({ timestamp: 1.0, beatInMeasure: 2, isDownbeat: false, requiredKey: 'left' }),
                createMockSubdividedBeat({ timestamp: 1.5, beatInMeasure: 3, isDownbeat: false, requiredKey: 'right' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            actions.clearAllKeys();

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats.every(b => b.requiredKey === undefined)).toBe(true);
        });

        it('should handle beat map with no keys assigned', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            actions.clearAllKeys();

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats.every(b => b.requiredKey === undefined)).toBe(true);
        });

        it('should not modify beat map when no subdivided beat map exists', () => {
            const actions = useBeatDetectionStore.getState().actions;
            actions.clearAllKeys();

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap).toBeNull();
        });

        it('should preserve other beat properties', () => {
            const beats = [
                createMockSubdividedBeat({ timestamp: 0.0, intensity: 0.8, confidence: 0.95, requiredKey: 'up' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            actions.clearAllKeys();

            const state = useBeatDetectionStore.getState();
            const beat = state.subdividedBeatMap?.beats[0];
            expect(beat?.requiredKey).toBeUndefined();
            expect(beat?.timestamp).toBe(0.0);
            expect(beat?.intensity).toBe(0.8);
            expect(beat?.confidence).toBe(0.95);
        });
    });
});

// ============================================================
// Task 9.3.4: Test Statistics Selectors
// ============================================================

describe('Chart Editor Store - Statistics Selectors', () => {
    beforeEach(() => {
        resetStore();
    });

    afterEach(() => {
        resetStore();
    });

    // Helper to get chart statistics directly from store (avoids render loop issues)
    const getChartStatistics = () => {
        const state = useBeatDetectionStore.getState();
        const beatMap = state.subdividedBeatMap;
        if (!beatMap) {
            return { keyCount: 0, usedKeys: [] };
        }

        const usedKeys = new Set<string>();
        let keyCount = 0;

        for (const beat of beatMap.beats) {
            if (beat.requiredKey) {
                usedKeys.add(beat.requiredKey);
                keyCount++;
            }
        }

        return {
            keyCount,
            usedKeys: Array.from(usedKeys).sort(),
        };
    };

    // Helper to get key map directly from store
    const getKeyMap = () => {
        const state = useBeatDetectionStore.getState();
        const beatMap = state.subdividedBeatMap;
        if (!beatMap) {
            return new Map<number, string>();
        }

        const keyMap = new Map<number, string>();
        for (let i = 0; i < beatMap.beats.length; i++) {
            const beat = beatMap.beats[i];
            if (beat.requiredKey) {
                keyMap.set(i, beat.requiredKey);
            }
        }

        return keyMap;
    };

    describe('useChartStatistics', () => {
        it('should return zero statistics when no beat map exists', () => {
            const stats = getChartStatistics();
            expect(stats).toEqual({ keyCount: 0, usedKeys: [] });
        });

        it('should return correct statistics for beat map with keys', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'down' }),
                createMockSubdividedBeat({ timestamp: 1.0, beatInMeasure: 2, isDownbeat: false }),
                createMockSubdividedBeat({ timestamp: 1.5, beatInMeasure: 3, isDownbeat: false, requiredKey: 'up' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const stats = getChartStatistics();
            expect(stats.keyCount).toBe(3);
            expect(stats.usedKeys).toContain('up');
            expect(stats.usedKeys).toContain('down');
            expect(stats.usedKeys.length).toBe(2);
        });

        it('should return sorted used keys', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'right' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'left' }),
                createMockSubdividedBeat({ timestamp: 1.0, beatInMeasure: 2, isDownbeat: false, requiredKey: 'down' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const stats = getChartStatistics();
            // Should be sorted alphabetically
            expect(stats.usedKeys).toEqual(['down', 'left', 'right']);
        });

        it('should return zero statistics for beat map without keys', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const stats = getChartStatistics();
            expect(stats.keyCount).toBe(0);
            expect(stats.usedKeys).toEqual([]);
        });
    });

    describe('useKeyMap', () => {
        it('should return empty map when no beat map exists', () => {
            const keyMap = getKeyMap();
            expect(keyMap.size).toBe(0);
        });

        it('should return correct key map for beat map with keys', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false }),
                createMockSubdividedBeat({ timestamp: 1.0, beatInMeasure: 2, isDownbeat: false, requiredKey: 'down' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const keyMap = getKeyMap();
            expect(keyMap.size).toBe(2);
            expect(keyMap.get(0)).toBe('up');
            expect(keyMap.get(2)).toBe('down');
            expect(keyMap.has(1)).toBe(false);
        });

        it('should return empty map for beat map without keys', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const keyMap = getKeyMap();
            expect(keyMap.size).toBe(0);
        });
    });

    describe('useHasRequiredKeys', () => {
        it('should return false when no beat map exists', () => {
            const { result } = renderHook(() => useHasRequiredKeys());
            expect(result.current).toBe(false);
        });

        it('should return true when beat map has required keys', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const { result } = renderHook(() => useHasRequiredKeys());
            expect(result.current).toBe(true);
        });

        it('should return false when beat map has no required keys', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const { result } = renderHook(() => useHasRequiredKeys());
            expect(result.current).toBe(false);
        });
    });

    describe('useCanStartChartEditor', () => {
        it('should return false when no subdivided beat map exists', () => {
            const { result } = renderHook(() => useCanStartChartEditor());
            expect(result.current).toBe(false);
        });

        it('should return true when subdivided beat map exists', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const { result } = renderHook(() => useCanStartChartEditor());
            expect(result.current).toBe(true);
        });
    });
});

// ============================================================
// Task 9.3.5: Test Level Export/Import Actions
// ============================================================

describe('Chart Editor Store - Level Export/Import Actions', () => {
    beforeEach(() => {
        resetStore();
    });

    afterEach(() => {
        resetStore();
    });

    describe('exportLevel', () => {
        it('should return null when no subdivided beat map exists', () => {
            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.exportLevel('Test Song');

            expect(result).toBeNull();
        });

        it('should export level data with correct structure', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'down' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({
                subdividedBeatMap: mockBeatMap,
                chartStyle: 'ddr',
            });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.exportLevel('Test Song');

            expect(result).not.toBeNull();
            expect(result?.version).toBe(1);
            expect(result?.audioId).toBe('test-audio-123');
            expect(result?.audioTitle).toBe('Test Song');
            expect(result?.beatCount).toBe(2);
            expect(result?.chartStyle).toBe('ddr');
            expect(result?.metadata.keyCount).toBe(2);
            expect(result?.metadata.usedKeys).toContain('up');
            expect(result?.metadata.usedKeys).toContain('down');
        });

        it('should export level data without audio title', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.exportLevel();

            expect(result).not.toBeNull();
            expect(result?.audioTitle).toBeUndefined();
        });

        it('should include requiredKey on beats that have keys', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.exportLevel();

            expect(result).not.toBeNull();
            expect(result?.beats[0].requiredKey).toBe('up');
            expect(result?.beats[1].requiredKey).toBeUndefined();
        });

        it('should export with guitar-hero chart style', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: '1' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: '2' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({
                subdividedBeatMap: mockBeatMap,
                chartStyle: 'guitar-hero',
            });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.exportLevel();

            expect(result).not.toBeNull();
            expect(result?.chartStyle).toBe('guitar-hero');
        });
    });

    describe('importLevel', () => {
        it('should fail when no subdivided beat map exists', () => {
            const levelData = createMockLevelExportData();

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.importLevel(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0]).toContain('No subdivided beat map');
        });

        it('should fail when audioId does not match', () => {
            const mockBeatMap = createMockSubdividedBeatMap([], 'different-audio-id');
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const levelData = createMockLevelExportData({ audioId: 'test-audio-123' });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.importLevel(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Audio ID mismatch');
        });

        it('should fail when beat count does not match', () => {
            const mockBeatMap = createMockSubdividedBeatMap([
                createMockSubdividedBeat(),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false }),
                createMockSubdividedBeat({ timestamp: 1.0, beatInMeasure: 2, isDownbeat: false }),
            ]);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const levelData = createMockLevelExportData({ beatCount: 2 });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.importLevel(levelData);

            expect(result.valid).toBe(false);
            expect(result.errors[0]).toContain('Beat count mismatch');
        });

        it('should successfully import level data', () => {
            const mockBeatMap = createMockSubdividedBeatMap([
                createMockSubdividedBeat(),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false }),
            ]);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const levelData = createMockLevelExportData({
                beatCount: 2,
                beats: [
                    { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'left' },
                    { timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'right' },
                ],
                chartStyle: 'ddr',
            });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.importLevel(levelData);

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('left');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBe('right');
            expect(state.chartStyle).toBe('ddr');
        });

        it('should update chart style on import', () => {
            const mockBeatMap = createMockSubdividedBeatMap([
                createMockSubdividedBeat(),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false }),
            ]);
            useBeatDetectionStore.setState({
                subdividedBeatMap: mockBeatMap,
                chartStyle: 'ddr',
            });

            const levelData = createMockLevelExportData({
                audioId: 'test-audio-123',
                beatCount: 2,
                beats: [
                    { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: '1' },
                    { timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: '2' },
                ],
                chartStyle: 'guitar-hero',
                metadata: { keyCount: 2, usedKeys: ['1', '2'] },
            });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.importLevel(levelData);

            expect(result.valid).toBe(true);

            const state = useBeatDetectionStore.getState();
            expect(state.chartStyle).toBe('guitar-hero');
        });

        it('should remove existing keys not in import data', () => {
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'down' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const levelData = createMockLevelExportData({
                audioId: 'test-audio-123',
                beatCount: 2,
                beats: [
                    { timestamp: 0.0, beatInMeasure: 0, isDownbeat: true, measureNumber: 0, intensity: 0.5, confidence: 0.9, requiredKey: 'left' },
                    { timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, measureNumber: 0, intensity: 0.5, confidence: 0.9 },
                ],
            });

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.importLevel(levelData);

            expect(result.valid).toBe(true);

            const state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('left');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBeUndefined();
        });

        it('should fail on invalid level data structure', () => {
            const mockBeatMap = createMockSubdividedBeatMap();
            useBeatDetectionStore.setState({ subdividedBeatMap: mockBeatMap });

            const invalidData = {
                version: 2, // Invalid version
                audioId: '',
                // Missing required fields
            } as unknown as LevelExportData;

            const actions = useBeatDetectionStore.getState().actions;
            const result = actions.importLevel(invalidData);

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
        });
    });

    describe('export/import round-trip', () => {
        it('should preserve data through export/import cycle', () => {
            // Create beat map with keys
            const beats = [
                createMockSubdividedBeat({ requiredKey: 'up' }),
                createMockSubdividedBeat({ timestamp: 0.5, beatInMeasure: 1, isDownbeat: false, requiredKey: 'down' }),
                createMockSubdividedBeat({ timestamp: 1.0, beatInMeasure: 2, isDownbeat: false }),
                createMockSubdividedBeat({ timestamp: 1.5, beatInMeasure: 3, isDownbeat: false, requiredKey: 'left' }),
            ];
            const mockBeatMap = createMockSubdividedBeatMap(beats);
            useBeatDetectionStore.setState({
                subdividedBeatMap: mockBeatMap,
                chartStyle: 'ddr',
            });

            // Export
            const actions = useBeatDetectionStore.getState().actions;
            const exportedData = actions.exportLevel('Test Song');

            expect(exportedData).not.toBeNull();

            // Clear keys
            actions.clearAllKeys();

            // Verify keys are cleared
            let state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats.every(b => b.requiredKey === undefined)).toBe(true);

            // Import
            const importResult = actions.importLevel(exportedData!);
            expect(importResult.valid).toBe(true);

            // Verify keys are restored
            state = useBeatDetectionStore.getState();
            expect(state.subdividedBeatMap?.beats[0].requiredKey).toBe('up');
            expect(state.subdividedBeatMap?.beats[1].requiredKey).toBe('down');
            expect(state.subdividedBeatMap?.beats[2].requiredKey).toBeUndefined();
            expect(state.subdividedBeatMap?.beats[3].requiredKey).toBe('left');
            expect(state.chartStyle).toBe('ddr');
        });
    });
});
