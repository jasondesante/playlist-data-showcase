import { useState } from 'react';
import { usePlaylistParser } from '../../hooks/usePlaylistParser';
import { usePlaylistStore } from '../../store/playlistStore';
import type { PlaylistTrack } from '../../types';

/**
 * PlaylistLoaderTab Component
 *
 * Demonstrates the PlaylistParser engine module by:
 * 1. Accepting an Arweave transaction ID
 * 2. Fetching and parsing the playlist JSON
 * 3. Displaying track list with selection
 * 4. Showing raw response data (for debugging/engine verification)
 */
export function PlaylistLoaderTab() {
  const [txId, setTxId] = useState('');
  const { parsePlaylist } = usePlaylistParser();
  const { currentPlaylist, selectedTrack, isLoading, error, selectTrack } = usePlaylistStore();

  const handleParse = async () => {
    if (!txId.trim()) return;
    await parsePlaylist(txId.trim());
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-4">Playlist Parser</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Arweave Transaction ID</label>
            <input
              type="text"
              value={txId}
              onChange={(e) => setTxId(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-md"
              placeholder="Enter Arweave TX ID..."
              disabled={isLoading}
            />
          </div>
          <button
            onClick={handleParse}
            disabled={isLoading || !txId.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'Fetch & Parse Playlist'}
          </button>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive rounded-md">
              <p className="text-destructive font-medium">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      {currentPlaylist && (
        <div className="space-y-4">
          <div className="p-4 bg-accent rounded-md">
            <h3 className="font-bold text-lg">{currentPlaylist.name}</h3>
            <p className="text-sm text-muted-foreground">{currentPlaylist.tracks.length} tracks</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Tracks:</h4>
            {currentPlaylist.tracks.map((track: PlaylistTrack, idx: number) => (
              <div
                key={idx}
                onClick={() => selectTrack(track)}
                className={`p-3 border rounded-md cursor-pointer transition-colors ${selectedTrack?.title === track.title
                  ? 'bg-primary/20 border-primary'
                  : 'bg-card border-border hover:bg-accent'
                  }`}
              >
                <p className="font-medium">{track.title}</p>
                <p className="text-sm text-muted-foreground">{track.artist}</p>
                {track.duration && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2, '0')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaylistLoaderTab;
