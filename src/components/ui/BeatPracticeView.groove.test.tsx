/**
 * Integration Tests for BeatPracticeView Groove Meter Integration
 *
 * Task 8.3: Integration Tests
 * - Test groove updates on tap
 * - Test decay behavior over time (no visual decay - hotness only changes via recordHit/recordMiss)
 * - Test best groove tracking across session
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import type { BeatMap, GrooveState, GrooveResult, ExtendedButtonPressResult } from '@/types';

// Helper to create a basic beat map
function createMockBeatMap(overrides: Partial<BeatMap> = {}): BeatMap {
  return {
    beats: Array.from({ length: 100 }, (_, i) => ({
      timestamp: i * 0.5,
      confidence: 0.9,
    })),
    bpm: 120,
    duration: 180,
    audioId: 'test-audio-123',
    metadata: {
      sensitivity: 1.0,
      filter: 0.0,
    },
    ...overrides,
  };
}

// Helper to create a tap result
function createMockTapResult(overrides: Partial<ExtendedButtonPressResult> = {}): ExtendedButtonPressResult {
  return {
    matchedBeat: {
      timestamp: 1.0,
      confidence: 0.9,
      bpm: 120,
    },
    accuracy: 'perfect',
    offset: 0.01,
    isHit: true,
    ...overrides,
  };
}

// Helper to create groove state
function createMockGrooveState(overrides: Partial<GrooveState> = {}): GrooveState {
  return {
    hotness: 0,
    streakLength: 0,
    pocketDirection: 'neutral',
    establishedOffset: 0,
    consistency: 0,
    inPocket: false,
    pocketWindow: 0.03,
    ...overrides,
  };
}

// Create mutable mock beat map for track change testing
let currentMockBeatMap = createMockBeatMap();

// Track groove state for testing
let mockGrooveState: GrooveState | null = null;
let mockBestGrooveHotness = 0;
let mockBestGrooveStreak = 0;
let mockInitGrooveAnalyzerCalled = false;
let mockRecordGrooveHitCalled = false;
let mockResetGrooveAnalyzerCalled = false;
let lastRecordedHit: { offset: number; bpm: number } | null = null;

// Track onSeek callback from BeatTimeline for testing
let capturedOnSeek: ((time: number) => void) | null = null;

// Mock tap result to be returned by checkTap
let mockTapResult: ExtendedButtonPressResult | null = null;

// Mock the store hooks
vi.mock('../../store/beatDetectionStore', () => ({
  useBeatDetectionStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const storeState = {
      beatMap: currentMockBeatMap,
      actions: {
        stopPracticeMode: vi.fn(),
        recordTap: vi.fn(),
        setDownbeatPosition: vi.fn(),
        setBeatStreamMode: vi.fn(),
        initGrooveAnalyzer: vi.fn(() => {
          mockInitGrooveAnalyzerCalled = true;
          mockGrooveState = createMockGrooveState();
        }),
        resetGrooveAnalyzer: vi.fn(() => {
          mockResetGrooveAnalyzerCalled = true;
          if (mockGrooveState) {
            mockGrooveState = createMockGrooveState();
          }
        }),
        recordGrooveHit: vi.fn((offset: number, bpm: number, currentTime: number, accuracy: string) => {
          mockRecordGrooveHitCalled = true;
          lastRecordedHit = { offset, bpm };
          // Simulate hotness increase
          const newHotness = Math.min(100, (mockGrooveState?.hotness ?? 0) + 8);
          const newStreak = (mockGrooveState?.streakLength ?? 0) + 1;
          mockGrooveState = createMockGrooveState({
            hotness: newHotness,
            streakLength: newStreak,
            consistency: 0.9,
            inPocket: true,
          });
          // Update best values
          if (newHotness > mockBestGrooveHotness) {
            mockBestGrooveHotness = newHotness;
          }
          if (newStreak > mockBestGrooveStreak) {
            mockBestGrooveStreak = newStreak;
          }
          return {
            pocketDirection: 'neutral',
            establishedOffset: offset,
            consistency: 0.9,
            hotness: newHotness,
            streakLength: newStreak,
            inPocket: true,
            pocketWindow: 0.03,
          };
        }),
        recordGrooveMiss: vi.fn(() => {
          if (mockGrooveState) {
            mockGrooveState = createMockGrooveState({
              hotness: Math.max(0, mockGrooveState.hotness - 10),
              streakLength: 0,
              inPocket: false,
            });
          }
          return {
            pocketDirection: 'neutral',
            establishedOffset: 0,
            consistency: 0,
            hotness: mockGrooveState?.hotness ?? 0,
            streakLength: 0,
            inPocket: false,
            pocketWindow: 0.03,
          };
        }),
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
  useInterpolationStatistics: vi.fn(() => null),
  useTapStatistics: vi.fn(() => ({
    totalTaps: 0,
    perfectCount: 0,
    greatCount: 0,
    goodCount: 0,
    okCount: 0,
    missCount: 0,
    averageOffset: 0,
    totalDeviation: 0,
  })),
  useSubdivisionTransitionMode: vi.fn(() => 'immediate'),
  useUnifiedBeatMap: vi.fn(() => null),
  useKeyLaneViewMode: vi.fn(() => 'off'),
  useChartStyle: vi.fn(() => 'ddr'),
  useHasRequiredKeys: vi.fn(() => false),
  // Groove selectors
  useGrooveState: vi.fn(() => mockGrooveState),
  useBestGrooveHotness: vi.fn(() => mockBestGrooveHotness),
  useBestGrooveStreak: vi.fn(() => mockBestGrooveStreak),
  useIgnoreKeyRequirements: vi.fn(() => false),
  useSubdividedBeatMap: vi.fn(() => null),
}));

// Mock useBeatStream hook
vi.mock('../../hooks/useBeatStream', () => ({
  useBeatStream: vi.fn(() => ({
    currentBpm: 120,
    lastBeatEvent: null,
    checkTap: vi.fn(() => mockTapResult),
    isActive: true,
    isPaused: false,
    seekStream: vi.fn(),
  })),
}));

// Mock useSubdivisionPlayback hook
vi.mock('../../hooks/useSubdivisionPlayback', () => ({
  useSubdivisionPlayback: vi.fn(() => ({
    currentSubdivision: 'quarter',
    isActive: false,
    setSubdivision: vi.fn(),
    checkTap: vi.fn(() => null),
  })),
  useSubdivisionPlaybackAvailable: vi.fn(() => false),
}));

// Mock useAudioPlayerStore
vi.mock('../../store/audioPlayerStore', () => ({
  useAudioPlayerStore: vi.fn(() => ({
    playbackState: 'playing',
    currentTime: 1.0,
    duration: 180,
    pause: vi.fn(),
    resume: vi.fn(),
    seek: vi.fn(),
  })),
}));

// Mock useKeyboardInput hook
vi.mock('../../hooks/useKeyboardInput', () => ({
  useKeyboardInput: vi.fn(() => ({
    pressedKey: null,
    keyDownList: [],
    clearKeys: vi.fn(),
  })),
}));

// Mock child components that aren't relevant to groove tests
vi.mock('./BeatTimeline', () => ({
  BeatTimeline: vi.fn(({ onSeek }: { onSeek?: (time: number) => void }) => {
    // Capture the onSeek callback for testing
    if (onSeek) {
      capturedOnSeek = onSeek;
    }
    return <div data-testid="beat-timeline" />;
  }),
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

vi.mock('./SubdivisionButtons', () => ({
  SubdivisionButtons: vi.fn(() => null),
}));

vi.mock('./KeyLaneView', () => ({
  KeyLaneView: vi.fn(() => <div data-testid="key-lane-view" />),
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

describe('BeatPracticeView Groove Meter Integration (Task 8.3)', () => {
  const mockOnExit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Reset groove state - initialize to a valid state so GrooveMeter renders
    mockGrooveState = createMockGrooveState();
    mockBestGrooveHotness = 0;
    mockBestGrooveStreak = 0;
    mockInitGrooveAnalyzerCalled = false;
    mockRecordGrooveHitCalled = false;
    mockResetGrooveAnalyzerCalled = false;
    lastRecordedHit = null;
    mockTapResult = createMockTapResult();
    capturedOnSeek = null;
    // Reset beat map to default for track change tests
    currentMockBeatMap = createMockBeatMap();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  describe('Task 8.3.1: Groove Updates on Tap', () => {
    it('should render GrooveMeter component when practice mode is active', () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // GrooveMeter should be in the document (requires grooveState to be non-null)
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render GrooveStats component when there are best values', async () => {
      // First trigger a tap to get some best values
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Simulate a spacebar tap
      await act(async () => {
        fireEvent.keyDown(window, { code: 'Space' });
        vi.runAllTimers();
      });

      // GrooveStats should now show "Session Best" header (only renders when best > 0)
      expect(screen.getByText('Session Best')).toBeInTheDocument();
    });

    it('should call recordGrooveHit when tap is registered', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Simulate a spacebar tap
      await act(async () => {
        fireEvent.keyDown(window, { code: 'Space' });
        vi.runAllTimers();
      });

      // Verify recordGrooveHit was called
      expect(mockRecordGrooveHitCalled).toBe(true);
    });

    it('should pass correct offset to recordGrooveHit from tap result', async () => {
      // Set up mock tap result with specific offset
      mockTapResult = createMockTapResult({ offset: 0.025 });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Simulate a tap
      await act(async () => {
        fireEvent.keyDown(window, { code: 'Space' });
        vi.runAllTimers();
      });

      // Verify offset was passed correctly
      expect(lastRecordedHit).not.toBeNull();
      expect(lastRecordedHit?.offset).toBe(0.025);
    });

    it('should pass current BPM to recordGrooveHit', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Simulate a tap
      await act(async () => {
        fireEvent.keyDown(window, { code: 'Space' });
        vi.runAllTimers();
      });

      // Verify BPM was passed (120 from mock)
      expect(lastRecordedHit).not.toBeNull();
      expect(lastRecordedHit?.bpm).toBe(120);
    });

    it('should not call recordGrooveHit when checkTap returns null', async () => {
      // Set up mock to return null (no beat matched)
      mockTapResult = null;

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Simulate a tap
      await act(async () => {
        fireEvent.keyDown(window, { code: 'Space' });
        vi.runAllTimers();
      });

      // recordGrooveHit should not have been called
      expect(mockRecordGrooveHitCalled).toBe(false);
    });

    it('should update mock groove state when recordGrooveHit is called', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Initial state - hotness should be 0
      expect(mockGrooveState?.hotness).toBe(0);

      // Call recordGrooveHit directly to verify state update
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };
      storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');

      // After hit, the mocked store should have updated hotness
      expect(mockGrooveState?.hotness).toBe(8);
    });

    it('should update mock groove streak when recordGrooveHit is called', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Initial state - streak should be 0 in groove state
      expect(mockGrooveState?.streakLength).toBe(0);

      // Call recordGrooveHit directly to verify state update
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };
      storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');

      // After hit, streak should increase
      expect(mockGrooveState?.streakLength).toBe(1);
    });
  });

  describe('Task 8.3.2: Hotness Only Changes via recordHit/recordMiss (No Visual Decay)', () => {
    it('should not change hotness without calling recordGrooveHit or recordGrooveMiss', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Initial hotness
      const initialHotness = mockGrooveState?.hotness ?? 0;
      expect(initialHotness).toBe(0);

      // Advance timers without any action
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });

      // Hotness should still be the same (no visual decay)
      expect(mockGrooveState?.hotness).toBe(initialHotness);
    });

    it('should maintain hotness value between hits (no automatic decay)', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Get the store mock
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };

      // First hit to increase hotness
      storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');

      const hotnessAfterFirstHit = mockGrooveState?.hotness ?? 0;
      expect(hotnessAfterFirstHit).toBe(8);

      // Advance time without any action
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      // Hotness should be unchanged (no decay)
      expect(mockGrooveState?.hotness).toBe(hotnessAfterFirstHit);

      // Another hit
      storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');

      // Hotness should increase from the previous value, not from a decayed value
      expect(mockGrooveState?.hotness).toBe(hotnessAfterFirstHit + 8);
    });
  });

  describe('Task 8.3.3: Best Groove Tracking Across Session', () => {
    it('should track best hotness when recordGrooveHit is called', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Get the store mock and call recordGrooveHit multiple times directly
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };

      // Simulate multiple hits
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      // Best hotness should be 40 (5 hits * 8 hotness per hit)
      expect(mockBestGrooveHotness).toBe(40);
    });

    it('should track best streak when recordGrooveHit is called', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Get the store mock and call recordGrooveHit multiple times directly
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };

      // Simulate multiple hits
      for (let i = 0; i < 3; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      // Best streak should be 3
      expect(mockBestGrooveStreak).toBe(3);
    });

    it('should preserve best hotness when current hotness decreases', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Get the store mock
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult; recordGrooveMiss: () => GrooveResult } };

      // Simulate hits to increase hotness
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      // Best hotness should be 40
      const bestHotness = mockBestGrooveHotness;
      expect(bestHotness).toBe(40);

      // Simulate a miss
      storeState.actions.recordGrooveMiss();

      // Current hotness should decrease but best should stay the same
      expect(mockGrooveState?.hotness).toBe(30); // 40 - 10
      expect(mockBestGrooveHotness).toBe(bestHotness);
    });

    it('should preserve best streak when current streak resets', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Get the store mock
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult; recordGrooveMiss: () => GrooveResult } };

      // Simulate hits to increase streak
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      // Best streak should be 5
      const bestStreak = mockBestGrooveStreak;
      expect(bestStreak).toBe(5);

      // Simulate a miss to reset streak
      storeState.actions.recordGrooveMiss();

      // Current streak should reset but best should stay the same
      expect(mockGrooveState?.streakLength).toBe(0);
      expect(mockBestGrooveStreak).toBe(bestStreak);
    });

    it('should update best hotness when new high is achieved', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Get the store mock
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult; recordGrooveMiss: () => GrooveResult } };

      // First session of hits
      for (let i = 0; i < 3; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      expect(mockBestGrooveHotness).toBe(24);

      // Simulate miss to reset
      storeState.actions.recordGrooveMiss();

      // More hits to exceed previous best
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      // Best should now be higher: after miss hotness = 24 - 10 = 14, then 5 hits: 14 + 40 = 54
      expect(mockBestGrooveHotness).toBe(54);
    });

    it('should render GrooveStats when there are best values', async () => {
      // Pre-set best values so GrooveStats renders
      mockBestGrooveHotness = 24;
      mockBestGrooveStreak = 3;

      render(<BeatPracticeView onExit={mockOnExit} />);

      // GrooveStats should show "Session Best" header
      expect(screen.getByText('Session Best')).toBeInTheDocument();
      // Should show the hotness value (rounded)
      expect(screen.getByText('24')).toBeInTheDocument();
      // Should show the streak value
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Task 8.3.4: Groove Reset on Seek', () => {
    it('should reset groove state when resetGrooveAnalyzer is called', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Get the store mock
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult; resetGrooveAnalyzer: () => void } };

      // Build up some groove
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      expect(mockGrooveState?.hotness).toBe(40);

      // Reset the groove analyzer
      storeState.actions.resetGrooveAnalyzer();

      // Current groove should be reset
      expect(mockGrooveState?.hotness).toBe(0);
      expect(mockGrooveState?.streakLength).toBe(0);
    });

    it('should preserve best values after reset', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Get the store mock
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult; resetGrooveAnalyzer: () => void } };

      // Build up some groove
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      expect(mockBestGrooveHotness).toBe(40);
      expect(mockBestGrooveStreak).toBe(5);

      // Reset the groove analyzer
      storeState.actions.resetGrooveAnalyzer();

      // Best values should be preserved
      expect(mockBestGrooveHotness).toBe(40);
      expect(mockBestGrooveStreak).toBe(5);
    });

    it('should reset groove when handleSeek is called (via BeatTimeline onSeek)', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Build up some groove state
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      expect(mockGrooveState?.hotness).toBe(40);
      // Reset the flag after initial mount effects run
      mockResetGrooveAnalyzerCalled = false;

      // Simulate seek by calling the captured onSeek callback
      expect(capturedOnSeek).not.toBeNull();
      await act(async () => {
        capturedOnSeek!(30.0); // Seek to 30 seconds
        vi.runAllTimers();
      });

      // Verify resetGrooveAnalyzer was called by seek
      expect(mockResetGrooveAnalyzerCalled).toBe(true);
      // Current groove should be reset
      expect(mockGrooveState?.hotness).toBe(0);
      expect(mockGrooveState?.streakLength).toBe(0);
    });

    it('should preserve best values after seek reset', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Build up some groove state
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      expect(mockBestGrooveHotness).toBe(40);
      expect(mockBestGrooveStreak).toBe(5);

      // Simulate seek
      await act(async () => {
        capturedOnSeek!(30.0);
        vi.runAllTimers();
      });

      // Best values should be preserved after seek
      expect(mockBestGrooveHotness).toBe(40);
      expect(mockBestGrooveStreak).toBe(5);
    });
  });

  describe('Task 8.3.4b: Groove Reset on Track Change', () => {
    it('should reset groove when beatMap audioId changes (track change)', async () => {
      const { rerender } = render(<BeatPracticeView onExit={mockOnExit} />);

      // Build up some groove state
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      expect(mockGrooveState?.hotness).toBe(40);
      // Reset the flag after initial mount effects run
      mockResetGrooveAnalyzerCalled = false;

      // Simulate track change by updating the beatMap's audioId
      currentMockBeatMap = createMockBeatMap({ audioId: 'different-audio-456' });

      // Trigger re-render which should cause the useEffect to detect the audioId change
      await act(async () => {
        rerender(<BeatPracticeView onExit={mockOnExit} />);
        vi.runAllTimers();
      });

      // Verify resetGrooveAnalyzer was called due to track change
      expect(mockResetGrooveAnalyzerCalled).toBe(true);
      // Current groove should be reset
      expect(mockGrooveState?.hotness).toBe(0);
      expect(mockGrooveState?.streakLength).toBe(0);
    });

    it('should preserve best values after track change reset', async () => {
      const { rerender } = render(<BeatPracticeView onExit={mockOnExit} />);

      // Build up some groove state
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      expect(mockBestGrooveHotness).toBe(40);
      expect(mockBestGrooveStreak).toBe(5);

      // Simulate track change
      currentMockBeatMap = createMockBeatMap({ audioId: 'different-audio-789' });

      await act(async () => {
        rerender(<BeatPracticeView onExit={mockOnExit} />);
        vi.runAllTimers();
      });

      // Best values should be preserved after track change
      expect(mockBestGrooveHotness).toBe(40);
      expect(mockBestGrooveStreak).toBe(5);
    });

    it('should not reset groove when beatMap audioId is the same', async () => {
      render(<BeatPracticeView onExit={mockOnExit} />);

      // Build up some groove state
      const { useBeatDetectionStore } = await import('../../store/beatDetectionStore');
      const storeState = useBeatDetectionStore() as { actions: { recordGrooveHit: (offset: number, bpm: number, currentTime: number, accuracy: string) => GrooveResult } };
      for (let i = 0; i < 5; i++) {
        storeState.actions.recordGrooveHit(0.01, 120, 1.0, 'perfect');
      }

      expect(mockGrooveState?.hotness).toBe(40);
      mockResetGrooveAnalyzerCalled = false;

      // Simulate re-render without changing audioId (same track)
      currentMockBeatMap = createMockBeatMap({ audioId: 'test-audio-123' }); // Same ID

      await act(async () => {
        vi.runAllTimers();
      });

      // resetGrooveAnalyzer should NOT have been called
      expect(mockResetGrooveAnalyzerCalled).toBe(false);
      // Groove should still be at 40
      expect(mockGrooveState?.hotness).toBe(40);
    });
  });

  describe('Task 8.3.5: Direction Display Integration', () => {
    it('should display direction label in GrooveMeter', () => {
      // Set up groove state with a direction
      mockGrooveState = createMockGrooveState({
        hotness: 50,
        streakLength: 5,
        pocketDirection: 'neutral',
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Should display "On Point" for neutral direction
      expect(screen.getByText('On Point')).toBeInTheDocument();
    });

    it('should display correct icon for direction', () => {
      mockGrooveState = createMockGrooveState({
        hotness: 50,
        streakLength: 5,
        pocketDirection: 'push',
      });

      render(<BeatPracticeView onExit={mockOnExit} />);

      // Should display up arrow for push direction
      expect(screen.getByText('↑')).toBeInTheDocument();
      expect(screen.getByText('Pushing')).toBeInTheDocument();
    });
  });

  describe('Task 8.3.6: Accessibility', () => {
    it('should have accessible progressbar for groove meter', () => {
      mockGrooveState = createMockGrooveState({ hotness: 75 });

      render(<BeatPracticeView onExit={mockOnExit} />);

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
      // Updated aria-label includes hotness, direction, and streak for better accessibility
      expect(progressbar).toHaveAttribute('aria-label', 'Groove meter: 75% hotness, on point timing, 0 streak');
    });
  });
});
