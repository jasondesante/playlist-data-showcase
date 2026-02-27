/**
 * BeatPracticeView Component
 *
 * The main container for the beat detection practice mode experience.
 * Integrates audio playback, beat visualization, and tap accuracy features.
 *
 * Features:
 * - Full-width container for the practice experience
 * - Layout: Timeline visualization at top, tap area below
 * - Integration with useAudioPlayerStore for playback state
 * - Integration with useBeatStream for beat sync
 * - Keyboard event handling (spacebar for tap)
 * - Current BPM and song position display
 *
 * Part of Task 3.2: BeatPracticeView Component (The Main Container)
 */
import { useEffect, useCallback, useRef } from 'react';
import { Play, Pause, SkipBack, X, Music, Activity } from 'lucide-react';
import './BeatPracticeView.css';
import { useBeatDetectionStore } from '../../store/beatDetectionStore';
import { useBeatStream } from '../../hooks/useBeatStream';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { Button } from './Button';
import { BeatTimeline } from './BeatTimeline';
import { TapArea, useTapFeedback } from './TapArea';
import { TapStats } from './TapStats';

interface BeatPracticeViewProps {
  /** Callback to exit practice mode */
  onExit: () => void;
}

/**
 * Format time in seconds to MM:SS format
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function BeatPracticeView({ onExit }: BeatPracticeViewProps) {
  // Store state and actions
  const beatMap = useBeatDetectionStore((state) => state.beatMap);
  const stopPracticeMode = useBeatDetectionStore((state) => state.actions.stopPracticeMode);
  const recordTap = useBeatDetectionStore((state) => state.actions.recordTap);

  // Audio player state
  const { playbackState, currentTime, duration, pause, resume, seek } = useAudioPlayerStore();
  const isPlaying = playbackState === 'playing';

  // Beat stream hook for real-time sync
  const {
    currentBpm,
    upcomingBeats,
    lastBeatEvent,
    checkTap,
    isActive: streamIsActive,
    seekStream,
  } = useBeatStream(beatMap, undefined, true);

  // Tap feedback hook for managing visual feedback
  const { showFeedback, lastTapResult, showTapFeedback, hideTapFeedback } = useTapFeedback(500);

  // Ref for tap area to handle keyboard focus
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle tap action (spacebar or click)
   */
  const handleTap = useCallback(() => {
    if (!streamIsActive) return;

    const result = checkTap();
    if (result) {
      // Record in store
      recordTap(result);

      // Show visual feedback using the hook
      showTapFeedback(result);
    }
  }, [checkTap, recordTap, streamIsActive, showTapFeedback]);

  /**
   * Handle keyboard events
   */
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore key repeat events (when user holds down the key)
      if (event.repeat) return;

      if (event.code === 'Space') {
        event.preventDefault(); // Prevent page scroll
        handleTap();
      } else if (event.code === 'Escape') {
        onExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleTap, onExit]);

  /**
   * Handle seek events
   */
  const handleSeek = useCallback((time: number) => {
    seek(time);
    seekStream(time);
  }, [seek, seekStream]);

  /**
   * Handle play/pause toggle
   */
  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  }, [isPlaying, pause, resume]);

  /**
   * Handle exit practice mode
   */
  const handleExit = useCallback(() => {
    stopPracticeMode();
    onExit();
  }, [stopPracticeMode, onExit]);

  // Don't render if no beat map
  if (!beatMap) {
    return null;
  }

  return (
    <div className="beat-practice-view" ref={containerRef}>
      {/* Header Bar */}
      <div className="beat-practice-header">
        <div className="beat-practice-header-left">
          <Music className="beat-practice-header-icon" />
          <span className="beat-practice-title">Practice Mode</span>
        </div>
        <div className="beat-practice-header-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExit}
            leftIcon={X}
            aria-label="Exit practice mode"
          >
            Exit
          </Button>
        </div>
      </div>

      {/* BPM and Position Display */}
      <div className="beat-practice-stats">
        <div className="beat-practice-stat">
          <span className={`beat-practice-stat-value ${currentBpm > 0 ? 'beat-practice-stat-value--live' : ''}`}>
            {Math.round(currentBpm) || Math.round(beatMap.bpm)}
          </span>
          <span className="beat-practice-stat-label">
            BPM
            {currentBpm > 0 && <span className="beat-practice-bpm-indicator">rolling</span>}
          </span>
        </div>
        <div className="beat-practice-stat">
          <span className="beat-practice-stat-value">{formatTime(currentTime)}</span>
          <span className="beat-practice-stat-label">Position</span>
        </div>
        <div className="beat-practice-stat">
          <span className="beat-practice-stat-value">{formatTime(duration)}</span>
          <span className="beat-practice-stat-label">Duration</span>
        </div>
      </div>

      {/* Beat Timeline Visualization */}
      <BeatTimeline
        beatMap={beatMap}
        currentTime={currentTime}
        upcomingBeats={upcomingBeats}
        lastBeatEvent={lastBeatEvent}
        onSeek={handleSeek}
        anticipationWindow={2.0}
        isPlaying={isPlaying}
        audioContext={null}
      />

      {/* Playback Controls */}
      <div className="beat-practice-controls">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSeek(0)}
          leftIcon={SkipBack}
          aria-label="Restart"
        >
          Restart
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={handlePlayPause}
          leftIcon={isPlaying ? Pause : Play}
          className="beat-practice-play-button"
        >
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
      </div>

      {/* Tap Area - Using the dedicated TapArea component */}
      <TapArea
        onTap={handleTap}
        isActive={streamIsActive}
        lastTapResult={lastTapResult}
        showFeedback={showFeedback}
        feedbackDuration={500}
        onFeedbackComplete={hideTapFeedback}
      />

      {/* Tap Statistics - Using dedicated TapStats component */}
      <TapStats />

      {/* Stream status indicator */}
      <div className="beat-practice-stream-status">
        <Activity
          className={`beat-practice-stream-icon ${streamIsActive ? 'beat-practice-stream-icon--active' : ''}`}
        />
        <span className="beat-practice-stream-label">
          {streamIsActive ? 'Beat stream active' : 'Beat stream inactive'}
        </span>
      </div>
    </div>
  );
}
