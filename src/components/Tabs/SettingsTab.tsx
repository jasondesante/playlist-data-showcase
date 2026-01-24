import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { useCharacterStore } from '@/store/characterStore';
import { useSensorStore } from '@/store/sensorStore';
import { logger } from '@/utils/logger';
import type { ServerlessPlaylist, PlaylistTrack, AudioProfile } from '@/types';
import type { CharacterSheet } from '@/types';
import type { EnvironmentalContext, GamingContext } from '@/types';

/**
 * SettingsTab Component
 *
 * Application settings for API keys and configuration.
 * Phase 4.10 - Settings Tab Implementation
 */

// Valid FFT sizes for Web Audio API (must be power of 2)
const FFT_SIZE_OPTIONS = [1024, 2048, 4096, 8192] as const;
type FFTSizeOption = (typeof FFT_SIZE_OPTIONS)[number];

// Combined export data structure
interface ExportedData {
  version: string;
  exportedAt: string;
  playlistStore: {
    currentPlaylist: ServerlessPlaylist | null;
    selectedTrack: PlaylistTrack | null;
    audioProfile: AudioProfile | null;
    isLoading: boolean;
    error: string | null;
    rawResponseData: unknown;
    parsedTimestamp: string | null;
  };
  characterStore: {
    characters: CharacterSheet[];
    activeCharacterId: string | null;
  };
  sensorStore: {
    permissions: {
      geolocation: PermissionState;
      motion: PermissionState;
      light: PermissionState;
    };
    environmentalContext: EnvironmentalContext | null;
    gamingContext: GamingContext | null;
  };
  appStore: {
    settings: {
      openWeatherApiKey: string;
      steamApiKey: string;
      discordClientId: string;
      audioSampleRate: number;
      audioFftSize: number;
      baseXpRate: number;
    };
  };
}

export function SettingsTab() {
  const { settings, updateSettings } = useAppStore();
  const playlistStore = usePlaylistStore();
  const characterStore = useCharacterStore();
  const sensorStore = useSensorStore();
  const [openWeatherKey, setOpenWeatherKey] = useState(settings.openWeatherApiKey);
  const [steamKey, setSteamKey] = useState(settings.steamApiKey);
  const [discordClientId, setDiscordClientId] = useState(settings.discordClientId);
  const [audioFftSize, setAudioFftSize] = useState(settings.audioFftSize);
  const [baseXpRate, setBaseXpRate] = useState(settings.baseXpRate);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');

  // Initialize local state from store
  useEffect(() => {
    setOpenWeatherKey(settings.openWeatherApiKey);
    setSteamKey(settings.steamApiKey);
    setDiscordClientId(settings.discordClientId);
    setAudioFftSize(settings.audioFftSize);
    setBaseXpRate(settings.baseXpRate);
  }, [settings.openWeatherApiKey, settings.steamApiKey, settings.discordClientId, settings.audioFftSize, settings.baseXpRate]);

  const handleOpenWeatherKeyChange = (value: string) => {
    setOpenWeatherKey(value);
    updateSettings({ openWeatherApiKey: value });
    setSaveIndicator('saved');
    setTimeout(() => setSaveIndicator(null), 2000);
  };

  const handleSteamKeyChange = (value: string) => {
    setSteamKey(value);
    updateSettings({ steamApiKey: value });
    setSaveIndicator('saved');
    setTimeout(() => setSaveIndicator(null), 2000);
  };

  const handleDiscordClientIdChange = (value: string) => {
    setDiscordClientId(value);
    updateSettings({ discordClientId: value });
    setSaveIndicator('saved');
    setTimeout(() => setSaveIndicator(null), 2000);
  };

  const handleAudioFftSizeChange = (value: string) => {
    const size = parseInt(value, 10) as FFTSizeOption;
    setAudioFftSize(size);
    updateSettings({ audioFftSize: size });
    setSaveIndicator('saved');
    setTimeout(() => setSaveIndicator(null), 2000);
  };

  const handleBaseXpRateChange = (value: number) => {
    setBaseXpRate(value);
    updateSettings({ baseXpRate: value });
    setSaveIndicator('saved');
    setTimeout(() => setSaveIndicator(null), 2000);
  };

  const handleExportAllData = () => {
    try {
      setExportStatus('exporting');
      logger.info('Settings', 'Exporting all data');

      // Gather data from all stores - extract state directly from hook returns
      const exportedData: ExportedData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        playlistStore: {
          currentPlaylist: playlistStore.currentPlaylist,
          selectedTrack: playlistStore.selectedTrack,
          audioProfile: playlistStore.audioProfile,
          isLoading: playlistStore.isLoading,
          error: playlistStore.error,
          rawResponseData: playlistStore.rawResponseData,
          parsedTimestamp: playlistStore.parsedTimestamp,
        },
        characterStore: {
          characters: characterStore.characters,
          activeCharacterId: characterStore.activeCharacterId,
        },
        sensorStore: {
          permissions: sensorStore.permissions,
          environmentalContext: sensorStore.environmentalContext,
          gamingContext: sensorStore.gamingContext,
        },
        appStore: {
          settings: settings,
        },
      };

      // Create JSON string with pretty formatting
      const jsonString = JSON.stringify(exportedData, null, 2);

      // Create a blob and trigger download
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `playlist-showcase-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportStatus('success');
      logger.info('Settings', 'Export completed successfully');

      // Reset status after 3 seconds
      setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      setExportStatus('error');
      logger.error('Settings', 'Export failed', error);
      setTimeout(() => setExportStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Settings</h2>
        {saveIndicator === 'saved' && (
          <span className="text-sm text-green-600">✓ Saved</span>
        )}
      </div>

      <p className="text-muted-foreground">Configure API keys and application settings...</p>

      {/* API Keys Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">API Keys</h3>

        <div>
          <label className="block text-sm font-medium mb-2">OpenWeather API Key</label>
          <input
            type="text"
            value={openWeatherKey}
            onChange={(e) => handleOpenWeatherKeyChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter OpenWeather API key..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for weather data in Environmental Sensors tab. Get your key at{' '}
            <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              openweathermap.org
            </a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Steam API Key</label>
          <input
            type="text"
            value={steamKey}
            onChange={(e) => handleSteamKeyChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter Steam API key..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for Steam integration in Gaming Platforms tab. Get your key at{' '}
            <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              steamcommunity.com
            </a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Discord Client ID</label>
          <input
            type="text"
            value={discordClientId}
            onChange={(e) => handleDiscordClientIdChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter Discord Client ID..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            For Discord music status integration. Create an app at{' '}
            <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              discord.com/developers
            </a>
          </p>
        </div>
      </div>

      {/* Audio Settings Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Audio Settings</h3>

        <div>
          <label className="block text-sm font-medium mb-2">
            Audio FFT Size: <span className="text-primary">{audioFftSize}</span>
          </label>
          <select
            value={audioFftSize}
            onChange={(e) => handleAudioFftSizeChange(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
          >
            {FFT_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground mt-1">
            FFT size for audio analysis. Larger values provide better frequency resolution but slower performance.
            <br />
            <span className="text-muted-foreground">
              • <strong>1024</strong>: Fast, less detailed (recommended for real-time)
            </span>
            <br />
            <span className="text-muted-foreground">
              • <strong>2048</strong>: Balanced (default)
            </span>
            <br />
            <span className="text-muted-foreground">
              • <strong>4096+</strong>: Detailed, slower (better for offline analysis)
            </span>
          </p>
        </div>
      </div>

      {/* XP Settings Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">XP Settings</h3>

        <div>
          <label className="block text-sm font-medium mb-2">
            Base XP Rate: <span className="text-primary">{baseXpRate.toFixed(1)}x</span>
          </label>
          <input
            type="range"
            min={0.1}
            max={5.0}
            step={0.1}
            value={baseXpRate}
            onChange={(e) => handleBaseXpRateChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-background border border-input rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0.1x (slow)</span>
            <span>1.0x (normal)</span>
            <span>5.0x (fast)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Base XP earned per second of listening. Default is 1.0 (1 XP per second).
            <br />
            This rate is modified by environmental and gaming bonuses (capped at 3.0x total multiplier).
          </p>
        </div>
      </div>

      {/* Data Management Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Data Management</h3>

        <div className="border border-border rounded-lg p-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Export all your data from the showcase app, including playlists, characters, sensor data, and settings.
          </p>

          <button
            onClick={handleExportAllData}
            disabled={exportStatus === 'exporting'}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {exportStatus === 'exporting' && (
              <span className="animate-spin">⏳</span>
            )}
            {exportStatus === 'success' && (
              <span>✓</span>
            )}
            {exportStatus === 'error' && (
              <span>✗</span>
            )}
            {exportStatus === 'idle' && (
              <span>📥</span>
            )}
            <span>
              {exportStatus === 'exporting' && 'Exporting...'}
              {exportStatus === 'success' && 'Export Complete!'}
              {exportStatus === 'error' && 'Export Failed'}
              {exportStatus === 'idle' && 'Export All Data to JSON'}
            </span>
          </button>

          {exportStatus === 'success' && (
            <p className="text-xs text-green-600 text-center">
              Data exported successfully! Check your downloads folder.
            </p>
          )}

          {exportStatus === 'error' && (
            <p className="text-xs text-red-600 text-center">
              Failed to export data. Please try again.
            </p>
          )}

          <div className="text-xs text-muted-foreground border-t border-border pt-3 mt-3">
            <p className="font-medium mb-1">Export includes:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Playlist: Current playlist, selected track, audio profile</li>
              <li>Characters: All generated characters with stats and XP</li>
              <li>Sensors: Environmental context, gaming context, permissions</li>
              <li>Settings: API keys, audio config, XP rate</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
