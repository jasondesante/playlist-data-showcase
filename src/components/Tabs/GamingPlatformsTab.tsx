import { useState, useEffect } from 'react';
import { useGamingPlatforms } from '../../hooks/useGamingPlatforms';
import { useAppStore } from '@/store/appStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { logger } from '@/utils/logger';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';

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

    // Initial check
    checkActivity();

    const pollInterval = setInterval(() => {
      logger.info('GamingPlatformSensors', 'Polling gaming activity');
      checkActivity();
    }, 30000);

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

  const getDiscordStatusIndicator = () => {
    switch (discordConnectionStatus) {
      case 'connected':
        return <span className="text-sm text-green-500">🟢 Connected</span>;
      case 'connecting':
        return <span className="text-sm text-yellow-500">🟡 Connecting...</span>;
      case 'unavailable':
        return <span className="text-sm text-orange-500">🟠 Discord not running</span>;
      case 'error':
        return <span className="text-sm text-red-500">🔴 Connection error</span>;
      default:
        return <span className="text-sm text-gray-500">⚪ Disconnected</span>;
    }
  };

  const isDiscordConnected = discordConnectionStatus === 'connected';
  const isDiscordConnecting = discordConnectionStatus === 'connecting';

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Gaming Platforms</h2>

      {/* Steam Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Steam Integration</h3>
        <div>
          <label className="block text-sm font-medium mb-2">Steam User ID</label>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter Steam ID..."
            disabled={steamConnected}
          />
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleConnectSteam}
            disabled={steamConnected || !steamId.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {steamConnected ? 'Connected' : 'Connect Steam'}
          </button>
          {steamConnected && (
            <span className="text-sm text-green-500">🟢 Connected</span>
          )}
        </div>
      </div>

      {/* Discord Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Discord Music Status</h3>
        <p className="text-sm text-muted-foreground">
          Connect Discord to set your music status. Discord RPC can only show what music you&apos;re listening to, not read game activity.
        </p>
        <div>
          <label className="block text-sm font-medium mb-2">Discord Client ID</label>
          <input
            type="text"
            value={settings.discordClientId || ''}
            onChange={(e) => updateSettings({ discordClientId: e.target.value })}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter Discord Client ID..."
            disabled={isDiscordConnected || isDiscordConnecting}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Get your Client ID from the{' '}
            <a
              href="https://discord.com/developers/applications"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Discord Developer Portal
            </a>
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleConnectDiscord}
            disabled={isDiscordConnecting || !settings.discordClientId?.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDiscordConnecting ? 'Connecting...' : isDiscordConnected ? 'Disconnect Discord' : 'Connect Discord'}
          </button>
          {getDiscordStatusIndicator()}
        </div>
        {discordConnectionError && (
          <p className="text-sm text-red-500">{discordConnectionError}</p>
        )}
        {isDiscordConnected && (
          <>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
              <p className="text-sm text-green-800 dark:text-green-200">
                ✓ Discord is connected! When you play music, your status will update to show what you&apos;re listening to.
              </p>
            </div>

            {/* Music Status Section */}
            <div className="mt-4 p-4 bg-card border border-border rounded-md">
              <h4 className="text-sm font-semibold mb-2">Set Music Status</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Set your Discord status to show what music you&apos;re listening to. Select a track from the Playlist Loader tab first.
              </p>

              {selectedTrack ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 bg-muted rounded-md">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{selectedTrack.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{selectedTrack.artist || 'Unknown Artist'}</p>
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">
                      {selectedTrack.duration ? `${Math.floor(selectedTrack.duration / 60)}:${(selectedTrack.duration % 60).toString().padStart(2, '0')}` : 'Unknown duration'}
                    </span>
                  </div>

                  <div className="flex gap-2">
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
                        className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
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
                          className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Clear Music Status
                        </button>
                        <span className="text-sm text-green-600 flex items-center">
                          ✓ Status Active
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    No track selected. Go to the Playlist Loader tab to select a track first.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {discordConnectionStatus === 'unavailable' && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md">
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Discord is not running or no user is logged in. Please open Discord and try again.
            </p>
          </div>
        )}
      </div>

      {/* Steam Gaming Status Display */}
      {gamingContext?.isActivelyGaming && gamingContext.currentGame && (
        <div className="p-4 bg-card border border-border rounded-md space-y-4">
          <h3 className="text-lg font-semibold">Steam Gaming Status</h3>

          {/* Current Game */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Currently Playing</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🎮</span>
              </div>
              <div>
                <p className="text-lg font-bold">{gamingContext.currentGame.name}</p>
                <p className="text-sm text-muted-foreground">
                  {gamingContext.currentGame.source === 'steam' ? 'via Steam' : gamingContext.currentGame.source}
                </p>
              </div>
            </div>
          </div>

          {/* Game Genre */}
          {gamingContext.currentGame.genre && gamingContext.currentGame.genre.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Genre</p>
              <div className="flex flex-wrap gap-2">
                {gamingContext.currentGame.genre.map((genre, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Session Details */}
          {gamingContext.currentGame.sessionDuration !== undefined && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Session Duration</p>
                <p className="text-lg font-semibold">
                  {gamingContext.currentGame.sessionDuration} min
                </p>
              </div>
              {gamingContext.currentGame.partySize !== undefined && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Party Size</p>
                  <p className="text-lg font-semibold">
                    {gamingContext.currentGame.partySize} {gamingContext.currentGame.partySize === 1 ? 'player' : 'players'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Gaming Bonus Display */}
      {gamingContext?.isActivelyGaming && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-md space-y-3">
          <h3 className="text-lg font-semibold">Gaming XP Bonus</h3>

          <p className="text-sm text-muted-foreground">
            Active gaming boosts your XP gain while listening to music.
          </p>

          {/* Bonus Multiplier Display */}
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
              {calculateGamingBonus().toFixed(2)}x
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">XP Multiplier</p>
              <p className="text-xs text-muted-foreground">
                Applied to all XP earned while gaming
              </p>
            </div>
          </div>

          {/* Bonus Formula Breakdown */}
          <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
            <p className="text-xs font-semibold mb-2">Bonus Formula Breakdown</p>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base gaming bonus:</span>
                <span className="font-mono">1.0x</span>
              </div>
              {gamingContext.currentGame?.sessionDuration && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Session bonus (minutes × 0.01):</span>
                  <span className="font-mono">+{Math.min(gamingContext.currentGame.sessionDuration * 0.01, 0.75).toFixed(2)}x</span>
                </div>
              )}
              {gamingContext.currentGame?.genre && gamingContext.currentGame.genre.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Genre bonus:</span>
                  <span className="font-mono">
                    +{gamingContext.currentGame.genre.some(g =>
                      g.toLowerCase().includes('rpg')
                    ) ? '0.20x' :
                      gamingContext.currentGame.genre.some(g =>
                        g.toLowerCase().includes('action') || g.toLowerCase().includes('fps')
                      ) ? '0.15x' : '0.10x'
                    }
                  </span>
                </div>
              )}
              {gamingContext.currentGame?.partySize && gamingContext.currentGame.partySize > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Multiplayer bonus:</span>
                  <span className="font-mono">+0.15x</span>
                </div>
              )}
              <div className="border-t border-gray-200 dark:border-gray-600 pt-1 mt-1 flex justify-between font-semibold">
                <span className="text-muted-foreground">Total (capped at 1.75x):</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{calculateGamingBonus().toFixed(2)}x</span>
              </div>
            </div>
          </div>

          {/* Bonus Active Indicator */}
          <div className="flex items-center gap-2 mt-2">
            <span className="animate-pulse w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-sm font-medium text-green-700 dark:text-green-400">
              Bonus Active
            </span>
          </div>
        </div>
      )}

      {/* Gaming Summary Stats */}
      {gamingContext && (gamingContext.totalGamingMinutes > 0 || (gamingContext.gamesPlayedWhileListening && gamingContext.gamesPlayedWhileListening.length > 0)) && (
        <div className="p-4 bg-card border border-border rounded-md space-y-4">
          <h3 className="text-lg font-semibold">Gaming Summary (While Listening)</h3>

          {/* Lifetime Gaming Minutes */}
          {gamingContext.totalGamingMinutes > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Gaming Time</p>
              <p className="text-lg font-semibold">
                {gamingContext.totalGamingMinutes} minutes
                {gamingContext.totalGamingMinutes >= 60 && (
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    (~{Math.floor(gamingContext.totalGamingMinutes / 60)} hours)
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Games Played While Listening */}
          {gamingContext.gamesPlayedWhileListening && gamingContext.gamesPlayedWhileListening.length > 0 && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-2">Games Played While Listening</p>
              <ul className="space-y-1">
                {gamingContext.gamesPlayedWhileListening.map((gameName, index) => (
                  <li key={index} className="text-sm flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>{gameName}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Raw JSON Dump Section - Task 4.8.5 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">Raw Gaming Platform Data</h3>
          <StatusIndicator
            status={gamingContext?.isActivelyGaming ? 'healthy' : gamingContext ? 'degraded' : 'error'}
            label={gamingContext?.isActivelyGaming ? 'Active Gaming' : gamingContext ? 'Connected' : 'No Data'}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Complete gaming context data from the GamingPlatformSensors module, including Steam activity and Discord connection status.
        </p>

        {/* Gaming Context JSON Dump */}
        {gamingContext ? (
          <RawJsonDump
            data={gamingContext}
            title="Gaming Context (Steam + Discord)"
            timestamp={new Date().toISOString()}
            status={gamingContext.isActivelyGaming ? 'healthy' : 'degraded'}
          />
        ) : (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              No gaming data available. Connect to Steam or Discord to see gaming context data.
            </p>
          </div>
        )}

        {/* Discord Connection Status JSON Dump */}
        <div className="mt-4">
          <h4 className="text-sm font-medium text-muted-foreground mb-2">Discord Connection Status</h4>
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
        </div>

        {/* Steam Connection Status JSON Dump */}
        {steamId && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Steam Connection Status</h4>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default GamingPlatformsTab;
