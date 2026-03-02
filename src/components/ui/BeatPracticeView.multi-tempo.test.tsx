/**
 * Tests for BeatPracticeView Multi-Tempo Display
 *
 * Task 5.2: Test Multi-Tempo Tracks (Practice Mode)
 * - Verify practice mode shows multi-tempo info
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import type { BeatMap, TempoSection } from '@/types';

// Helper to create a basic beat map
function createMockBeatMap(overrides: Partial<BeatMap> = {}): BeatMap {
  return {
    beats: Array.from({ length: 100 }, (_, i) => ({
      timestamp: i * 0.5,
      confidence: 0.9,
    })),
    bpm: 120,
    duration: 180,
    metadata: {
      sensitivity: 1.0,
      filter: 0.0,
    },
    ...overrides,
  };
}

// Helper to create interpolation statistics with multi-tempo
function createMockInterpolationStats(overrides: Record<string, unknown> = {}) {
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

// Create static mock beat map
const mockBeatMap = createMockBeatMap();

// Variable to hold dynamic interpolation stats
let mockInterpolationStatisticsValue: ReturnType<typeof createMockInterpolationStats> | null = null;

// Mock the store hooks
vi.mock('../../store/beatDetectionStore', () => ({
  useBeatDetectionStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const storeState = {
      beatMap: mockBeatMap,
      actions: {
        stopPracticeMode: vi.fn(),
        recordTap: vi.fn(),
        setDownbeatPosition: vi.fn(),
        setBeatStreamMode: vi.fn(),
      },
    };

    if (selector) {
      return selector(storeState);
    }
    return storeState;
  }),
  useDifficultyPreset: vi.fn(() => 'medium'),
  useAccuracyThresholds: vi.fn(() => ({
    perfect: 0.025,
    great: 0.05,
    good: 0.1,
    ok: 0.15,
  })),
  useInterpolationVisualizationData: vi.fn(() => null),
  useBeatStreamMode: vi.fn(() => 'detected'),
  useInterpolatedBeatMap: vi.fn(() => null),
  useShowGridOverlay: vi.fn(() => false),
  useShowTempoDriftVisualization: vi.fn(() => false),
  useIsDownbeatSelectionMode: vi.fn(() => false),
  useShowMeasureBoundaries: vi.fn(() => false),
  useTimeSignature: vi.fn(() => 4),
  useInterpolationStatistics: vi.fn(() => mockInterpolationStatisticsValue),
}));

// Mock useBeatStream hook
vi.mock('../../hooks/useBeatStream', () => ({
  useBeatStream: vi.fn(() => ({
    currentBpm: 120,
    lastBeatEvent: null,
    checkTap: vi.fn(() => null),
    isActive: true,
    isPaused: false,
    seekStream: vi.fn(),
  })),
}));

// Mock useAudioPlayerStore
vi.mock('../../store/audioPlayerStore', () => ({
  useAudioPlayerStore: vi.fn(() => ({
    playbackState: 'paused',
    currentTime: 0,
    duration: 180,
    pause: vi.fn(),
    resume: vi.fn(),
    seek: vi.fn(),
  })),
}));

// Mock child components
vi.mock('./BeatTimeline', () => ({
  BeatTimeline: vi.fn(() => <div data-testid="beat-timeline" />),
}));

vi.mock('./TapArea', () => ({
  TapArea: vi.fn(() => <div data-testid="tap-area" />),
  useTapFeedback: vi.fn(() => ({
    showFeedback: false,
    lastTapResult: null,
    showTapFeedback: vi.fn(),
    hideTapFeedback: vi.fn(),
  })),
}));

vi.mock('./TapStats', () => ({
  TapStats: vi.fn(() => <div data-testid="tap-stats" />),
}));

vi.mock('./DifficultySettingsPanel', () => ({
  DifficultySettingsPanel: vi.fn(() => null),
}));

vi.mock('./Button', () => ({
  Button: vi.fn(({ children, onClick, disabled, leftIcon: LeftIcon }) => (
    <button onClick={onClick} disabled={disabled}>
      {LeftIcon && <span data-testid="button-icon" />}
      {children}
    </button>
  )),
}));

// Import the component AFTER mocks are set up
import { BeatPracticeView } from './BeatPracticeView';

describe('BeatPracticeView Multi-Tempo Display (Task 5.2)', () => {
  const mockOnExit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockInterpolationStatisticsValue = null;
  });

  afterEach(() => {
    cleanup();
  });

  describe('Multi-Tempo Info Display (Task 5.2.4)', () => {
    it('shows multi-tempo indicator when hasMultiTempoApplied is true with multiple sections', () => {
      mockInterpolationStatisticsValue = createMockInterpolationStats({
        hasMultipleTempos: true,
        hasMultiTempoApplied: true,
        tempoSections: createMockTempoSections(),
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Multi-tempo indicator should be visible
      expect(screen.getByText(/128-140 BPM/)).toBeInTheDocument();
      expect(screen.getByText(/\(2 sections\)/)).toBeInTheDocument();
    });

    it('hides multi-tempo indicator when hasMultiTempoApplied is false', () => {
      mockInterpolationStatisticsValue = createMockInterpolationStats({
        hasMultipleTempos: true,
        hasMultiTempoApplied: false,
        tempoSections: null,
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Multi-tempo indicator should NOT be visible
      expect(screen.queryByText(/sections/)).not.toBeInTheDocument();
    });

    it('hides multi-tempo indicator when only one section exists', () => {
      mockInterpolationStatisticsValue = createMockInterpolationStats({
        hasMultipleTempos: true,
        hasMultiTempoApplied: true,
        tempoSections: [{ start: 0, end: 180, bpm: 128, beatCount: 384 }],
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Multi-tempo indicator should NOT be visible (only 1 section)
      expect(screen.queryByText(/sections/)).not.toBeInTheDocument();
    });

    it('hides multi-tempo indicator when tempoSections is null', () => {
      mockInterpolationStatisticsValue = createMockInterpolationStats({
        hasMultipleTempos: true,
        hasMultiTempoApplied: true,
        tempoSections: null,
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Multi-tempo indicator should NOT be visible
      expect(screen.queryByText(/sections/)).not.toBeInTheDocument();
    });

    it('hides multi-tempo indicator when interpolationStats is null', () => {
      mockInterpolationStatisticsValue = null;

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Multi-tempo indicator should NOT be visible
      expect(screen.queryByText(/sections/)).not.toBeInTheDocument();
    });

    it('displays min and max BPM from sections correctly', () => {
      const tempoSections: TempoSection[] = [
        { start: 0, end: 60, bpm: 100, beatCount: 100 },
        { start: 60, end: 120, bpm: 140, beatCount: 140 },
        { start: 120, end: 180, bpm: 120, beatCount: 120 },
      ];

      mockInterpolationStatisticsValue = createMockInterpolationStats({
        hasMultipleTempos: true,
        hasMultiTempoApplied: true,
        tempoSections,
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Should show min-max range (100-140) and section count (3)
      expect(screen.getByText(/100-140 BPM/)).toBeInTheDocument();
      expect(screen.getByText(/\(3 sections\)/)).toBeInTheDocument();
    });

    it('displays correct range when sections have same min and max BPM', () => {
      // Edge case: all sections have same BPM (shouldn't happen in practice, but test it)
      const tempoSections: TempoSection[] = [
        { start: 0, end: 90, bpm: 128, beatCount: 192 },
        { start: 90, end: 180, bpm: 128, beatCount: 192 },
      ];

      mockInterpolationStatisticsValue = createMockInterpolationStats({
        hasMultipleTempos: true,
        hasMultiTempoApplied: true,
        tempoSections,
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Should show 128-128 BPM
      expect(screen.getByText(/128-128 BPM/)).toBeInTheDocument();
    });

    it('displays multi-tempo indicator in BPM stat area', () => {
      mockInterpolationStatisticsValue = createMockInterpolationStats({
        hasMultipleTempos: true,
        hasMultiTempoApplied: true,
        tempoSections: createMockTempoSections(),
      });

      const { container } = render(<BeatPracticeView onExit={mockOnExit} />);

      // Multi-tempo indicator should be in the BPM stat area
      const bpmStat = container.querySelector('.beat-practice-stat');
      const multiTempoIndicator = container.querySelector('.beat-practice-multi-tempo-indicator');

      expect(bpmStat).toContainElement(multiTempoIndicator);
    });
  });

  describe('Single-Tempo Track (No Multi-Tempo)', () => {
    it('does not show multi-tempo indicator for single-tempo tracks', () => {
      mockInterpolationStatisticsValue = createMockInterpolationStats({
        hasMultipleTempos: false,
        hasMultiTempoApplied: false,
        tempoSections: null,
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // No multi-tempo indicator should be visible
      expect(screen.queryByText(/sections/)).not.toBeInTheDocument();
      expect(screen.queryByText(/BPM.*-/)).not.toBeInTheDocument();
    });

    it('shows standard BPM display for single-tempo tracks', () => {
      mockInterpolationStatisticsValue = createMockInterpolationStats({
        quarterNoteBpm: 128,
        hasMultipleTempos: false,
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // BPM label should be visible
      expect(screen.getByText('BPM')).toBeInTheDocument();
    });
  });
});
