import { useState } from 'react';
import { useGamingPlatforms } from '../../hooks/useGamingPlatforms';
import { useAppStore } from '@/store/appStore';
import { usePlaylistStore } from '@/store/playlistStore';

export function GamingPlatformsTab() {
  const { connectSteam, connectDiscord, disconnectDiscord, setMusicStatus, clearMusicStatus, gamingContext, discordConnectionStatus, discordConnectionError } = useGamingPlatforms();
  const { settings, updateSettings } = useAppStore();
  const { selectedTrack } = usePlaylistStore();
  const [steamId, setSteamId] = useState('');
  const [steamConnected, setSteamConnected] = useState(false);
  const [musicStatusActive, setMusicStatusActive] = useState(false);

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

      {/* Gaming Status Display */}
      {gamingContext && (
        <div className="p-4 bg-card border border-border rounded-md">
          <p className="text-sm font-medium">Gaming Status</p>
          <p className="text-xs text-muted-foreground">
            {gamingContext.isActivelyGaming ? 'Currently Gaming' : 'Not Gaming'}
          </p>
          {gamingContext.currentGame && (
            <p className="text-sm mt-2">
              Playing: <span className="font-semibold">{gamingContext.currentGame.name}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default GamingPlatformsTab;
