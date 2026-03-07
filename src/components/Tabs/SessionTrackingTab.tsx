import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Clock, Music, Zap, Gamepad2, Star, User, TrendingUp, Headphones, Eye, EyeOff } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useSessionStore } from '../../store/sessionStore';
import { useSessionTracker } from '../../hooks/useSessionTracker';
import { useXPCalculator } from '../../hooks/useXPCalculator';
import { useCharacterStore } from '../../store/characterStore';
import { useCharacterUpdater } from '../../hooks/useCharacterUpdater';
import { useSensorStore } from '../../store/sensorStore';
import { useMastery } from '../../hooks/useMastery';
import { useAppStore } from '../../store/appStore';
import { getMaskedCoordinates } from '../../utils/formatters';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatSelectionModal, type StatEffect } from '../StatSelectionModal';
import { showToast } from '../ui/Toast';
import { MasteryBadge } from '../ui/MasteryBadge';
import { MasteryProgressBar } from '../ui/MasteryProgressBar';
import { PrestigeButton } from '../ui/PrestigeButton';
import { SessionHistoryPanel } from '../ui/SessionHistoryPanel';
import type { ListeningSession, Ability, ISessionTracker, CharacterSheet } from 'playlist-data-engine';
import './SessionTrackingTab.css';

// XP thresholds for D&D 5e levels 1-20
const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

// Format XP to 1 decimal place
const formatXP = (xp: number): string => {
  return xp.toFixed(1);
};

/**
 * SessionTrackingTab Component
 *
 * Demonstrates the SessionTracker module from playlist-data-engine.
 * Allows users to start/end listening sessions and tracks elapsed time.
 *
 * Features:
 * - Card-based layout for session info
 * - Animated timer with ring progress
 * - Pulse effect on active session
 * - Real-time XP calculation during sessions
 * - Character stats display with pending stat increases
 *
 * Engine module: SessionTracker
 */

interface TimerRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  isActive: boolean;
  isCompact?: boolean;
}

function TimerRing({ progress, size, strokeWidth, isActive, isCompact = false }: TimerRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={`timer-ring-container ${isCompact ? 'timer-ring-compact' : ''}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="timer-ring-svg"
        style={{ transform: 'rotate(-90deg)' }}
      >
        <defs>
          {/* Gradient for the progress ring */}
          <linearGradient id={`timer-gradient-${isCompact ? 'compact' : 'main'}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--cute-teal))" />
          </linearGradient>
        </defs>
        {/* Outer decorative ring */}
        {!isCompact && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius + 8}
            fill="none"
            stroke="hsl(var(--primary) / 0.1)"
            strokeWidth={2}
            strokeDasharray="4 8"
            className="timer-ring-outer"
          />
        )}
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill={isCompact ? 'hsl(var(--muted) / 0.1)' : 'none'}
          stroke={isCompact ? 'hsl(var(--primary) / 0.2)' : 'hsl(var(--muted)'}
          strokeWidth={strokeWidth}
          className="timer-ring-bg"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#timer-gradient-${isCompact ? 'compact' : 'main'})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`timer-ring-progress ${isActive ? 'timer-ring-active' : ''}`}
        />
        {/* Inner decorative dots */}
        {isCompact && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius - 10}
            fill="none"
            stroke="hsl(var(--primary) / 0.15)"
            strokeWidth={1}
            strokeDasharray="2 6"
            className="timer-ring-inner"
          />
        )}
      </svg>
    </div>
  );
}

export function SessionTrackingTab() {
  const { selectedTrack, audioProfile } = usePlaylistStore();
  const { play, stop } = useAudioPlayerStore();
  const { startSession, endSession: hookEndSession, isActive, elapsedTime, sessionId } = useSessionTracker();
  const { calculateXP } = useXPCalculator();
  const { getActiveCharacter, getPrestigeInfo, canPrestige, prestigeCharacter } = useCharacterStore();
  const { applyPendingStatIncrease } = useCharacterUpdater();
  const { getMasteryInfo, getTrackListenCount } = useMastery();
  const { sessionHistory, clearTrackSessions, getTrackXPTotal } = useSessionStore();
  const { settings } = useAppStore();
  const [lastSession, setLastSession] = useState<ListeningSession | null>(null);
  const [showStatModal, setShowStatModal] = useState(false);

  // Local state for hiding location (defaults to setting, can be toggled temporarily)
  const [localHideLocation, setLocalHideLocation] = useState(settings.hideRealLocation);

  // Get active character for XP progress display
  const activeCharacter = getActiveCharacter();

  const { environmentalContext, gamingContext } = useSensorStore();

  /**
   * Extract active stat effects from a character's equipment and feature effects.
   * Transforms engine format to StatEffect[] format for the StatSelectionModal.
   *
   * Task 3.5.1/3.5.2: Update SessionTrackingTab to pass new props
   *
   * @param character - The character sheet to extract effects from
   * @returns Array of StatEffect objects for display in the modal
   */
  const getActiveStatEffects = (character: CharacterSheet): StatEffect[] => {
    const effects: StatEffect[] = [];

    // Extract from equipment effects
    if (character.equipment_effects) {
      for (const equipmentEffect of character.equipment_effects) {
        if (equipmentEffect.effects) {
          for (const prop of equipmentEffect.effects) {
            // Check for stat_bonus type effects
            if (prop.type === 'stat_bonus' && prop.target && typeof prop.value === 'number') {
              effects.push({
                ability: prop.target as Ability,
                amount: prop.value,
                source: equipmentEffect.source || 'Equipment',
                type: prop.value > 0 ? 'buff' : 'debuff'
              });
            }
          }
        }
      }
    }

    // Extract from feature effects
    if (character.feature_effects) {
      for (const featureEffect of character.feature_effects) {
        // Check for stat_bonus type effects
        if (featureEffect.type === 'stat_bonus' && featureEffect.target && typeof featureEffect.value === 'number') {
          effects.push({
            ability: featureEffect.target as Ability,
            amount: featureEffect.value,
            source: featureEffect.description || 'Feature',
            type: featureEffect.value > 0 ? 'buff' : 'debuff'
          });
        }
      }
    }

    return effects;
  };

  // Memoize active effects for the active character to avoid recalculating on every render
  const activeStatEffects = useMemo(() => {
    if (!activeCharacter) return [];
    return getActiveStatEffects(activeCharacter);
  }, [activeCharacter?.equipment_effects, activeCharacter?.feature_effects]);

  // Create ISessionTracker adapter for engine methods
  const sessionTrackerAdapter: ISessionTracker = useMemo(() => ({
    getTrackListenCount: (trackUuid: string) => getTrackListenCount(trackUuid),
    getTrackXPTotal: (trackUuid: string) => getTrackXPTotal(trackUuid),
    clearTrackSessions: (trackUuid: string) => clearTrackSessions(trackUuid),
  }), [getTrackListenCount, getTrackXPTotal, clearTrackSessions]);

  // Get mastery info for the selected track (uses character's prestige level)
  const masteryInfo = useMemo(() => {
    if (!selectedTrack) return null;
    const prestigeLevel = activeCharacter?.prestige_level ?? 0;
    return getMasteryInfo(selectedTrack.id, prestigeLevel);
  }, [selectedTrack, getMasteryInfo, activeCharacter?.prestige_level]);

  // Get prestige info for the active character (for PrestigeButton)
  const prestigeInfo = useMemo(() => {
    if (!activeCharacter) return null;
    return getPrestigeInfo(activeCharacter.seed, sessionTrackerAdapter);
  }, [activeCharacter, getPrestigeInfo, sessionTrackerAdapter]);

  // Check if character can prestige
  const canPrestigeState = useMemo(() => {
    if (!activeCharacter) return false;
    return canPrestige(activeCharacter.seed, sessionTrackerAdapter);
  }, [activeCharacter, canPrestige, sessionTrackerAdapter]);

  // Calculate real-time XP based on elapsed time
  // Update whenever elapsedTime changes (every second when session is active)
  const xpBreakdown = useMemo(() => {
    if (!isActive || elapsedTime === 0) {
      return null;
    }
    // Calculate XP based on elapsed session time
    // Use environmental and gaming context for accurate real-time calculation
    return calculateXP(
      elapsedTime,
      environmentalContext || undefined,
      gamingContext || undefined,
      false
    );
  }, [isActive, elapsedTime, calculateXP, environmentalContext, gamingContext]);

  // Animated XP counter state
  const [displayedXP, setDisplayedXP] = useState(0);

  // Calculate XP progress toward next level for active character
  const xpProgress = useMemo(() => {
    if (!activeCharacter) return null;

    // Use current character XP plus XP earned this session for real-time progress
    const currentXP = activeCharacter.xp.current + displayedXP;
    const nextLevelXP = activeCharacter.xp.next_level;
    const level = activeCharacter.level;

    // Calculate progress within current level
    const prevLevelThreshold = XP_THRESHOLDS[level - 1] || 0;
    const currentLevelProgress = currentXP - prevLevelThreshold;
    const levelXPNeeded = nextLevelXP - prevLevelThreshold;

    const progressPercent = levelXPNeeded > 0
      ? (currentLevelProgress / levelXPNeeded) * 100
      : 100; // Max level or complete

    const xpNeeded = Math.max(0, nextLevelXP - currentXP);

    return {
      currentXP,
      nextLevelXP,
      level,
      progressPercent,
      xpNeeded
    };
  }, [activeCharacter, displayedXP]); // Include displayedXP to update during session

  // Animate XP counter towards actual value
  useEffect(() => {
    if (!xpBreakdown) {
      setDisplayedXP(0);
      return;
    }

    const targetXP = xpBreakdown.totalXP;
    const diff = targetXP - displayedXP;

    // If difference is small, just set it directly
    if (Math.abs(diff) <= 1) {
      setDisplayedXP(targetXP);
      return;
    }

    // Animate towards target XP
    const animationInterval = setInterval(() => {
      setDisplayedXP((prev) => {
        const newDiff = targetXP - prev;
        if (Math.abs(newDiff) <= 1) {
          clearInterval(animationInterval);
          return targetXP;
        }
        // Increment/decrement by a portion of the difference
        return prev + Math.ceil(newDiff / 5);
      });
    }, 100); // Update 10 times per second for smooth animation

    return () => clearInterval(animationInterval);
  }, [xpBreakdown?.totalXP]);

  const handleStart = () => {
    if (!selectedTrack) return;

    // Start the audio playback
    play(selectedTrack.audio_url);

    // Start session tracker - sessionId is now derived from store via hook
    startSession(selectedTrack.id, selectedTrack, {
      environmental_context: environmentalContext || undefined,
      gaming_context: gamingContext || undefined
    });
  };

  const handleEnd = () => {
    // End session and capture the session data
    // Note: XP processing and toasts are now handled by useSessionCompletion hook at App level
    const session = hookEndSession();
    if (session) {
      setLastSession(session);
    }
    // Stop audio
    stop();
  };

  // Handler for opening the stat selection modal
  const handleOpenStatModal = () => {
    setShowStatModal(true);
  };

  // Handler for closing the stat selection modal
  const handleCloseStatModal = () => {
    setShowStatModal(false);
  };

  // Handler for applying stat increases
  const handleApplyStats = (primary: Ability, secondary?: Ability[]) => {
    if (!activeCharacter) return;

    const result = applyPendingStatIncrease(activeCharacter, primary, secondary);

    // Show success notification with stat changes
    const statChangeText = result.statIncreases
      .map((inc) => `${inc.ability} +${inc.delta} (${inc.oldValue} → ${inc.newValue})`)
      .join(', ');

    showToast(`✅ Stats applied: ${statChangeText}`, 'success');
    console.log(`✅ Stats applied: ${statChangeText}`);
    console.log(`Remaining pending increases: ${result.remainingPending}`);

    // Close the modal
    setShowStatModal(false);
  };

  // Handler for prestiging the character
  const handlePrestige = () => {
    if (!activeCharacter || !selectedTrack) return;

    // Use audioProfile from store, or create a default one
    const profile = audioProfile || {
      bass_dominance: 0.5,
      mid_dominance: 0.5,
      treble_dominance: 0.5,
      average_amplitude: 0.5,
      analysis_metadata: {
        duration_analyzed: 0,
        full_buffer_analyzed: true,
        sample_positions: [0],
        analyzed_at: new Date().toISOString()
      }
    };

    const result = prestigeCharacter(
      activeCharacter.seed,
      profile,
      selectedTrack,
      sessionTrackerAdapter
    );

    if (result.success) {
      showToast(`👑 Prestiged to level ${result.newPrestigeLevel > 0 ? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][result.newPrestigeLevel - 1] : ''}!`, 'success');
    } else {
      showToast(`❌ ${result.message}`, 'error');
    }
  };

  // Calculate progress percentage
  const trackDuration = selectedTrack?.duration || 180;
  const progress = Math.min((elapsedTime / trackDuration) * 100, 100);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Format session start time
  const formatSessionTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="session-tab-container">
      {/* Header Section */}
      <div className="session-tab-header">
        <div className="session-tab-icon-badge">
          <Clock className="session-tab-icon" />
        </div>
        <div>
          <h1 className="session-tab-title">Session Tracker</h1>
          <div className="session-tab-subtitle">Track your listening sessions and view detailed analytics</div>
        </div>
      </div>

      {/* Empty State */}
      {!selectedTrack ? (
        <Card variant="elevated" padding="lg" className="session-empty-card">
          <div className="session-empty-state">
            <Music className="session-empty-icon" />
            <h3 className="session-empty-title">No Track Selected</h3>
            <div className="session-empty-description">
              Select a track from the Playlist tab to start a listening session
            </div>
          </div>
        </Card>
      ) : (
        <div className="session-content">
          {/* Top Section: Timer Ring (Left) + Combined Info (Right) */}
          <div className="session-hero-song-grid">
            {/* Left Card: Timer Ring with Track Image */}
            <Card variant="elevated" padding="lg" className={`session-timer-card ${isActive ? 'session-timer-card-active' : ''}`}>
              <div className="session-timer-display">
                <TimerRing
                  progress={isActive ? progress : 0}
                  size={140}
                  strokeWidth={12}
                  isActive={isActive}
                  isCompact={true}
                />
                <div className="session-timer-text-container">
                  <div className="session-time-label">
                    {isActive ? 'Listening' : 'Ready'}
                  </div>
                  <div className="session-time-value">
                    {formatTime(elapsedTime)}
                  </div>
                  <div className="session-time-total">
                    of {formatTime(trackDuration)}
                  </div>
                </div>
              </div>

              {isActive && sessionId && (
                <div className="session-id-display">
                  <span className="session-id-label">Session ID:</span>
                  <span className="session-id-value">{sessionId}</span>
                </div>
              )}

              {/* Mini track info below timer */}
              <div className="session-timer-track-info">
                <div className="session-timer-track-title-row">
                  <h4 className="session-timer-track-title">{selectedTrack.title}</h4>
                  {masteryInfo && (masteryInfo.isMastered || masteryInfo.prestigeLevel > 0) && (
                    <MasteryBadge
                      isMastered={masteryInfo.isMastered}
                      prestigeLevel={masteryInfo.prestigeLevel}
                      prestigeRoman={masteryInfo.prestigeRoman}
                      isMaxPrestige={masteryInfo.isMaxPrestige}
                      size="sm"
                    />
                  )}
                </div>
                <p className="session-timer-track-artist">{selectedTrack.artist}</p>
              </div>
            </Card>

            {/* Right Card: Combined XP + Mastery/Prestige Info */}
            <Card variant="elevated" padding="lg" className="session-combined-info-card">
              <CardContent className="session-combined-info-content">
                {/* Character XP Section */}
                {activeCharacter && (
                  <div className="session-combined-xp-section">
                    <div className="session-combined-header">
                      <div className="session-combined-avatar">
                        <User className="session-combined-icon" size={16} />
                      </div>
                      <div className="session-combined-char-info">
                        <span className="session-combined-char-name">{activeCharacter.name}</span>
                        <span className="session-combined-char-level">Level {activeCharacter.level} {activeCharacter.class}</span>
                      </div>
                      {activeCharacter.gameMode && (
                        <span className={`session-combined-mode-badge ${activeCharacter.gameMode}`}>
                          {activeCharacter.gameMode === 'standard' ? 'CAPPED' : 'UNCAPPED'}
                        </span>
                      )}
                    </div>

                    {/* XP Progress */}
                    <div className="session-combined-xp-progress">
                      <div className="session-combined-xp-stats">
                        <div className="session-combined-xp-stat">
                          <span className="session-combined-xp-label">Total XP</span>
                          <span className="session-combined-xp-value">
                            {formatXP(activeCharacter.xp.current + displayedXP)}
                          </span>
                          {displayedXP > 0 && (
                            <span className="session-combined-xp-session">+{formatXP(displayedXP)}</span>
                          )}
                        </div>
                        <div className="session-combined-xp-stat">
                          <span className="session-combined-xp-label">Next Level</span>
                          <span className="session-combined-xp-value">{activeCharacter.xp.next_level.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="session-combined-xp-bar-container">
                        <div
                          className="session-combined-xp-bar"
                          style={{ width: `${xpProgress ? Math.min(xpProgress.progressPercent, 100) : 0}%` }}
                        />
                      </div>
                      <div className="session-combined-xp-hint">
                        {formatXP(xpProgress ? xpProgress.xpNeeded : activeCharacter.xp.next_level)} XP to next level
                      </div>
                    </div>

                    {/* Pending Stat Increases */}
                    {activeCharacter.pendingStatIncreases && activeCharacter.pendingStatIncreases > 0 && (
                      <div
                        className="session-combined-pending-alert"
                        onClick={handleOpenStatModal}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleOpenStatModal();
                          }
                        }}
                        aria-label="Open stat selection modal"
                      >
                        <TrendingUp size={12} />
                        <span>{activeCharacter.pendingStatIncreases} stat increase{activeCharacter.pendingStatIncreases > 1 ? 's' : ''} pending</span>
                      </div>
                    )}
                  </div>
                )}

                {/* No active character warning */}
                {!activeCharacter && (
                  <div className="session-combined-no-char">
                    <User size={16} />
                    <span>No active character. Select one from the Party tab.</span>
                  </div>
                )}

                {/* Divider between XP and Mastery */}
                {activeCharacter && masteryInfo && masteryInfo.listenCount > 0 && (
                  <div className="session-combined-divider" />
                )}

                {/* Mastery/Prestige Section */}
                {masteryInfo && masteryInfo.listenCount > 0 && (
                  <div className="session-combined-mastery-section">
                    <div className="session-combined-mastery-header">
                      <Star size={14} className="session-combined-mastery-icon" />
                      <span className="session-combined-mastery-label">Track Mastery</span>
                      {masteryInfo && (masteryInfo.isMastered || masteryInfo.prestigeLevel > 0) && (
                        <MasteryBadge
                          isMastered={masteryInfo.isMastered}
                          prestigeLevel={masteryInfo.prestigeLevel}
                          prestigeRoman={masteryInfo.prestigeRoman}
                          isMaxPrestige={masteryInfo.isMaxPrestige}
                          size="sm"
                        />
                      )}
                    </div>

                    <MasteryProgressBar
                      listenCount={masteryInfo.listenCount}
                      totalXP={masteryInfo.totalXP}
                      playsThreshold={masteryInfo.playsThreshold}
                      xpThreshold={masteryInfo.xpThreshold}
                      isMastered={masteryInfo.isMastered}
                      prestigeLevel={masteryInfo.prestigeLevel}
                      prestigeRoman={masteryInfo.prestigeRoman}
                      isMaxPrestige={masteryInfo.isMaxPrestige}
                      compact={true}
                    />

                    <div className="session-combined-listen-count">
                      <Headphones size={12} />
                      <span>Listened {masteryInfo.listenCount} time{masteryInfo.listenCount !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Prestige Button */}
                    {canPrestigeState && prestigeInfo && activeCharacter && (
                      <PrestigeButton
                        canPrestige={canPrestigeState}
                        prestigeInfo={prestigeInfo}
                        character={activeCharacter}
                        onPrestige={handlePrestige}
                      />
                    )}
                  </div>
                )}

                {/* Bonus XP Breakdown (when active) */}
                {isActive && xpBreakdown && (xpBreakdown.environmentalBonusXP > 0 || xpBreakdown.gamingBonusXP > 0 || xpBreakdown.masteryBonusXP > 0) && (
                  <>
                    <div className="session-combined-divider" />
                    <div className="session-combined-bonus-section">
                      <div className="session-combined-bonus-title">Active Bonuses</div>
                      <div className="session-combined-bonus-grid">
                        {xpBreakdown.environmentalBonusXP > 0 && (
                          <div className="session-combined-bonus-item">
                            <Zap size={10} />
                            <span>+{formatXP(xpBreakdown.environmentalBonusXP)} Env</span>
                          </div>
                        )}
                        {xpBreakdown.gamingBonusXP > 0 && (
                          <div className="session-combined-bonus-item">
                            <Gamepad2 size={10} />
                            <span>+{formatXP(xpBreakdown.gamingBonusXP)} Gaming</span>
                          </div>
                        )}
                        {xpBreakdown.masteryBonusXP > 0 && (
                          <div className="session-combined-bonus-item">
                            <Star size={10} />
                            <span>+{formatXP(xpBreakdown.masteryBonusXP)} Mastery</span>
                          </div>
                        )}
                      </div>
                      {xpBreakdown.totalMultiplier > 1 && (
                        <div className="session-combined-multiplier">
                          <span className="session-combined-multiplier-label">Total</span>
                          <span className="session-combined-multiplier-value">{xpBreakdown.totalMultiplier.toFixed(2)}x</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Start/End Session Button Section */}
          <div className="session-action-section">
            {!isActive ? (
              <Button
                variant="primary"
                size="lg"
                leftIcon={Play}
                onClick={handleStart}
                className="session-action-button-prominent"
              >
                Start Session & Play Audio
              </Button>
            ) : (
              <Button
                variant="destructive"
                size="lg"
                leftIcon={Pause}
                onClick={handleEnd}
                className="session-action-button-prominent"
              >
                End Session & Stop Audio
              </Button>
            )}
          </div>

          {/* Last Session Data Card */}
          {lastSession && !isActive && (
            <Card variant="elevated" padding="lg" className="session-history-card">
              <CardHeader className="session-history-header">
                <CardTitle>Last Session</CardTitle>
                <CardDescription>
                  Completed at {formatSessionTime(lastSession.end_time)}
                </CardDescription>
              </CardHeader>
              <CardContent className="session-history-content">
                <div className="session-history-grid">
                  <div className="session-history-item">
                    <span className="session-history-label">Track UUID</span>
                    <span className="session-history-value">{lastSession.track_uuid}</span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">Duration</span>
                    <span className="session-history-value">
                      {formatTime(lastSession.duration_seconds)}
                    </span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">Start Time</span>
                    <span className="session-history-value">
                      {formatSessionTime(lastSession.start_time)}
                    </span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">End Time</span>
                    <span className="session-history-value">
                      {formatSessionTime(lastSession.end_time)}
                    </span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">XP Earned</span>
                    <span className="session-history-value">
                      {formatXP(lastSession.total_xp_earned)} XP
                    </span>
                  </div>
                  <div className="session-history-item">
                    <span className="session-history-label">Activity</span>
                    <span className="session-history-value">
                      {lastSession.activity_type || 'Listening'}
                    </span>
                  </div>
                </div>

                {/* Environmental Context */}
                {lastSession.environmental_context && (
                  <div className="session-context-section">
                    <h4 className="session-context-title">Environmental Context</h4>
                    <div className="session-context-grid">
                      {lastSession.environmental_context.geolocation && (
                        <div className="session-context-item session-context-item-location">
                          <span className="session-context-label">Location</span>
                          <span className="session-context-value">
                            {(() => {
                              const coords = getMaskedCoordinates(
                                lastSession.environmental_context.geolocation.latitude,
                                lastSession.environmental_context.geolocation.longitude,
                                localHideLocation
                              );
                              return `${coords.latitude?.toFixed(4)}, ${coords.longitude?.toFixed(4)}`;
                            })()}
                          </span>
                          <button
                            onClick={() => setLocalHideLocation(!localHideLocation)}
                            className="session-context-location-toggle"
                            title={localHideLocation ? 'Show real location' : 'Hide real location'}
                            type="button"
                          >
                            {localHideLocation ? <EyeOff size={12} /> : <Eye size={12} />}
                          </button>
                        </div>
                      )}
                      {lastSession.environmental_context.biome && (
                        <div className="session-context-item">
                          <span className="session-context-label">Biome</span>
                          <span className="session-context-value">
                            {lastSession.environmental_context.biome}
                          </span>
                        </div>
                      )}
                      {lastSession.environmental_context.weather && (
                        <div className="session-context-item">
                          <span className="session-context-label">Weather</span>
                          <span className="session-context-value">
                            {typeof lastSession.environmental_context.weather === 'string'
                              ? lastSession.environmental_context.weather
                              : (() => {
                                  const w = lastSession.environmental_context.weather as { weatherType?: string; temperature?: number };
                                  const parts: string[] = [];
                                  if (w.weatherType) parts.push(w.weatherType);
                                  if (w.temperature !== undefined) parts.push(`${Math.round(w.temperature)}°C`);
                                  return parts.length > 0 ? parts.join(', ') : 'Recorded';
                                })()}
                          </span>
                        </div>
                      )}
                      {lastSession.environmental_context.light && (
                        <div className="session-context-item">
                          <span className="session-context-label">Light Level</span>
                          <span className="session-context-value">
                            {typeof lastSession.environmental_context.light === 'number'
                              ? `${Math.round(lastSession.environmental_context.light)} lux`
                              : 'Recorded'}
                          </span>
                        </div>
                      )}
                      {lastSession.environmental_context.motion && (
                        <div className="session-context-item">
                          <span className="session-context-label">Motion</span>
                          <span className="session-context-value">
                            Recorded
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Gaming Context */}
                {lastSession.gaming_context && (
                  <div className="session-context-section">
                    <h4 className="session-context-title">Gaming Context</h4>
                    <div className="session-context-grid">
                      <div className="session-context-item">
                        <span className="session-context-label">Is Gaming</span>
                        <span className="session-context-value">
                          {lastSession.gaming_context.isActivelyGaming ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div className="session-context-item">
                        <span className="session-context-label">Platform</span>
                        <span className="session-context-value">
                          {lastSession.gaming_context.platformSource}
                        </span>
                      </div>
                      {lastSession.gaming_context.currentGame && (
                        <>
                          <div className="session-context-item">
                            <span className="session-context-label">Game</span>
                            <span className="session-context-value">
                              {lastSession.gaming_context.currentGame.name}
                            </span>
                          </div>
                          <div className="session-context-item">
                            <span className="session-context-label">Session</span>
                            <span className="session-context-value">
                              {lastSession.gaming_context.currentGame.sessionDuration
                                ? `${lastSession.gaming_context.currentGame.sessionDuration} min`
                                : 'N/A'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Session History Panel */}
          <SessionHistoryPanel
            sessions={sessionHistory}
            maxItems={10}
            initiallyCollapsed={false}
          />
        </div>
      )}

      {/* Stat Selection Modal */}
      <StatSelectionModal
        isOpen={showStatModal}
        pendingCount={activeCharacter?.pendingStatIncreases ?? 0}
        currentStats={activeCharacter?.ability_scores}
        gameMode={activeCharacter?.gameMode}
        activeEffects={activeStatEffects}
        onApply={handleApplyStats}
        onCancel={handleCloseStatModal}
      />
    </div>
  );
}

export default SessionTrackingTab;
