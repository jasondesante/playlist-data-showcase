import { useState } from 'react';
import { useGamingPlatforms } from '../../hooks/useGamingPlatforms';

export function GamingPlatformsTab() {
  const { connectSteam, gamingContext } = useGamingPlatforms();
  const [steamId, setSteamId] = useState('');

  const handleConnect = async () => {
    await connectSteam(steamId);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Gaming Platforms</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Steam User ID</label>
          <input
            type="text"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter Steam ID..."
          />
        </div>
        <button
          onClick={handleConnect}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Connect Steam
        </button>

        {gamingContext && (
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Gaming Status</p>
            <p className="text-xs text-muted-foreground">
              {gamingContext.isActivelyGaming ? 'Currently Gaming' : 'Not Gaming'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default GamingPlatformsTab;
