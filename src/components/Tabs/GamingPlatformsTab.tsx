import { useState } from 'react';
import { useGamingPlatforms } from '../../hooks/useGamingPlatforms';
import { useAppStore } from '@/store/appStore';

export function GamingPlatformsTab() {
  const { connectSteam, connectDiscord, gamingContext } = useGamingPlatforms();
  const { settings, updateSettings } = useAppStore();
  const [steamId, setSteamId] = useState('');
  const [discordConnected, setDiscordConnected] = useState(false);
  const [steamConnected, setSteamConnected] = useState(false);

  const handleConnectSteam = async () => {
    const success = await connectSteam(steamId);
    if (success) {
      setSteamConnected(true);
    }
  };

  const handleConnectDiscord = async () => {
    const success = await connectDiscord();
    if (success) {
      setDiscordConnected(true);
    }
  };

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
            disabled={discordConnected}
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
            disabled={discordConnected || !settings.discordClientId?.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {discordConnected ? 'Connected' : 'Connect Discord'}
          </button>
          {discordConnected && (
            <span className="text-sm text-green-500">🟢 Connected</span>
          )}
          {!discordConnected && (
            <span className="text-sm text-red-500">🔴 Disconnected</span>
          )}
        </div>
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
