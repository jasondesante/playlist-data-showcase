import { useState, useEffect, useMemo } from 'react';
import { Play, Pause, Clock, Music, Sparkles, Zap, Gamepad2, Star, User, TrendingUp, Headphones } from 'lucide-react';
import { usePlaylistStore } from '../../store/playlistStore';
import { useAudioPlayerStore } from '../../store/audioPlayerStore';
import { useSessionStore } from '../../store/sessionStore';
import { useSessionTracker } from '../../hooks/useSessionTracker';
import { useXPCalculator } from '../../hooks/useXPCalculator';
import { useCharacterStore } from '../../store/characterStore';
import { useCharacterUpdater } from '../../hooks/useCharacterUpdater';
import { useSensorStore } from '../../store/sensorStore';
import { useMastery } from '../../hooks/useMastery';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatSelectionModal } from '../StatSelectionModal';
import { showToast } from '../ui/Toast';
import { MasteryBadge } from '../ui/MasteryBadge';
import { MasteryProgressBar } from '../ui/MasteryProgressBar';
import { PrestigeButton } from '../ui/PrestigeButton';
import { SessionHistoryPanel } from '../ui/SessionHistoryPanel';
import type { ListeningSession, Ability, ISessionTracker } from 'playlist-data-engine';
import './SessionTrackingTab.css';

// XP thresholds for D&D 5e levels 1-20
const XP_THRESHOLDS = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

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
  const [lastSession, setLastSession] = useState<ListeningSession | null>(null);
  const [showStatModal, setShowStatModal] = useState(false);

  // Get active character for XP progress display
  const activeCharacter = getActiveCharacter();

  const { environmentalContext, gamingContext } = useSensorStore();

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
          {/* Hero & Song Section */}
          <div className="session-hero-song-grid">
            {/* Left Card: Hero Info */}
            <Card variant="elevated" padding="lg" className="session-hero-card">
              <CardContent className="session-hero-card-content">
                {activeCharacter && (
                  <>
                    <div className="session-character-header">
                      <div className="session-character-avatar">
                        <User className="session-character-icon" size={20} />
                      </div>
                      <div className="session-character-info">
                        <div className="session-character-name-row">
                          <span className="session-character-name">{activeCharacter.name}</span>
                          {activeCharacter.gameMode && (
                            <span className={`session-character-mode-badge ${activeCharacter.gameMode}`}>
                              {activeCharacter.gameMode === 'standard' ? 'CAPPED' : 'UNCAPPED'}
                            </span>
                          )}
                        </div>
                        <div className="session-character-details">
                          Level {activeCharacter.level} {activeCharacter.race} {activeCharacter.class}
                        </div>
                      </div>
                    </div>
                    <div className="session-character-stats">
                      <div className="session-character-stat-item session-character-stat-xp">
                        <div className="session-character-xp-content">
                          <span className="session-character-stat-label">Total XP</span>
                          <span className="session-character-stat-value">
                            {(activeCharacter.xp.current + displayedXP).toLocaleString()}
                          </span>
                          {displayedXP > 0 && (
                            <span className="session-character-xp-session">
                              +{displayedXP} this session
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="session-character-stat-item">
                        <span className="session-character-stat-label">Next Level</span>
                        <span className="session-character-stat-value">{activeCharacter.xp.next_level.toLocaleString()}</span>
                      </div>
                      <div className="session-character-stat-item">
                        <span className="session-character-stat-label">HP</span>
                        <span className="session-character-stat-value">{activeCharacter.hp.current}/{activeCharacter.hp.max}</span>
                      </div>
                    </div>
                    {/* Pending Stat Increases for Manual Mode */}
                    {activeCharacter.pendingStatIncreases && activeCharacter.pendingStatIncreases > 0 && (
                      <div
                        className="session-pending-stats-alert"
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
                        <TrendingUp className="session-pending-stats-icon" size={14} />
                        <span className="session-pending-stats-text">
                          {activeCharacter.pendingStatIncreases} stat increase{activeCharacter.pendingStatIncreases > 1 ? 's' : ''} pending
                        </span>
                      </div>
                    )}
                    {/* For manual mode, show info about future stat increases */}
                    {(!activeCharacter.pendingStatIncreases || activeCharacter.pendingStatIncreases === 0) && (
                      <div className="session-stat-info">
                        <span className="session-stat-info-text">
                          {activeCharacter.gameMode === 'standard' ? 'Stat increases at levels 4, 8, 12, 16, 19' : 'Stat increases at every level (manual mode)'}
                        </span>
                      </div>
                    )}
                  </>
                )}
                {/* No active character warning */}
                {!activeCharacter && (
                  <div className="session-no-character-warning">
                    <User className="session-no-character-icon" size={18} />
                    <span className="session-no-character-text">
                      No active character. Select one from the Party tab.
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Right Card: Song Info */}
            <Card variant="elevated" padding="lg" className="session-song-card">
              <CardContent className="session-song-card-content">
                <div className="session-song-header">
                  <div className="session-song-image-container">
                    {selectedTrack.image_url ? (
                      <img
                        src={selectedTrack.image_url}
                        alt={selectedTrack.title}
                        className="session-song-image"
                      />
                    ) : (
                      <div className="session-song-image-placeholder">
                        <Music className="session-song-placeholder-icon" size={24} />
                      </div>
                    )}
                    <span className={`session-song-status-badge ${isActive ? 'session-status-active' : 'session-status-inactive'}`}>
                      {isActive ? 'Active' : 'Inactive'}
                    </span>
                    {/* Mastery Badge Overlay */}
                    {masteryInfo && masteryInfo.isMastered && (
                      <div className="session-mastery-badge-overlay">
                        <MasteryBadge
                          isMastered={masteryInfo.isMastered}
                          prestigeLevel={masteryInfo.prestigeLevel}
                          prestigeRoman={masteryInfo.prestigeRoman}
                          isMaxPrestige={masteryInfo.isMaxPrestige}
                          size="sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="session-song-info">
                    <h3 className="session-song-title">{selectedTrack.title}</h3>
                    <p className="session-song-artist">{selectedTrack.artist}</p>
                    <div className="session-song-meta">
                      <span className="session-song-duration">{formatTime(trackDuration)}</span>
                    </div>
                  </div>
                </div>

                {/* Mastery Progress Section */}
                {masteryInfo && masteryInfo.listenCount > 0 && (
                  <div className="session-mastery-section">
                    <div className="session-mastery-header">
                      <Star className="session-mastery-icon" size={14} />
                      <span className="session-mastery-label">Mastery</span>
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
                      className="session-mastery-progress"
                    />
                    <div className="session-listen-count">
                      <Headphones className="session-listen-icon" size={12} />
                      <span className="session-listen-text">
                        Listened {masteryInfo.listenCount} time{masteryInfo.listenCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Prestige Button - shows when character can prestige */}
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

                {/* Real-time XP Display */}
                {isActive && displayedXP > 0 && (
                  <div className="session-xp-display-compact">
                    <Sparkles className="session-xp-icon" size={14} />
                    <span className="session-xp-value-compact">
                      +{displayedXP} XP this session
                    </span>
                  </div>
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

          {/* Timer Section */}
          <div className="session-timer-layout">
            {/* Timer Ring Card - Redesigned compact version */}
            <Card variant="elevated" padding="lg" className={`session-timer-card ${isActive ? 'session-timer-card-active' : ''}`}>
              <div className="session-timer-display">
                <TimerRing
                  progress={isActive ? progress : 0}
                  size={120}
                  strokeWidth={10}
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
            </Card>

            {/* Session Info Card */}
            <Card variant="elevated" padding="lg" className="session-info-card">
              <CardHeader className="session-info-header">
                <CardTitle>Session Details</CardTitle>
                <CardDescription>
                  {isActive ? 'Session in progress' : 'Start a session to track your listening'}
                </CardDescription>
              </CardHeader>
              <CardContent className="session-info-content">
                {/* XP Progress Bar (if active character exists) */}
                {isActive && xpProgress && (
                  <div className="session-xp-progress-section">
                    <div className="session-xp-progress-header">
                      <span className="session-xp-progress-label">
                        Level {xpProgress.level} Progress
                      </span>
                      <span className="session-xp-progress-text">
                        {xpProgress.currentXP.toLocaleString()} / {xpProgress.nextLevelXP.toLocaleString()} XP
                      </span>
                    </div>
                    <div className="session-xp-progress-bar-container">
                      <div
                        className="session-xp-progress-bar"
                        style={{ width: `${Math.min(xpProgress.progressPercent, 100)}%` }}
                      />
                    </div>
                    <div className="session-xp-progress-hint">
                      {xpProgress.xpNeeded.toLocaleString()} XP to next level
                    </div>
                  </div>
                )}

                {/* Bonus XP Breakdown */}
                {isActive && xpBreakdown && (xpBreakdown.environmentalBonusXP > 0 || xpBreakdown.gamingBonusXP > 0 || xpBreakdown.masteryBonusXP > 0) && (
                  <div className="session-bonus-breakdown">
                    <div className="session-bonus-title">Bonus XP Breakdown</div>
                    {xpBreakdown.environmentalBonusXP > 0 && (
                      <div className="session-bonus-item">
                        <span className="session-bonus-label">
                          <Zap size={12} className="session-bonus-icon" />
                          Environmental
                        </span>
                        <span className="session-bonus-value">+{xpBreakdown.environmentalBonusXP} XP</span>
                      </div>
                    )}
                    {xpBreakdown.gamingBonusXP > 0 && (
                      <div className="session-bonus-item">
                        <span className="session-bonus-label">
                          <Gamepad2 size={12} className="session-bonus-icon" />
                          Gaming
                        </span>
                        <span className="session-bonus-value">+{xpBreakdown.gamingBonusXP} XP</span>
                      </div>
                    )}
                    {xpBreakdown.masteryBonusXP > 0 && (
                      <div className="session-bonus-item">
                        <span className="session-bonus-label">
                          <Star size={12} className="session-bonus-icon" />
                          Mastery
                        </span>
                        <span className="session-bonus-value">+{xpBreakdown.masteryBonusXP} XP</span>
                      </div>
                    )}
                    {xpBreakdown.totalMultiplier > 1 && (
                      <div className="session-bonus-total">
                        <span className="session-bonus-total-label">Total Multiplier</span>
                        <span className="session-bonus-total-value">{xpBreakdown.totalMultiplier.toFixed(2)}x</span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
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
                      {lastSession.total_xp_earned} XP
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
                        <div className="session-context-item">
                          <span className="session-context-label">Location</span>
                          <span className="session-context-value">
                            {lastSession.environmental_context.geolocation.latitude?.toFixed(4)}, {lastSession.environmental_context.geolocation.longitude?.toFixed(4)}
                          </span>
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
                              : 'Recorded'}
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
        onApply={handleApplyStats}
        onCancel={handleCloseStatModal}
      />
    </div>
  );
}

export default SessionTrackingTab;
