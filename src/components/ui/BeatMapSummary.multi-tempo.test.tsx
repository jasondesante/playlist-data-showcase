/**
 * Tests for BeatMapSummary Multi-Tempo Display
 *
 * Task 5.2: Test Multi-Tempo Tracks
 * - Verify detection banner appears when multiple tempos detected
 * - Verify sections display correctly after analysis
 * - Verify timeline markers show correct proportions
 * - Verify practice mode shows multi-tempo info
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

// Helper to create tempo sections
function createMockTempoSections(): TempoSection[] {
  return [
    {
      start: 0,
      end: 90,
      bpm: 128,
      beatCount: 192,
    },
    {
      start: 90,
      end: 180,
      bpm: 140,
      beatCount: 210,
    },
  ];
}

describe('BeatMapSummary Multi-Tempo Display (Task 5.2)', () => {
  const mockOnStartPractice = vi.fn();
  const mockedUseInterpolationStatistics = vi.mocked(useInterpolationStatistics);

  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseInterpolationStatistics.mockReturnValue(createMockInterpolationStats());
  });

  describe('Detection Banner (Task 5.2.1)', () => {
    it('shows detection banner when hasMultipleTempos is true and hasMultiTempoApplied is false', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [128, 140],
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Banner should be visible
      expect(screen.getByText(/Multiple tempos detected:/)).toBeInTheDocument();
      expect(screen.getByText(/128, 140/)).toBeInTheDocument();
    });

    it('displays the detected tempos in the banner', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [100, 120, 140],
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // All three tempos should be displayed
      expect(screen.getByText(/100, 120, 140/)).toBeInTheDocument();
    });

    it('hides detection banner when hasMultiTempoApplied is true', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [128, 140],
          tempoSections: createMockTempoSections(),
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Banner should NOT be visible - sections display should be shown instead
      expect(screen.queryByText(/Multiple tempos detected:/)).not.toBeInTheDocument();
    });

    it('hides detection banner when hasMultipleTempos is false', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: false,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [],
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Banner should NOT be visible
      expect(screen.queryByText(/Multiple tempos detected:/)).not.toBeInTheDocument();
    });

    it('includes a tooltip explaining the detection', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: false,
          detectedClusterTempos: [128, 140],
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Tooltip should be present
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    });
  });

  describe('Tempo Sections Display (Task 5.2.2)', () => {
    it('shows tempo sections when hasMultiTempoApplied is true and sections exist', () => {
      const tempoSections = createMockTempoSections();
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          detectedClusterTempos: [128, 140],
          tempoSections,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Section header should be visible
      expect(screen.getByText(/Tempo Sections/)).toBeInTheDocument();
      expect(screen.getByText(/2 sections detected/)).toBeInTheDocument();
    });

    it('displays section details correctly', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 128, beatCount: 192 },
        { start: 90, end: 180, bpm: 140, beatCount: 210 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Section 1 details
      expect(screen.getByText('Section 1')).toBeInTheDocument();

      // Section 2 details
      expect(screen.getByText('Section 2')).toBeInTheDocument();

      // Verify BPM values appear in section cards
      const sectionBpms = container.querySelectorAll('.beat-map-tempo-section-bpm');
      expect(sectionBpms).toHaveLength(2);
      expect(sectionBpms[0].textContent).toBe('128');
      expect(sectionBpms[1].textContent).toBe('140');
    });

    it('displays duration range for each section', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 128, beatCount: 192 },
        { start: 90, end: 180, bpm: 140, beatCount: 210 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Duration format: "0:00 - 1:30" for first section, "1:30 - 3:00" for second
      // Format is MM:SS
      expect(screen.getByText(/0:00 - 1:30/)).toBeInTheDocument();
      expect(screen.getByText(/1:30 - 3:00/)).toBeInTheDocument();
    });

    it('displays beat count for each section', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 128, beatCount: 192 },
        { start: 90, end: 180, bpm: 140, beatCount: 210 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Beat counts should be formatted with locale
      expect(screen.getByText('192')).toBeInTheDocument();
      expect(screen.getByText('210')).toBeInTheDocument();
    });

    it('hides sections display when hasMultiTempoApplied is false', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: false,
          tempoSections: null,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Sections header should NOT be visible
      expect(screen.queryByText(/Tempo Sections/)).not.toBeInTheDocument();
    });

    it('hides sections display when tempoSections is null', () => {
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

      // Sections header should NOT be visible
      expect(screen.queryByText(/Tempo Sections/)).not.toBeInTheDocument();
    });

    it('hides sections display when tempoSections is empty array', () => {
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

      // Sections header should NOT be visible
      expect(screen.queryByText(/Tempo Sections/)).not.toBeInTheDocument();
    });
  });

  describe('Timeline Markers (Task 5.2.3)', () => {
    it('renders timeline bar when sections are displayed', () => {
      const tempoSections = createMockTempoSections();
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Timeline bar should exist
      const timelineBar = container.querySelector('.beat-map-tempo-timeline-bar');
      expect(timelineBar).toBeInTheDocument();
    });

    it('renders segments for each tempo section', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 60, bpm: 120, beatCount: 120 },
        { start: 60, end: 120, bpm: 140, beatCount: 140 },
        { start: 120, end: 180, bpm: 160, beatCount: 160 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should have 3 segments
      const segments = container.querySelectorAll('.beat-map-tempo-timeline-segment');
      expect(segments).toHaveLength(3);
    });

    it('displays BPM label on each segment', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 128, beatCount: 192 },
        { start: 90, end: 180, bpm: 140, beatCount: 210 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Each segment should have a BPM label
      const bpmLabels = container.querySelectorAll('.beat-map-tempo-timeline-bpm');
      expect(bpmLabels).toHaveLength(2);

      // Check BPM values
      expect(bpmLabels[0].textContent).toBe('128');
      expect(bpmLabels[1].textContent).toBe('140');
    });

    it('sets segment width proportional to section duration', () => {
      // First section: 60 seconds (1/3 of total)
      // Second section: 120 seconds (2/3 of total)
      const tempoSections: TempoSection[] = [
        { start: 0, end: 60, bpm: 120, beatCount: 120 },
        { start: 60, end: 180, bpm: 140, beatCount: 280 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      const segments = container.querySelectorAll('.beat-map-tempo-timeline-segment');
      expect(segments).toHaveLength(2);

      // First segment should be ~33.33% width
      const firstWidth = parseFloat(segments[0].getAttribute('style')?.match(/width:\s*([\d.]+)%/)?.[1] ?? '0');
      expect(firstWidth).toBeCloseTo(33.33, 1);

      // Second segment should be ~66.67% width
      const secondWidth = parseFloat(segments[1].getAttribute('style')?.match(/width:\s*([\d.]+)%/)?.[1] ?? '0');
      expect(secondWidth).toBeCloseTo(66.67, 1);
    });

    it('renders boundary lines between sections (not after last)', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 60, bpm: 120, beatCount: 120 },
        { start: 60, end: 120, bpm: 140, beatCount: 140 },
        { start: 120, end: 180, bpm: 160, beatCount: 160 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should have 2 boundary lines (n-1 for n sections)
      const boundaries = container.querySelectorAll('.beat-map-tempo-timeline-boundary');
      expect(boundaries).toHaveLength(2);
    });

    it('displays start time labels for each section', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 128, beatCount: 192 },
        { start: 90, end: 180, bpm: 140, beatCount: 210 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Time labels should be present
      const timeLabels = container.querySelectorAll('.beat-map-tempo-timeline-time');
      expect(timeLabels).toHaveLength(2);

      // First label should be "0:00"
      expect(timeLabels[0].textContent).toBe('0:00');
      // Second label should be "1:30" (90 seconds)
      expect(timeLabels[1].textContent).toBe('1:30');
    });
  });

  describe('Interpolation Stats Multi-Tempo Display (Task 3.4)', () => {
    it('shows Primary BPM from first section when multi-tempo is applied', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 128, beatCount: 192 },
        { start: 90, end: 180, bpm: 140, beatCount: 210 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
          quarterNoteBpm: 120, // This should be overridden by first section BPM
        })
      );

      const { container } = render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Primary BPM should show first section's BPM (128)
      const primaryBpm = container.querySelector('.beat-map-interpolation-stat-value--primary');
      expect(primaryBpm?.textContent).toBe('128');
    });

    it('shows Multi-Tempo: Yes when hasMultiTempoApplied is true', () => {
      const tempoSections = createMockTempoSections();
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should show "Yes" for multi-tempo
      expect(screen.getByText('Yes')).toBeInTheDocument();
      // Should show section count
      expect(screen.getByText(/\(2 sections\)/)).toBeInTheDocument();
    });

    it('shows Multi-Tempo: No when hasMultiTempoApplied is false', () => {
      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: false,
          hasMultiTempoApplied: false,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should show "No" for multi-tempo
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('uses singular "section" when only one section exists', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 180, bpm: 128, beatCount: 384 },
      ];

      mockedUseInterpolationStatistics.mockReturnValue(
        createMockInterpolationStats({
          hasMultipleTempos: true,
          hasMultiTempoApplied: true,
          tempoSections,
        })
      );

      render(
        <BeatMapSummary
          beatMap={createMockBeatMap()}
          onStartPractice={mockOnStartPractice}
        />
      );

      // Should use singular "section"
      expect(screen.getByText(/\(1 section\)/)).toBeInTheDocument();
    });
  });
});
