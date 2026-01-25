import { useState } from 'react';
import { Music } from 'lucide-react';
import { usePlaylistParser } from '../../hooks/usePlaylistParser';
import { usePlaylistStore } from '../../store/playlistStore';
import { RawJsonDump } from '../ui/RawJsonDump';
import { StatusIndicator } from '../ui/StatusIndicator';
import type { PlaylistTrack } from '../../types';
import { EXAMPLE_PLAYLIST_ARWEAVE_TX_ID } from '../../constants/examplePlaylists';

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
  const [txId, setTxId] = useState(EXAMPLE_PLAYLIST_ARWEAVE_TX_ID);
  const { parsePlaylist } = usePlaylistParser();
  const {
    currentPlaylist,
    selectedTrack,
    isLoading,
    error,
    selectTrack,
    rawResponseData,
    parsedTimestamp
  } = usePlaylistStore();

  const handleParse = async () => {
    if (!txId.trim()) return;
    await parsePlaylist(txId.trim());
  };

  // Determine status indicator based on current state
  const getFetchStatus = (): 'healthy' | 'degraded' | 'error' => {
    if (error) return 'error';
    if (isLoading) return 'degraded';
    if (currentPlaylist) return 'healthy';
    return 'degraded'; // Default state
  };

  return (
    <div className="space-y-6">
      {/* Header with Status Indicator */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/20">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Playlist Parser</h2>
          </div>
          <p className="text-sm text-muted-foreground pl-13">Load playlists from Arweave</p>
        </div>
        <StatusIndicator
          status={getFetchStatus()}
          label={error ? 'Error' : isLoading ? 'Loading...' : currentPlaylist ? 'Ready' : 'Idle'}
        />
      </div>

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

      {currentPlaylist && (
        <div className="space-y-4">
          <div className="p-4 bg-accent rounded-md">
            <h3 className="font-bold text-lg">{currentPlaylist.name}</h3>
            <p className="text-sm text-muted-foreground">{currentPlaylist.tracks.length} tracks</p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Tracks ({currentPlaylist.tracks.length}):</h4>
            <div className="max-h-[300px] md:max-h-[400px] overflow-y-auto space-y-2 pr-2">
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

          {/* Raw JSON Dump Section - for debugging and engine verification */}
          <div className="space-y-4 pt-4 border-t border-border">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Raw Data (Debug)</h4>

            {/* Raw Arweave Response */}
            {rawResponseData != null && parsedTimestamp && (
              <RawJsonDump
                data={rawResponseData}
                title="Raw Arweave Response / Input JSON"
                timestamp={parsedTimestamp}
                status={error ? 'error' : 'healthy'}
                defaultOpen={false}
              />
            )}

            {/* Parsed ServerlessPlaylist Object */}
            {parsedTimestamp && (
              <RawJsonDump
                data={currentPlaylist}
                title="Parsed ServerlessPlaylist Object"
                timestamp={parsedTimestamp}
                status="healthy"
                defaultOpen={false}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default PlaylistLoaderTab;
