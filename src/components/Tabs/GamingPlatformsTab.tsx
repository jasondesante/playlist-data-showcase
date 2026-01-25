import { useState, useEffect } from 'react';
import { Gamepad2, Waves, Disc, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import './GamingPlatformsTab.css';
import { useGamingPlatforms } from '../../hooks/useGamingPlatforms';
import { useAppStore } from '@/store/appStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { logger } from '@/utils/logger';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';

/**
 * GamingPlatformsTab Component
 *
 * Gaming platform connection and monitoring dashboard with clean, professional styling.
 * Features:
 * - Steam integration for game activity tracking
 * Discord RPC for music status display
 * Real-time gaming context and XP bonus calculation
 * Platform cards with status indicators
 * Clean card-based layout with smooth animations
 *
 * @example
 * ```tsx
 * <GamingPlatformsTab />
 * ```
 */
export function GamingPlatformsTab() {
  const { connectSteam, connectDiscord, disconnectDiscord, setMusicStatus, clearMusicStatus, calculateGamingBonus, gamingContext, discordConnectionStatus, discordConnectionError, checkActivity } = useGamingPlatforms();
  const { settings, updateSettings } = useAppStore();
  const { selectedTrack } = usePlaylistStore();
  const [steamId, setSteamId] = useState('');
  const [steamConnected, setSteamConnected] = useState(false);
  const [musicStatusActive, setMusicStatusActive] = useState(false);

  // Poll for gaming activity every 30 seconds when Steam is connected
  useEffect(() => {
    if (!steamConnected) return;

    const pollInterval = setInterval(() => {
      logger.info('GamingPlatformSensors', 'Polling gaming activity');
      checkActivity();
    }, 30000);

    // Initial check
    checkActivity();

    return () => clearInterval(pollInterval);
  }, [steamConnected, checkActivity]);

  const handleConnectSteam = async () => {
    const success = await connectSteam(steamId);
    if (success) {
      setSteamConnected(true);
    }
  };

  const handleConnectDiscord = async () => {
    if (discordConnectionStatus === 'connected') {
      await disconnectDiscord();
    } else {
      await connectDiscord();
    }
  };

  const isDiscordConnected = discordConnectionStatus === 'connected';
  const isDiscordConnecting = discordConnectionStatus === 'connecting';

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { type: 'healthy' | 'degraded' | 'error'; label: string }> = {
      connected: { type: 'healthy', label: 'Connected' },
      connecting: { type: 'degraded', label: 'Connecting...' },
      unavailable: { type: 'degraded', label: 'Discord not running' },
      error: { type: 'error', label: 'Connection error' },
      disconnected: { type: 'error', label: 'Disconnected' },
    };

    const config = statusMap[status] || statusMap.disconnected;
    return <StatusIndicator status={config.type} label={config.label} />;
  };

  return (
    <div className="gaming-tab-container">
      {/* Header */}
      <div className="gaming-tab-header">
        <h2 className="gaming-tab-title">Gaming Platforms</h2>
        <span className="gaming-tab-subtitle">Connect Steam and Discord for enhanced XP bonuses</span>
      </div>

      {/* Steam Section */}
      <div className="gaming-platform-card steam">
        <div className="gaming-platform-header">
          <div className="gaming-platform-icon">
            <Gamepad2 size={24} />
          </div>
          <h3 className="gaming-platform-name">Steam Integration</h3>
        </div>

        <div className="gaming-input-group">
          <label className="gaming-input-label" htmlFor="steam-id">Steam User ID</label>
          <input
            id="steam-id"
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            className="gaming-input"
            placeholder="Enter Steam ID..."
            disabled={steamConnected}
          />
        </div>

        <div className="gaming-button-row">
          <button
            onClick={handleConnectSteam}
            disabled={steamConnected || !steamId.trim()}
            className="gaming-connect-btn"
          >
            {steamConnected ? 'Connected' : 'Connect Steam'}
          </button>
          {steamConnected && getStatusBadge('connected')}
        </div>
      </div>

      {/* Discord Section */}
      <div className="gaming-platform-card discord">
        <div className="gaming-platform-header">
          <div className="gaming-platform-icon">
            <Disc size={24} />
          </div>
          <h3 className="gaming-platform-name">Discord Music Status</h3>
        </div>

        <span className="gaming-input-hint">
          Connect Discord to set your music status. Discord RPC can show what music you&apos;re listening to.
          Get your Client ID from the{' '}
          <a
            href="https://discord.com/developers/applications"
            target="_blank"
            rel="noopener noreferrer"
          >
            Discord Developer Portal
          </a>
          .
        </span>

        <div className="gaming-input-group">
          <label className="gaming-input-label" htmlFor="discord-id">Discord Client ID</label>
          <input
            id="discord-id"
            type="text"
            value={settings.discordClientId || ''}
            onChange={(e) => updateSettings({ discordClientId: e.target.value })}
            className="gaming-input"
            placeholder="Enter Discord Client ID..."
            disabled={isDiscordConnected || isDiscordConnecting}
          />
        </div>

        <div className="gaming-button-row">
          <button
            onClick={handleConnectDiscord}
            disabled={isDiscordConnecting || !settings.discordClientId?.trim()}
            className="gaming-connect-btn gaming-discord-btn"
          >
            {isDiscordConnecting ? 'Connecting...' : isDiscordConnected ? 'Disconnect Discord' : 'Connect Discord'}
          </button>
          <span>{getStatusBadge(discordConnectionStatus)}</span>
        </div>

        {discordConnectionError && (
          <div className="gaming-info-card" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', borderColor: 'hsl(var(--destructive) / 0.3)' }}>
            <span className="gaming-info-text" style={{ color: 'hsl(var(--destructive))' }}>
              <AlertCircle size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
              {discordConnectionError}
            </span>
          </div>
        )}

        {isDiscordConnected && (
          <div className="gaming-info-card">
            <span className="gaming-info-text">
              <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Discord is connected! Your music status will update when you play tracks.
            </span>
          </div>
        )}

        {isDiscordConnected && (
          <div className="gaming-music-section">
            <h4 className="gaming-music-title">Set Music Status</h4>
            <span className="gaming-music-description">
              Select a track from the Playlist tab to set your Discord status.
            </span>

            {selectedTrack ? (
              <div>
                <div className="gaming-track-preview">
                  <div className="gaming-track-info">
                    <div className="gaming-track-name">{selectedTrack.title}</div>
                    <div className="gaming-track-artist">{selectedTrack.artist || 'Unknown Artist'}</div>
                  </div>
                  <span className="gaming-track-duration">
                    {selectedTrack.duration
                      ? `${Math.floor(selectedTrack.duration / 60)}:${(selectedTrack.duration % 60).toString().padStart(2, '0')}`
                      : '--:--'}
                  </span>
                </div>

                <div className="gaming-button-row">
                  {!musicStatusActive ? (
                    <button
                      onClick={async () => {
                        const success = await setMusicStatus({
                          songName: selectedTrack.title,
                          artistName: selectedTrack.artist,
                          startTime: Math.floor(Date.now() / 1000),
                          durationSeconds: selectedTrack.duration
                        });
                        if (success) {
                          setMusicStatusActive(true);
                        }
                      }}
                      className="gaming-connect-btn gaming-discord-btn"
                    >
                      <Waves size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                      Set Music Status
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={async () => {
                          const success = await clearMusicStatus();
                          if (success) {
                            setMusicStatusActive(false);
                          }
                        }}
                        className="gaming-connect-btn gaming-disconnect-btn"
                      >
                        Clear Music Status
                      </button>
                      <span className="gaming-info-text" style={{ color: 'hsl(var(--cute-teal))', fontSize: '0.875rem' }}>
                        <CheckCircle2 size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                        Status Active
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="gaming-info-card" style={{ backgroundColor: 'hsl(var(--cute-yellow) / 0.1)', borderColor: 'hsl(var(--cute-yellow) / 0.3)' }}>
                <span className="gaming-info-text" style={{ color: 'hsl(var(--cute-yellow))' }}>
                  <Info size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
                  No track selected. Go to the Playlist tab to select a track.
                </span>
              </div>
            )}
          </div>
        )}

        {discordConnectionStatus === 'unavailable' && (
          <div className="gaming-info-card" style={{ backgroundColor: 'hsl(var(--cute-orange) / 0.1)', borderColor: 'hsl(var(--cute-orange) / 0.3)' }}>
            <span className="gaming-info-text" style={{ color: 'hsl(var(--cute-orange))' }}>
              <Info size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} />
              Discord is not running or no user is logged in. Please open Discord and try again.
            </span>
          </div>
        )}
      </div>

      {/* Gaming Status Display */}
      {gamingContext?.isActivelyGaming && gamingContext.currentGame && (
        <div className="gaming-active-card">
          <h3 className="gaming-active-title">Currently Gaming</h3>

          <div className="gaming-game-display">
            <div className="gaming-game-icon">
              <span>🎮</span>
            </div>
            <div className="gaming-game-info">
              <div className="gaming-game-name">{gamingContext.currentGame.name}</div>
              <div className="gaming-game-source">
                via {gamingContext.currentGame.source === 'steam' ? 'Steam' : gamingContext.currentGame.source}
              </div>
            </div>
          </div>

          {gamingContext.currentGame.genre && gamingContext.currentGame.genre.length > 0 && (
            <div>
              <span className="gaming-genre-label">Genre</span>
              <div className="gaming-genre-list">
                {gamingContext.currentGame.genre.map((genre, index) => (
                  <span key={index} className="gaming-genre-tag">
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {gamingContext.currentGame.sessionDuration !== undefined && (
            <div className="gaming-stats-grid">
              <div className="gaming-stat-item">
                <span className="gaming-stat-label">Session Duration</span>
                <span className="gaming-stat-value">{gamingContext.currentGame.sessionDuration} min</span>
              </div>
              {gamingContext.currentGame.partySize !== undefined && (
                <div className="gaming-stat-item">
                  <span className="gaming-stat-label">Party Size</span>
                  <span className="gaming-stat-value">
                    {gamingContext.currentGame.partySize} {gamingContext.currentGame.partySize === 1 ? 'player' : 'players'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* XP Bonus Display */}
      {gamingContext?.isActivelyGaming && (
        <div className="gaming-bonus-card">
          <h3 className="gaming-bonus-title">Gaming XP Bonus</h3>
          <span className="gaming-bonus-desc">
            Active gaming boosts your XP gain while listening to music.
          </span>

          <div className="gaming-bonus-display">
            <span className="gaming-bonus-value">{calculateGamingBonus().toFixed(2)}x</span>
            <div className="gaming-bonus-label">
              <span className="gaming-bonus-name">XP Multiplier</span>
              <span className="gaming-bonus-desc">Applied to all XP earned while gaming</span>
            </div>
          </div>

          <div className="gaming-bonus-breakdown">
            <span className="gaming-breakdown-title">Bonus Formula Breakdown</span>
            <div className="gaming-breakdown-row">
              <span className="gaming-breakdown-name">Base gaming bonus:</span>
              <span className="gaming-breakdown-value">1.0x</span>
            </div>
            {gamingContext.currentGame?.sessionDuration && (
              <div className="gaming-breakdown-row">
                <span className="gaming-breakdown-name">Session bonus:</span>
                <span className="gaming-breakdown-value">
                  +{Math.min(gamingContext.currentGame.sessionDuration * 0.01, 0.75).toFixed(2)}x
                </span>
              </div>
            )}
            {gamingContext.currentGame?.genre && gamingContext.currentGame.genre.length > 0 && (
              <div className="gaming-breakdown-row">
                <span className="gaming-breakdown-name">Genre bonus:</span>
                <span className="gaming-breakdown-value">
                  +{gamingContext.currentGame.genre.some(g => g.toLowerCase().includes('rpg'))
                    ? '0.20x'
                    : gamingContext.currentGame.genre.some(g => g.toLowerCase().includes('action') || g.toLowerCase().includes('fps'))
                      ? '0.15x'
                      : '0.10x'}
                </span>
              </div>
            )}
            {gamingContext.currentGame?.partySize && gamingContext.currentGame.partySize > 1 && (
              <div className="gaming-breakdown-row">
                <span className="gaming-breakdown-name">Multiplayer bonus:</span>
                <span className="gaming-breakdown-value">+0.15x</span>
              </div>
            )}
            <div className="gaming-breakdown-row">
              <span className="gaming-breakdown-name" style={{ fontWeight: 600 }}>Total (max 1.75x):</span>
              <span className="gaming-breakdown-value" style={{ color: 'hsl(var(--primary))', fontWeight: 700 }}>
                {calculateGamingBonus().toFixed(2)}x
              </span>
            </div>
          </div>

          <div className="gaming-active-indicator">
            <span className="gaming-pulse-dot"></span>
            <span className="gaming-active-text">Bonus Active</span>
          </div>
        </div>
      )}

      {/* Gaming Summary */}
      {gamingContext && (gamingContext.totalGamingMinutes > 0 || (gamingContext.gamesPlayedWhileListening && gamingContext.gamesPlayedWhileListening.length > 0)) && (
        <div className="gaming-platform-card">
          <h3 className="gaming-active-title">Gaming Summary (While Listening)</h3>

          {gamingContext.totalGamingMinutes > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              <span className="gaming-stat-label">Total Gaming Time</span>
              <span className="gaming-summary-time">
                {gamingContext.totalGamingMinutes} minutes
                {gamingContext.totalGamingMinutes >= 60 && (
                  <span className="gaming-summary-subtext">
                    (~{Math.floor(gamingContext.totalGamingMinutes / 60)} hours)
                  </span>
                )}
              </span>
            </div>
          )}

          {gamingContext.gamesPlayedWhileListening && gamingContext.gamesPlayedWhileListening.length > 0 && (
            <div>
              <span className="gaming-stat-label">Games Played While Listening</span>
              <ul className="gaming-games-list">
                {gamingContext.gamesPlayedWhileListening.map((gameName, index) => (
                  <li key={index} className="gaming-game-item">
                    <CheckCircle2 size={14} className="gaming-checkmark" />
                    <span>{gameName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Raw JSON Dump */}
      <div className="gaming-raw-section">
        <div className="gaming-raw-header">
          <h3 className="gaming-raw-title">Raw Gaming Data</h3>
          <StatusIndicator
            status={gamingContext?.isActivelyGaming ? 'healthy' : gamingContext ? 'degraded' : 'error'}
            label={gamingContext?.isActivelyGaming ? 'Active' : gamingContext ? 'Connected' : 'No Data'}
          />
        </div>
        <span className="gaming-raw-subtitle">
          Complete gaming context data from the GamingPlatformSensors module.
        </span>

        {gamingContext ? (
          <RawJsonDump
            data={gamingContext}
            title="Gaming Context (Steam + Discord)"
            timestamp={new Date().toISOString()}
            status={gamingContext.isActivelyGaming ? 'healthy' : 'degraded'}
          />
        ) : (
          <div className="gaming-no-data">
            <span className="gaming-no-data-text">
              No gaming data available. Connect to Steam or Discord to see gaming context data.
            </span>
          </div>
        )}

        <div className="gaming-raw-header">
          <h4 className="gaming-raw-title" style={{ fontSize: '0.875rem' }}>Discord Connection Status</h4>
        </div>
        <RawJsonDump
          data={{
            status: discordConnectionStatus,
            error: discordConnectionError || null,
            isConnected: isDiscordConnected,
            isConnecting: isDiscordConnecting,
            clientId: settings.discordClientId || null
          }}
          title="Discord Connection Details"
          timestamp={new Date().toISOString()}
          status={isDiscordConnected ? 'healthy' : discordConnectionStatus === 'error' ? 'error' : 'degraded'}
        />

        {steamId && (
          <>
            <div className="gaming-raw-header">
              <h4 className="gaming-raw-title" style={{ fontSize: '0.875rem' }}>Steam Connection Status</h4>
            </div>
            <RawJsonDump
              data={{
                steamId: steamId,
                isConnected: steamConnected,
                hasActivity: gamingContext?.isActivelyGaming || false,
                currentGame: gamingContext?.currentGame || null
              }}
              title="Steam Connection Details"
              timestamp={new Date().toISOString()}
              status={steamConnected ? 'healthy' : 'error'}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default GamingPlatformsTab;
