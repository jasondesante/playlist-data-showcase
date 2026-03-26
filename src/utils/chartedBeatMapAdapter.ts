/**
 * ChartedBeatMap Adapter
 *
 * Converts ChartedBeatMap to BeatMap format for compatibility with BeatStream.
 * This enables the auto-generated levels to use the existing practice mode infrastructure.
 *
 * Task 8.2: BeatStream Practice Mode Integration
 */

import type { BeatMap, Beat, ChartedBeatMap, SubdividedBeatMap, SubdividedBeat, SubdivisionConfig, SubdivisionMetadata } from 'playlist-data-engine';

/**
 * Convert a ChartedBeatMap to a BeatMap-compatible format.
 *
 * ChartedBeatMap is the output of the level generator with button assignments.
 * BeatMap is the format expected by BeatStream for practice mode.
 * Since ChartedBeat extends Beat, the beats array is directly compatible.
 *
 * @param chart - The ChartedBeatMap to convert
 * @returns A BeatMap-compatible object for use with BeatStream
 */
export function chartedBeatMapToBeatMap(chart: ChartedBeatMap): BeatMap {
    return {
        audioId: chart.audioId,
        duration: chart.duration,
        beats: chart.beats as Beat[], // ChartedBeat extends Beat, so this is safe
        bpm: chart.bpm,
        metadata: {
            version: '1.0.0',
            algorithm: 'procedural-generation',
            minBpm: chart.bpm,
            maxBpm: chart.bpm,
            sensitivity: 1.0,
            filter: 0,
            noiseFloorThreshold: 0,
            hopSizeMs: 4,
            fftSize: 2048,
            dpAlpha: 680,
            melBands: 40,
            highPassCutoff: 1.0,
            gaussianSmoothMs: 20,
            tempoCenter: 0.5,
            tempoWidth: 1.4,
            useOctaveResolution: false,
            useTripleMeter: false,
            generatedAt: new Date().toISOString(),
        },
        downbeatConfig: chart.downbeatConfig,
    };
}

/**
 * Convert a ChartedBeatMap to SubdividedBeatMap format.
 *
 * KeyLaneView's prop type requires SubdividedBeatMap, but at runtime it only uses
 * beat.timestamp, beat.requiredKey, and beatMap.beats.length (base Beat fields).
 * This adapter maps ChartedBeat fields to SubdividedBeat fields with sensible defaults.
 *
 * @param chart - The ChartedBeatMap to convert
 * @returns A SubdividedBeatMap-compatible object for use with KeyLaneView
 */
export function chartedBeatMapToSubdividedBeatMap(chart: ChartedBeatMap): SubdividedBeatMap {
    const detectedIndices = chart.beats
        .map((beat, index) => beat.isDetected ? index : -1)
        .filter((index) => index >= 0);

    const subdivisionConfig: SubdivisionConfig = {
        beatSubdivisions: new Map(),
        defaultSubdivision: 'quarter',
    };

    const subdivisionMetadata: SubdivisionMetadata = {
        originalBeatCount: chart.beats.length,
        subdividedBeatCount: chart.beats.length,
        averageDensityMultiplier: 1.0,
        explicitBeatCount: 0,
        subdivisionsUsed: ['quarter'],
        hasMultipleTempos: false,
        maxDensity: 1.0,
    };

    return {
        audioId: chart.audioId,
        duration: chart.duration,
        beats: chart.beats as SubdividedBeat[],
        detectedBeatIndices: detectedIndices,
        subdivisionConfig,
        downbeatConfig: chart.downbeatConfig,
        subdivisionMetadata,
    };
}
