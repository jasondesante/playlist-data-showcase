/**
 * Tests for BeatMapSummary Multi-Tempo Edge Cases
 *
 * Task 5.4: Test Edge Cases
 * - Very short tracks with tempo changes
 * - Tracks with 3+ tempo sections
 * - Tracks with subtle tempo drift (should NOT trigger multi-tempo)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BeatMapSummary } from './BeatMapSummary';
import type { BeatMap, TempoSection } from '@/types';

// Mock the store hooks
vi.mock('../../store/beatDetectionStore', () => ({
  useInterpolationStatistics: vi.fn(),
  useIsDownbeatSelectionMode: vi.fn(() => false),
  useTimeSignature: vi.fn(() => 4),
  useShowMeasureBoundaries: vi.fn(() => false),
  useInterpolationVisualizationData: vi.fn(() => null),
  useShowGridOverlay: vi.fn(() => false),
  useShowTempoDriftVisualization: vi.fn(() => false),
  useBeatDetectionStore: vi.fn(() => ({
    actions: {
      setDownbeatPosition: vi.fn(),
    },
  })),
}));

// Mock child components
vi.mock('./DownbeatConfigPanel', () => ({
  DownbeatConfigPanel: vi.fn(() => null),
}));

vi.mock('./BeatTimeline', () => ({
  BeatTimeline: vi.fn(() => null),
}));

vi.mock('./Tooltip', () => ({
  Tooltip: vi.fn(() => <span data-testid="tooltip">Info</span>),
}));

vi.mock('./Button', () => ({
  Button: vi.fn(({ children, onClick, disabled }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )),
}));

import {
  useInterpolationStatistics,
} from '../../store/beatDetectionStore';

// Helper to create a basic beat map
function createMockBeatMap(overrides: Partial<BeatMap> = {}): BeatMap {
  return {
    beats: [
      { timestamp: 0, confidence: 0.9 },
      { timestamp: 0.5, confidence: 0.85 },
      { timestamp: 1.0, confidence: 0.9 },
      { timestamp: 1.5, confidence: 0.88 },
      { timestamp: 2.0, confidence: 0.92 },
    ],
    bpm: 120,
    duration: 180,
    metadata: {
      sensitivity: 1.0,
      filter: 0.0,
    },
    ...overrides,
  };
}

// Helper to create interpolation statistics
function createMockInterpolationStats(overrides: Partial<ReturnType<typeof useInterpolationStatistics>> = {}) {
  return {
    detectedBeatCount: 100,
    interpolatedBeatCount: 50,
    totalBeatCount: 150,
    interpolationRatio: 0.33,
    avgInterpolatedConfidence: 0.85,
    confidenceLevel: 'high' as const,
    quarterNoteBpm: 120,
    quarterNoteConfidence: 0.9,
    tempoDriftRatio: 0.05,
    gridAlignmentScore: 0.95,
    confidenceWeights: {
      gridAlignment: 0.4,
      anchorConfidence: 0.35,
      paceConfidence: 0.25,
    },
    quarterNoteDetection: {
      method: 'histogram' as const,
      denseSectionCount: 5,
      denseSectionBeats: 80,
      secondaryPeaks: [],
    },
    // Multi-tempo fields
    hasMultipleTempos: false,
    detectedClusterTempos: [],
    tempoSections: null,
    hasMultiTempoApplied: false,
    ...overrides,
  };
}

describe('BeatMapSummary Multi-Tempo Edge Cases (Task 5.4)', () => {
  const mockOnStartPractice = vi.fn();
  const mockedUseInterpolationStatistics = vi.mocked(useInterpolationStatistics);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseInterpolationStatistics.mockReturnValue(createMockInterpolationStats());
  });

  describe('Very Short Tracks with Tempo Changes', () => {
    it('handles short tracks with 2 tempo sections gracefully', () => {
      // Short track: 30 seconds total with 2 sections
      const shortDuration = 30;
      const tempoSections: TempoSection[] = [
        { start: 0, end: 15, bpm: 128, beatCount: 32 },
        { start: 15, end: 30, bpm: 140, beatCount: 35 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [128, 140],
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap({ duration: shortDuration })}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should still show sections display
      expect(screen.getByText(/Tempo Sections/)).toBeInTheDocument();
      expect(screen.getByText(/2 sections detected/)).toBeInTheDocument();

      // Timeline should render with short sections
      const segments = container.querySelectorAll('.beat-map-tempo-timeline-segment');
      expect(segments).toHaveLength(2);

      // Verify proportions are correct for short duration
      // Each segment should be 50% (15s / 30s)
      const firstWidth = parseFloat(segments[0].getAttribute('style')?.match(/width:\s*([\d.]+)%/)?.[1] ?? '0');
      expect(firstWidth).toBeCloseTo(50, 1);
    });

    it('handles very short sections (< 10 seconds) with proper formatting', () => {
      // Track with very short sections
      const tempoSections: TempoSection[] = [
        { start: 0, end: 5, bpm: 120, beatCount: 10 },
        { start: 5, end: 10, bpm: 140, beatCount: 12 },
        { start: 10, end: 20, bpm: 160, beatCount: 16 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [120, 140, 160],
          tempoSections,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap({ duration: 20 })}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should display short section times correctly (0:00 - 0:05, 0:05 - 0:10, etc.)
      expect(screen.getByText(/0:00 - 0:05/)).toBeInTheDocument();
      expect(screen.getByText(/0:05 - 0:10/)).toBeInTheDocument();
      expect(screen.getByText(/0:10 - 0:20/)).toBeInTheDocument();
    });

    it('handles single-beat sections without crashing', () => {
      // Edge case: sections with minimal beats (though engine typically requires 4+)
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 128, beatCount: 192 },
        { start: 90, end: 95, bpm: 140, beatCount: 1 }, // Very short section
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [128, 140],
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap({ duration: 95 })}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should render without crashing
      expect(container.querySelector('.beat-map-tempo-sections')).toBeInTheDocument();
    });
  });

  describe('Tracks with 3+ Tempo Sections', () => {
    it('displays 3 tempo sections correctly', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 60, bpm: 100, beatCount: 100 },
        { start: 60, end: 120, bpm: 120, beatCount: 120 },
        { start: 120, end: 180, bpm: 140, beatCount: 140 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [100, 120, 140],
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should show 3 sections
      expect(screen.getByText(/3 sections detected/)).toBeInTheDocument();

      // All three section headers should be present
      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
      expect(screen.getByText('Section 3')).toBeInTheDocument();

      // Timeline should have 3 segments
      const segments = container.querySelectorAll('.beat-map-tempo-timeline-segment');
      expect(segments).toHaveLength(3);

      // Should have 2 boundary lines (n-1)
      const boundaries = container.querySelectorAll('.beat-map-tempo-timeline-boundary');
      expect(boundaries).toHaveLength(2);
    });

    it('displays 4 tempo sections with correct proportions', () => {
      // 4 sections with varying durations
      const tempoSections: TempoSection[] = [
        { start: 0, end: 30, bpm: 90, beatCount: 45 },
        { start: 30, end: 90, bpm: 120, beatCount: 120 },
        { start: 90, end: 150, bpm: 140, beatCount: 140 },
        { start: 150, end: 180, bpm: 110, beatCount: 55 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [90, 120, 140, 110],
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should show 4 sections
      expect(screen.getByText(/4 sections detected/)).toBeInTheDocument();

      // Timeline segments
      const segments = container.querySelectorAll('.beat-map-tempo-timeline-segment');
      expect(segments).toHaveLength(4);

      // Verify proportions (30/180 = 16.67%, 60/180 = 33.33%, 60/180 = 33.33%, 30/180 = 16.67%)
      const widths = Array.from(segments).map(seg =>
        parseFloat(seg.getAttribute('style')?.match(/width:\s*([\d.]+)%/)?.[1] ?? '0')
      );

      expect(widths[0]).toBeCloseTo(16.67, 1);
      expect(widths[1]).toBeCloseTo(33.33, 1);
      expect(widths[2]).toBeCloseTo(33.33, 1);
      expect(widths[3]).toBeCloseTo(16.67, 1);

      // 3 boundary lines for 4 sections
      const boundaries = container.querySelectorAll('.beat-map-tempo-timeline-boundary');
      expect(boundaries).toHaveLength(3);
    });

    it('handles 5+ tempo sections without performance issues', () => {
      // Stress test with 5 sections
      const tempoSections: TempoSection[] = [
        { start: 0, end: 36, bpm: 100, beatCount: 60 },
        { start: 36, end: 72, bpm: 110, beatCount: 66 },
        { start: 72, end: 108, bpm: 120, beatCount: 72 },
        { start: 108, end: 144, bpm: 130, beatCount: 78 },
        { start: 144, end: 180, bpm: 140, beatCount: 84 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [100, 110, 120, 130, 140],
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should show 5 sections
      expect(screen.getByText(/5 sections detected/)).toBeInTheDocument();

      // All 5 section headers
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Section ${i}`)).toBeInTheDocument();
      }

      // 5 timeline segments
      const segments = container.querySelectorAll('.beat-map-tempo-timeline-segment');
      expect(segments).toHaveLength(5);

      // 4 boundary lines
      const boundaries = container.querySelectorAll('.beat-map-tempo-timeline-boundary');
      expect(boundaries).toHaveLength(4);
    });

    it('displays all BPM labels correctly for many sections', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 45, bpm: 95, beatCount: 71 },
        { start: 45, end: 90, bpm: 105, beatCount: 79 },
        { start: 90, end: 135, bpm: 115, beatCount: 86 },
        { start: 135, end: 180, bpm: 125, beatCount: 94 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [95, 105, 115, 125],
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Check all BPM labels are displayed
      const bpmLabels = container.querySelectorAll('.beat-map-tempo-timeline-bpm');
      expect(bpmLabels).toHaveLength(4);

      const displayedBpms = Array.from(bpmLabels).map(el => el.textContent);
      expect(displayedBpms).toContain('95');
      expect(displayedBpms).toContain('105');
      expect(displayedBpms).toContain('115');
      expect(displayedBpms).toContain('125');
    });
  });

  describe('Tracks with Subtle Tempo Drift (Should NOT Trigger Multi-Tempo)', () => {
    it('does NOT show multi-tempo when tempos are within 10% threshold', () => {
      // 120 BPM and 128 BPM differ by ~6.7% (within 10% threshold)
      // Engine should NOT flag this as multi-tempo
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: false,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [], // Engine filters out similar tempos
          tempoSections: null,
          quarterNoteBpm: 120,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should NOT show detection banner
      expect(screen.queryByText(/Multiple tempos detected:/)).not.toBeInTheDocument();

      // Should NOT show sections display
      expect(screen.queryByText(/Tempo Sections/)).not.toBeInTheDocument();

      // Should show "No" for multi-tempo
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('does NOT show multi-tempo for gradual drift (118-122 BPM range)', () => {
      // Even if detected tempos are 118, 120, 122 - they're all within 10%
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: false,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [], // Filtered out by engine
          tempoSections: null,
          quarterNoteBpm: 120,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should NOT show multi-tempo UI
      expect(screen.queryByText(/Multiple tempos detected:/)).not.toBeInTheDocument();
      expect(screen.queryByText(/sections detected/)).not.toBeInTheDocument();
    });

    it('shows multi-tempo when tempos differ by exactly more than 10%', () => {
      // 120 BPM and 134 BPM differ by ~11.7% (above 10% threshold)
      // Engine SHOULD flag this as multi-tempo
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 120, beatCount: 180 },
        { start: 90, end: 180, bpm: 134, beatCount: 201 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [120, 134],
          tempoSections,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // SHOULD show sections
      expect(screen.getByText(/2 sections detected/)).toBeInTheDocument();
    });

    it('handles boundary case: tempos at exactly 10% difference', () => {
      // 120 BPM and 132 BPM differ by exactly 10%
      // The threshold is > 10%, so exactly 10% should NOT trigger
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: false,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [],
          tempoSections: null,
          quarterNoteBpm: 120,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should NOT show multi-tempo (exactly 10% is not > 10%)
      expect(screen.queryByText(/Multiple tempos detected:/)).not.toBeInTheDocument();
    });

    it('shows detection banner but no sections when tempos detected but not applied', () => {
      // Case: tempos differ significantly but analysis hasn't been applied yet
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [100, 140], // 40% difference - clearly multi-tempo
          tempoSections: null,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should show detection banner
      expect(screen.getByText(/Multiple tempos detected:/)).toBeInTheDocument();
      expect(screen.getByText(/100, 140/)).toBeInTheDocument();

      // Should NOT show sections (not applied yet)
      expect(screen.queryByText(/sections detected/)).not.toBeInTheDocument();
    });

    it('distinguishes between subtle drift and actual tempo change', () => {
      // Subtle drift (119-122 BPM) vs actual change (120 -> 140 BPM)
      // First case: should NOT trigger
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: false,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [],
          tempoSections: null,
          quarterNoteBpm: 120,
        })
      );

      const { rerender } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      expect(screen.queryByText(/Tempo Sections/)).not.toBeInTheDocument();

      // Second case: SHOULD trigger (20 BPM difference is > 10% of 120)
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 120, beatCount: 180 },
        { start: 90, end: 180, bpm: 140, beatCount: 210 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [120, 140],
          tempoSections,
        })
      );

      rerender(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Now should show sections
      expect(screen.getByText(/2 sections detected/)).toBeInTheDocument();
    });
  });

  describe('Edge Case: Octave-Related Tempos', () => {
    it('does NOT treat octave multiples as different tempos', () => {
      // 60 BPM and 120 BPM are octave multiples (half/double)
      // Engine filters these out, so should NOT show as multi-tempo
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: false,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [], // Engine filters octave multiples
          tempoSections: null,
          quarterNoteBpm: 120,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should NOT show multi-tempo UI
      expect(screen.queryByText(/Multiple tempos detected:/)).not.toBeInTheDocument();
    });
  });

  describe('Edge Case: Empty or Null Sections', () => {
    it('handles null tempoSections gracefully', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections: null,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should NOT crash or show sections display
      expect(screen.queryByText(/Tempo Sections/)).not.toBeInTheDocument();
    });

    it('handles empty tempoSections array gracefully', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: false,
          hasMultiTempoApplied: true,
          tempoSections: [],
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should NOT show sections display
      expect(screen.queryByText(/Tempo Sections/)).not.toBeInTheDocument();
    });
  });
});
