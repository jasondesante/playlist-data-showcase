import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { useCharacterStore } from '@/store/characterStore';
import { useSensorStore } from '@/store/sensorStore';
import { logger } from '@/utils/logger';
import { storage } from '@/utils/storage';
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

// API key validation status type
type ApiKeyValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid';

// API key validation result interface
interface ApiKeyValidationResult {
  status: ApiKeyValidationStatus;
  message?: string;
}

/**
 * Validates OpenWeather API key by making a test API call
 * @param apiKey - The OpenWeather API key to validate
 * @returns Promise resolving to validation result
 */
async function validateOpenWeatherApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { status: 'idle' };
  }

  try {
    // Use a simple weather query for London (lat=51.5074, lon=-0.1278) as a test
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=51.5074&lon=-0.1278&appid=${apiKey.trim()}&units=metric`;
    const response = await fetch(url);

    if (response.status === 401) {
      return {
        status: 'invalid',
        message: 'Invalid API key. Please check your OpenWeather API key and try again.'
      };
    }

    if (response.status === 404) {
      return {
        status: 'invalid',
        message: 'API key not found. Please make sure you have a valid OpenWeather API key.'
      };
    }

    if (!response.ok) {
      return {
        status: 'invalid',
        message: `OpenWeather API error (${response.status}): ${response.statusText}`
      };
    }

    // If we get here, the key is valid
    return {
      status: 'valid',
      message: 'API key validated successfully!'
    };
  } catch (error) {
    return {
      status: 'invalid',
      message: 'Network error. Please check your internet connection and try again.'
    };
  }
}

/**
 * Validates Steam API key by making a test API call
 * @param apiKey - The Steam API key to validate
 * @returns Promise resolving to validation result
 */
async function validateSteamApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { status: 'idle' };
  }

  try {
    // Use the GetPlayerSummaries endpoint with a known test Steam ID (Valve's account: 76561197960287930)
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${apiKey.trim()}&steamids=76561197960287930`;
    const response = await fetch(url);

    const data = await response.json();

    // Steam API returns 403 with {"error": "Forbidden"} for invalid keys
    if (response.status === 403 || (data.error && data.error === 'Forbidden')) {
      return {
        status: 'invalid',
        message: 'Invalid API key. Please check your Steam API key and try again.'
      };
    }

    // Check for specific Steam API error responses
    if (data.error) {
      return {
        status: 'invalid',
        message: `Steam API error: ${data.error}`
      };
    }

    // If we get valid response structure, the key is working
    if (data.response && data.response.players) {
      return {
        status: 'valid',
        message: 'API key validated successfully!'
      };
    }

    return {
      status: 'invalid',
      message: 'Unexpected response from Steam API. Please check your API key.'
    };
  } catch (error) {
    return {
      status: 'invalid',
      message: 'Network error. Please check your internet connection and try again.'
    };
  }
}

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
      verboseLogging: boolean;
    };
  };
}

export function SettingsTab() {
  const { settings, updateSettings, resetSettings } = useAppStore();
  const playlistStore = usePlaylistStore();
  const characterStore = useCharacterStore();
  const sensorStore = useSensorStore();
  const [openWeatherKey, setOpenWeatherKey] = useState(settings.openWeatherApiKey);
  const [steamKey, setSteamKey] = useState(settings.steamApiKey);
  const [discordClientId, setDiscordClientId] = useState(settings.discordClientId);
  const [audioFftSize, setAudioFftSize] = useState(settings.audioFftSize);
  const [baseXpRate, setBaseXpRate] = useState(settings.baseXpRate);
  const [verboseLogging, setVerboseLogging] = useState(settings.verboseLogging);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'confirming' | 'resetting' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState<string>('');

  // API key validation states
  const [openWeatherValidation, setOpenWeatherValidation] = useState<ApiKeyValidationResult>({ status: 'idle' });
  const [steamValidation, setSteamValidation] = useState<ApiKeyValidationResult>({ status: 'idle' });

  // Ref to track if confirmation timeout is active
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize local state from store (only on mount to avoid bidirectional sync loops)
  const isInitialized = useRef(false);
  useEffect(() => {
    if (!isInitialized.current) {
      setOpenWeatherKey(settings.openWeatherApiKey);
      setSteamKey(settings.steamApiKey);
      setDiscordClientId(settings.discordClientId);
      setAudioFftSize(settings.audioFftSize);
      setBaseXpRate(settings.baseXpRate);
      setVerboseLogging(settings.verboseLogging);
      isInitialized.current = true;
    }
  }, [settings.openWeatherApiKey, settings.steamApiKey, settings.discordClientId, settings.audioFftSize, settings.baseXpRate, settings.verboseLogging]);

  // Sync verbose logging with logger utility
  useEffect(() => {
    logger.setVerbose(settings.verboseLogging);
  }, [settings.verboseLogging]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

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

  const handleVerboseLoggingChange = (checked: boolean) => {
    setVerboseLogging(checked);
    updateSettings({ verboseLogging: checked });
    logger.setVerbose(checked);
    setSaveIndicator('saved');
    setTimeout(() => setSaveIndicator(null), 2000);
    if (checked) {
      logger.info('Settings', 'Verbose logging enabled');
    }
  };

  // Debounced OpenWeather API key validation
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (openWeatherKey && openWeatherKey.length > 0) {
        setOpenWeatherValidation({ status: 'validating' });
        const result = await validateOpenWeatherApiKey(openWeatherKey);
        setOpenWeatherValidation(result);
        logger.info('Settings', `OpenWeather API key validation: ${result.status}`, { message: result.message });
      } else {
        setOpenWeatherValidation({ status: 'idle' });
      }
    }, 1500); // 1.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [openWeatherKey]);

  // Debounced Steam API key validation
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (steamKey && steamKey.length > 0) {
        setSteamValidation({ status: 'validating' });
        const result = await validateSteamApiKey(steamKey);
        setSteamValidation(result);
        logger.info('Settings', `Steam API key validation: ${result.status}`, { message: result.message });
      } else {
        setSteamValidation({ status: 'idle' });
      }
    }, 1500); // 1.5 second debounce

    return () => clearTimeout(timeoutId);
  }, [steamKey]);

  const handleExportAllData = () => {
    try {
      setExportStatus('exporting');
      logger.info('Settings', 'Exporting all data');

      // Performance timing: Start timer
      const startTime = performance.now();

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

      // Performance timing: Calculate elapsed time
      const endTime = performance.now();
      const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);
      const fileSizeKB = (jsonString.length / 1024).toFixed(2);
      const performanceTarget = parseFloat(elapsedSeconds) < 5.0 ? 'PASS' : 'FAIL';

      setExportStatus('success');
      logger.info('Settings', 'Export completed successfully', {
        characters: exportedData.characterStore.characters.length,
        fileSizeKB,
        exportTimeSeconds: elapsedSeconds,
        performanceTarget,
      });

      // Reset status after 3 seconds
      void setTimeout(() => setExportStatus('idle'), 3000);
    } catch (error) {
      setExportStatus('error');
      logger.error('Settings', 'Export failed', error);
      void setTimeout(() => setExportStatus('idle'), 3000);
    }
  };

  const handleImportFromFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportStatus('importing');
      setImportMessage('');
      logger.info('Settings', 'Importing data from file', { fileName: file.name, fileSize: file.size });

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const jsonContent = e.target?.result as string;
          const importedData = JSON.parse(jsonContent) as ExportedData;

          // Validate the imported data structure
          if (!importedData.version || !importedData.playlistStore || !importedData.characterStore ||
              !importedData.sensorStore || !importedData.appStore) {
            throw new Error('Invalid file structure: missing required fields');
          }

          // Load data into each store

          // 1. Restore playlist store data
          if (importedData.playlistStore.currentPlaylist) {
            playlistStore.setPlaylist(
              importedData.playlistStore.currentPlaylist,
              importedData.playlistStore.rawResponseData
            );
            if (importedData.playlistStore.selectedTrack) {
              playlistStore.selectTrack(importedData.playlistStore.selectedTrack);
            }
            if (importedData.playlistStore.audioProfile) {
              playlistStore.setAudioProfile(importedData.playlistStore.audioProfile);
            }
            if (importedData.playlistStore.error) {
              playlistStore.setError(importedData.playlistStore.error);
            }
          }

          // 2. Restore character store data
          if (importedData.characterStore.characters.length > 0) {
            importedData.characterStore.characters.forEach(character => {
              const existing = characterStore.characters.find(c => c.seed === character.seed);
              if (!existing) {
                characterStore.addCharacter(character);
              }
            });
            if (importedData.characterStore.activeCharacterId) {
              characterStore.setActiveCharacter(importedData.characterStore.activeCharacterId);
            }
          }

          // 3. Restore sensor store data
          if (importedData.sensorStore.permissions) {
            Object.entries(importedData.sensorStore.permissions).forEach(([sensor, status]) => {
              sensorStore.setPermission(sensor as 'geolocation' | 'motion' | 'light', status as PermissionState);
            });
          }
          if (importedData.sensorStore.environmentalContext) {
            sensorStore.updateEnvironmentalContext(importedData.sensorStore.environmentalContext);
          }
          if (importedData.sensorStore.gamingContext) {
            sensorStore.updateGamingContext(importedData.sensorStore.gamingContext);
          }

          // 4. Restore app store settings
          if (importedData.appStore.settings) {
            updateSettings(importedData.appStore.settings);
          }

          setImportStatus('success');
          setImportMessage(`Imported data from ${new Date(importedData.exportedAt).toLocaleString()}`);
          logger.info('Settings', 'Import completed successfully', {
            version: importedData.version,
            exportedAt: importedData.exportedAt,
            characters: importedData.characterStore.characters.length,
            playlist: importedData.playlistStore.currentPlaylist?.name
          });

          // Reset status after 5 seconds
          void setTimeout(() => {
            setImportStatus('idle');
            setImportMessage('');
          }, 5000);
        } catch (parseError) {
          setImportStatus('error');
          setImportMessage(parseError instanceof Error ? parseError.message : 'Failed to parse JSON file');
          logger.error('Settings', 'Import failed - parse error', parseError);
          void setTimeout(() => setImportStatus('idle'), 5000);
        }
      };

      reader.onerror = () => {
        setImportStatus('error');
        setImportMessage('Failed to read file');
        logger.error('Settings', 'Import failed - file read error');
        void setTimeout(() => setImportStatus('idle'), 5000);
      };

      reader.readAsText(file);
    } catch (error) {
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : 'Import failed');
      logger.error('Settings', 'Import failed', error);
      void setTimeout(() => setImportStatus('idle'), 5000);
    }
  };

  const handleResetToDefaults = () => {
    if (resetStatus === 'confirming') {
      // User confirmed - proceed with reset
      try {
        setResetStatus('resetting');
        logger.warn('Settings', 'Resetting all data to defaults');

        // Reset all stores to initial state
        resetSettings(); // Reset appStore settings
        playlistStore.clearPlaylist(); // Clear playlist data
        characterStore.resetCharacters(); // Clear all characters
        sensorStore.resetAll(); // Clear sensor data and permissions

        // Clear LocalForage storage
        storage.clear().then(() => {
          logger.info('Settings', 'LocalForage cleared successfully');
        }).catch((err: unknown) => {
          logger.error('Settings', 'Failed to clear LocalForage', err);
        });

        setResetStatus('success');
        setResetMessage('All data has been reset to defaults. The page will reload in 3 seconds...');
        logger.warn('Settings', 'Reset completed successfully');

        // Reload page after 3 seconds to ensure clean state
        void setTimeout(() => {
          window.location.reload();
        }, 3000);
      } catch (error) {
        setResetStatus('error');
        setResetMessage(error instanceof Error ? error.message : 'Reset failed');
        logger.error('Settings', 'Reset failed', error);
        void setTimeout(() => {
          setResetStatus('idle');
          setResetMessage('');
        }, 5000);
      }
    } else {
      // First click - show confirmation
      setResetStatus('confirming');
      setResetMessage('Are you sure? This will delete all your data. Click again to confirm.');

      // Clear any existing timeout
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      // Reset to idle after 5 seconds if not confirmed
      resetTimeoutRef.current = setTimeout(() => {
        setResetStatus('idle');
        setResetMessage('');
        resetTimeoutRef.current = null;
      }, 5000);
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
          <label className="block text-sm font-medium mb-2">
            OpenWeather API Key
            {openWeatherValidation.status === 'valid' && (
              <span className="ml-2 text-green-600 text-xs">✓ Valid</span>
            )}
            {openWeatherValidation.status === 'validating' && (
              <span className="ml-2 text-yellow-600 text-xs">Validating...</span>
            )}
            {openWeatherValidation.status === 'invalid' && (
              <span className="ml-2 text-red-600 text-xs">✗ Invalid</span>
            )}
          </label>
          <input
            type="text"
            value={openWeatherKey}
            onChange={(e) => handleOpenWeatherKeyChange(e.target.value)}
            className={`w-full px-3 py-2 bg-background border rounded-md ${
              openWeatherValidation.status === 'invalid'
                ? 'border-red-500 focus:border-red-500'
                : openWeatherValidation.status === 'valid'
                ? 'border-green-500 focus:border-green-500'
                : 'border-input'
            }`}
            placeholder="Enter OpenWeather API key..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for weather data in Environmental Sensors tab. Get your key at{' '}
            <a href="https://openweathermap.org/api" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              openweathermap.org
            </a>
          </p>
          {openWeatherValidation.message && (
            <p className={`text-xs mt-1 ${
              openWeatherValidation.status === 'invalid'
                ? 'text-red-600'
                : openWeatherValidation.status === 'valid'
                ? 'text-green-600'
                : 'text-muted-foreground'
            }`}>
              {openWeatherValidation.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Steam API Key
            {steamValidation.status === 'valid' && (
              <span className="ml-2 text-green-600 text-xs">✓ Valid</span>
            )}
            {steamValidation.status === 'validating' && (
              <span className="ml-2 text-yellow-600 text-xs">Validating...</span>
            )}
            {steamValidation.status === 'invalid' && (
              <span className="ml-2 text-red-600 text-xs">✗ Invalid</span>
            )}
          </label>
          <input
            type="text"
            value={steamKey}
            onChange={(e) => handleSteamKeyChange(e.target.value)}
            className={`w-full px-3 py-2 bg-background border rounded-md ${
              steamValidation.status === 'invalid'
                ? 'border-red-500 focus:border-red-500'
                : steamValidation.status === 'valid'
                ? 'border-green-500 focus:border-green-500'
                : 'border-input'
            }`}
            placeholder="Enter Steam API key..."
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required for Steam integration in Gaming Platforms tab. Get your key at{' '}
            <a href="https://steamcommunity.com/dev/apikey" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              steamcommunity.com
            </a>
          </p>
          {steamValidation.message && (
            <p className={`text-xs mt-1 ${
              steamValidation.status === 'invalid'
                ? 'text-red-600'
                : steamValidation.status === 'valid'
                ? 'text-green-600'
                : 'text-muted-foreground'
            }`}>
              {steamValidation.message}
            </p>
          )}
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

      {/* Debug Settings Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Debug Settings</h3>

        <div className="flex items-center justify-between border border-border rounded-lg p-4">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Verbose Logging</label>
            <p className="text-xs text-muted-foreground">
              Enable detailed debug logs in the browser console. This includes additional information for troubleshooting.
            </p>
          </div>
          <button
            onClick={() => handleVerboseLoggingChange(!verboseLogging)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              verboseLogging ? 'bg-primary' : 'bg-input'
            }`}
            role="switch"
            aria-checked={verboseLogging}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                verboseLogging ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {verboseLogging && (
          <p className="text-xs text-green-600 bg-green-100 border border-green-300 rounded px-2 py-1">
            ✓ Verbose logging is enabled. Check the browser console for detailed debug output.
          </p>
        )}
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

          <div className="relative">
            <input
              type="file"
              accept=".json"
              onChange={handleImportFromFile}
              disabled={importStatus === 'importing'}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              id="import-file-input"
            />
            <button
              disabled={importStatus === 'importing'}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {importStatus === 'importing' && (
                <span className="animate-spin">⏳</span>
              )}
              {importStatus === 'success' && (
                <span>✓</span>
              )}
              {importStatus === 'error' && (
                <span>✗</span>
              )}
              {importStatus === 'idle' && (
                <span>📤</span>
              )}
              <span>
                {importStatus === 'importing' && 'Importing...'}
                {importStatus === 'success' && 'Import Complete!'}
                {importStatus === 'error' && 'Import Failed'}
                {importStatus === 'idle' && 'Import from JSON File'}
              </span>
            </button>
          </div>

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

          {importStatus === 'success' && importMessage && (
            <p className="text-xs text-green-600 text-center">
              ✓ {importMessage}
            </p>
          )}

          {importStatus === 'error' && importMessage && (
            <p className="text-xs text-red-600 text-center">
              ✗ {importMessage}
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

      {/* Danger Zone Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-destructive">Danger Zone</h3>

        <div className="border border-destructive/50 rounded-lg p-4 space-y-3 bg-destructive/5">
          <p className="text-sm text-muted-foreground">
            Reset all application data to default values. This will delete all your playlists, characters, sensor data, and settings.
          </p>

          <button
            onClick={handleResetToDefaults}
            disabled={resetStatus === 'resetting' || resetStatus === 'success'}
            className={`w-full px-4 py-2 rounded-md font-medium transition-colors ${
              resetStatus === 'confirming'
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {resetStatus === 'resetting' && (
              <span className="animate-spin">⏳</span>
            )}
            {resetStatus === 'success' && (
              <span>✓</span>
            )}
            {resetStatus === 'error' && (
              <span>✗</span>
            )}
            {resetStatus === 'idle' && (
              <span>⚠️</span>
            )}
            {resetStatus === 'confirming' && (
              <span>🔴</span>
            )}
            <span>
              {resetStatus === 'resetting' && 'Resetting...'}
              {resetStatus === 'success' && 'Reset Complete!'}
              {resetStatus === 'error' && 'Reset Failed'}
              {resetStatus === 'idle' && 'Reset to Defaults'}
              {resetStatus === 'confirming' && 'Confirm Reset'}
            </span>
          </button>

          {resetStatus === 'confirming' && resetMessage && (
            <p className="text-xs text-amber-700 bg-amber-100 border border-amber-300 rounded px-2 py-1 text-center">
              ⚠️ {resetMessage}
            </p>
          )}

          {resetStatus === 'success' && resetMessage && (
            <p className="text-xs text-green-700 bg-green-100 border border-green-300 rounded px-2 py-1 text-center">
              ✓ {resetMessage}
            </p>
          )}

          {resetStatus === 'error' && resetMessage && (
            <p className="text-xs text-red-700 bg-red-100 border border-red-300 rounded px-2 py-1 text-center">
              ✗ {resetMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
