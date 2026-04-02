/**
 * PracticePlayArea Component
 *
 * The main gameplay area that switches between TapArea and KeyLane views.
 * Contains the beat timeline, groove meter, combo feedback, and tap/key-lane views.
 *
 * Part of the BeatPracticeView refactoring.
 */

import type {
  BeatMap,
  BeatEvent,
  GrooveState,
  RhythmSessionTotals,
  RhythmXPResult,
  ComboEndBonusResult,
  GrooveEndBonusResult,
  InterpolationVisualizationData,
  SubdividedBeatMap,
  BeatStreamMode,
} from '@/types';
import type { ExtendedButtonPressResult, KeyLaneViewMode } from '@/types';
import { BeatTimeline } from '../../BeatTimeline';
import { TapArea } from '../../TapArea';
import { KeyLaneView } from '../../KeyLaneView';
import { GrooveMeter } from '../../GrooveMeter';
import { ComboFeedbackDisplay } from '../../ComboFeedbackDisplay';

export interface PracticePlayAreaProps {
  // View mode
  keyLaneViewMode: KeyLaneViewMode;

  // Beat data
  beatMap: BeatMap;
  subdividedBeatMap: SubdividedBeatMap | null;
  realtimeSubdividedBeatMap: SubdividedBeatMap | null;
  beatStreamMode: BeatStreamMode;

  // Playback state
  currentTime: number;
  isPlaying: boolean;
  streamIsActive: boolean;
  streamIsPaused: boolean;

  // Beat event data
  lastBeatEvent: BeatEvent | null;

  // Tap feedback
  handleTap: (pressedKey?: string) => void;
  lastTapResult: ExtendedButtonPressResult | null;
  showFeedback: boolean;
  hideTapFeedback: () => void;
  showTooFast: boolean;
  tapVisualTime: number;

  // Score/XP state
  rhythmSessionTotals: RhythmSessionTotals | null;
  currentCombo: number;
  lastRhythmXPResult: RhythmXPResult | null;

  // Groove state
  grooveState: GrooveState | null;

  // Bonuses
  pendingGrooveEndBonus: GrooveEndBonusResult | null;
  pendingComboEndBonus: ComboEndBonusResult | null;
  clearPendingBonuses: () => void;

  // Visualization options
  interpolationData: InterpolationVisualizationData | null;
  showGridOverlay: boolean;
  showTempoDriftVisualization: boolean;
  isDownbeatSelectionMode: boolean;
  showMeasureBoundaries: boolean;

  // Grid overlay (quarter note timestamps from unified beat map)
  gridOverlayLines?: Array<{ timestamp: number; isDownbeat: boolean }>;

  // Callbacks
  handleSeek: (time: number) => void;
  handleBeatClick: (beatIndex: number) => void;
}

export function PracticePlayArea({
  keyLaneViewMode,
  beatMap,
  subdividedBeatMap,
  realtimeSubdividedBeatMap,
  beatStreamMode,
  currentTime,
  isPlaying,
  streamIsActive,
  streamIsPaused,
  lastBeatEvent,
  handleTap,
  lastTapResult,
  showFeedback,
  hideTapFeedback,
  showTooFast,
  tapVisualTime,
  rhythmSessionTotals,
  currentCombo,
  lastRhythmXPResult,
  grooveState,
  pendingGrooveEndBonus,
  pendingComboEndBonus,
  clearPendingBonuses,
  interpolationData,
  showGridOverlay,
  showTempoDriftVisualization,
  isDownbeatSelectionMode,
  showMeasureBoundaries,
  gridOverlayLines,
  handleSeek,
  handleBeatClick,
}: PracticePlayAreaProps) {
  return (
    <>
      {/* Beat Timeline Visualization - Hidden when in DDR/Guitar lane mode */}
      {/* GrooveMeter for TapArea mode - inline with timeline */}
      {/* Combo Bonus Notification */}
      {keyLaneViewMode === 'off' && grooveState && (
        <div className="beat-practice-groove-row">
          <div className="beat-practice-groove-container">
            <GrooveMeter
              hotness={grooveState.hotness}
              tier={grooveState.tier}
              direction={grooveState.pocketDirection}
              streak={grooveState.streakLength}
              variant="compact"
              pendingBonus={pendingGrooveEndBonus}
              onBonusDisplayed={clearPendingBonuses}
            />
          </div>
        </div>
      )}

      {keyLaneViewMode === 'off' && (
        <BeatTimeline
          beatMap={beatMap}
          currentTime={currentTime}
          lastBeatEvent={lastBeatEvent}
          lastTapTime={tapVisualTime}
          lastTapAccuracy={lastTapResult?.accuracy ?? null}
          onSeek={handleSeek}
          anticipationWindow={2.0}
          isPlaying={isPlaying}
          audioContext={null}
          interpolationData={interpolationData}
          showGridOverlay={showGridOverlay}
          showTempoDriftVisualization={showTempoDriftVisualization}
          enableBeatSelection={isDownbeatSelectionMode}
          onBeatClick={handleBeatClick}
          showMeasureBoundaries={showMeasureBoundaries}
          // Pass subdivided beat map for visualization
          // Priority: 1) Pre-calculated (beatStreamMode='subdivided'), 2) Real-time generated
          subdividedBeatMap={
            beatStreamMode === 'subdivided'
              ? subdividedBeatMap
              : realtimeSubdividedBeatMap
          }
          showSubdivisionVisualization={
            beatStreamMode === 'subdivided'
              ? !!subdividedBeatMap
              : !!realtimeSubdividedBeatMap
          }
          externalGridTimestamps={gridOverlayLines}
        />
      )}

      {/* Practice View - TapArea or KeyLane based on view mode */}
      {keyLaneViewMode === 'off' ? (
        <>
          {/* ComboFeedbackDisplay for TapArea mode */}
          <div className="beat-practice-combo-feedback-row">
            <ComboFeedbackDisplay
              score={rhythmSessionTotals?.totalScore ?? 0}
              combo={currentCombo}
              multiplier={lastRhythmXPResult?.totalMultiplier ?? 1.0}
              comboBonus={pendingComboEndBonus}
              onBonusDisplayed={clearPendingBonuses}
            />
          </div>
          <TapArea
            onTap={handleTap}
            isActive={streamIsActive}
            lastTapResult={lastTapResult}
            showFeedback={showFeedback}
            feedbackDuration={500}
            onFeedbackComplete={hideTapFeedback}
            showTooFast={showTooFast}
          />
        </>
      ) : (
        <>
          {/* GrooveMeter for KeyLane mode - above lanes */}
          {grooveState && (
            <div className="beat-practice-groove-container beat-practice-groove-container--keylane">
              <GrooveMeter
                hotness={grooveState.hotness}
                tier={grooveState.tier}
                direction={grooveState.pocketDirection}
                streak={grooveState.streakLength}
                variant="full"
                pendingBonus={pendingGrooveEndBonus}
                onBonusDisplayed={clearPendingBonuses}
              />
            </div>
          )}
          <KeyLaneView
            beatMap={subdividedBeatMap}
            currentTime={currentTime}
            chartStyle={keyLaneViewMode}
            isActive={streamIsActive}
            isPaused={streamIsPaused}
            lastAccuracy={lastTapResult?.accuracy ?? null}
            lastPressedKey={lastTapResult?.pressedKey ?? null}
            lastHitBeatTimestamp={lastTapResult?.matchedBeat?.timestamp ?? null}
            lastTapOffsetMs={lastTapResult ? Math.round(lastTapResult.offset * 1000) : null}
            onSeek={handleSeek}
            score={rhythmSessionTotals?.totalScore ?? 0}
            combo={currentCombo}
            multiplier={lastRhythmXPResult?.totalMultiplier ?? 1.0}
            comboBonus={pendingComboEndBonus}
            onBonusDisplayed={clearPendingBonuses}
          />
        </>
      )}
    </>
  );
}
