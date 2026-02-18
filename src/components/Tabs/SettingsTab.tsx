import { useState, useEffect, useRef, useMemo } from 'react';
import { Settings, Key, Cloud, Gamepad2, Volume2, Bug, Database, AlertTriangle, Check, X, Download, Upload, ServerOff } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { usePlaylistStore } from '@/store/playlistStore';
import { useCharacterStore } from '@/store/characterStore';
import { useSensorStore } from '@/store/sensorStore';
import { logger } from '@/utils/logger';
import { storage } from '@/utils/storage';
import { isServerMode } from '@/utils/env';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { ServerlessPlaylist, PlaylistTrack, AudioProfile } from '@/types';
import type { CharacterSheet } from '@/types';
import type { EnvironmentalContext, GamingContext } from '@/types';

import './SettingsTab.css';

/**
 * SettingsTab Component
 *
 * Application settings for API keys and configuration.
 * Phase 11 - Settings Tab Implementation (Redesigned with pure CSS)
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
 */
async function validateOpenWeatherApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { status: 'idle' };
  }

  try {
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
 * Validates Steam API key format
 * Steam API keys are typically 32-character hexadecimal strings
 */
function isValidSteamApiKeyFormat(apiKey: string): boolean {
  const trimmed = apiKey.trim();
  // Steam API keys are 32 character hex strings
  return /^[A-F0-9]{32}$/i.test(trimmed);
}

/**
 * Validates Steam API key by making a test API call
 *
 * NOTE: Steam's API does NOT support CORS requests from browsers.
 * This function will fail with a CORS error when running in a browser.
 * In development, we validate format only. For full validation, use a backend proxy.
 */
async function validateSteamApiKey(apiKey: string): Promise<ApiKeyValidationResult> {
  if (!apiKey || apiKey.trim().length === 0) {
    return { status: 'idle' };
  }

  const trimmedKey = apiKey.trim();

  // First, check if the key format looks valid
  if (!isValidSteamApiKeyFormat(trimmedKey)) {
    return {
      status: 'invalid',
      message: 'Invalid key format. Steam API keys should be 32 hexadecimal characters.'
    };
  }

  // Try to validate via direct API call
  // Note: This WILL fail in browsers due to CORS - Steam doesn't allow browser requests
  try {
    const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${trimmedKey}&steamids=76561197960287930`;
    const response = await fetch(url);

    const data = await response.json();

    if (response.status === 403 || (data.error && data.error === 'Forbidden')) {
      return {
        status: 'invalid',
        message: 'Invalid API key. Please check your Steam API key and try again.'
      };
    }

    if (data.error) {
      return {
        status: 'invalid',
        message: `Steam API error: ${data.error}`
      };
    }

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
    // Check if this is a CORS error (browser blocking the request)
    // CORS errors typically manifest as TypeError with no specific message
    // or "Failed to fetch" / "NetworkError" messages
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
    const isCorsError =
      error instanceof TypeError &&
      (errorMessage.includes('failed to fetch') ||
        errorMessage.includes('networkerror') ||
        errorMessage === 'typeerror: failed to fetch' ||
        errorMessage === '');

    if (isCorsError) {
      // CORS error - Steam API doesn't allow browser requests
      // Key format is valid, but we can't verify it actually works
      return {
        status: 'valid',
        message: 'Key format valid. (Browser cannot verify Steam API - use in Electron/server for full validation)'
      };
    }

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
  const [verboseLogging, setVerboseLogging] = useState(settings.verboseLogging);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState<string>('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'confirming' | 'resetting' | 'success' | 'error'>('idle');
  const [resetMessage, setResetMessage] = useState<string>('');

  // Detect server mode (Node.js/Electron) vs client mode (browser)
  // Discord RPC requires server mode to communicate with Discord's IPC
  const isRunningInServerMode = useMemo(() => isServerMode(), []);

  // API key validation states
  const [openWeatherValidation, setOpenWeatherValidation] = useState<ApiKeyValidationResult>({ status: 'idle' });
  const [steamValidation, setSteamValidation] = useState<ApiKeyValidationResult>({ status: 'idle' });

  // Ref to track if confirmation timeout is active
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize local state from store (only on mount to avoid bidirectional sync loops)
  const isInitialized = useRef(false);
  useEffect(() => {
    if (!isInitialized.current) {
      setOpenWeatherKey(settings.openWeatherApiKey);
      setSteamKey(settings.steamApiKey);
      setDiscordClientId(settings.discordClientId);
      setAudioFftSize(settings.audioFftSize);
      setVerboseLogging(settings.verboseLogging);
      isInitialized.current = true;
    }
  }, [settings.openWeatherApiKey, settings.steamApiKey, settings.discordClientId, settings.audioFftSize, settings.verboseLogging]);

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
    }, 1500);

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
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [steamKey]);

  const handleExportAllData = () => {
    try {
      setExportStatus('exporting');
      logger.info('Settings', 'Exporting all data');

      const startTime = performance.now();

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

      const jsonString = JSON.stringify(exportedData, null, 2);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `playlist-showcase-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const endTime = performance.now();
      const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);
      const fileSizeKB = (jsonString.length / 1024).toFixed(2);

      setExportStatus('success');
      logger.info('Settings', 'Export completed successfully', {
        characters: exportedData.characterStore.characters.length,
        fileSizeKB,
        exportTimeSeconds: elapsedSeconds,
      });

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

          if (!importedData.version || !importedData.playlistStore || !importedData.characterStore ||
              !importedData.sensorStore || !importedData.appStore) {
            throw new Error('Invalid file structure: missing required fields');
          }

          // Load data into each store
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

          void setTimeout(() => {
            setImportStatus('idle');
            setImportMessage('');
          }, 5000);

          // Reset file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
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
      try {
        setResetStatus('resetting');
        logger.warn('Settings', 'Resetting all data to defaults');

        resetSettings();
        playlistStore.clearPlaylist();
        characterStore.resetCharacters();
        sensorStore.resetAll();

        storage.clear().then(() => {
          logger.info('Settings', 'LocalForage cleared successfully');
        }).catch((err: unknown) => {
          logger.error('Settings', 'Failed to clear LocalForage', err);
        });

        setResetStatus('success');
        setResetMessage('All data has been reset to defaults. The page will reload in 3 seconds...');
        logger.warn('Settings', 'Reset completed successfully');

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
      setResetStatus('confirming');
      setResetMessage('Are you sure? This will delete all your data. Click again to confirm.');

      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }

      resetTimeoutRef.current = setTimeout(() => {
        setResetStatus('idle');
        setResetMessage('');
        resetTimeoutRef.current = null;
      }, 5000);
    }
  };

  // Get validation status styles
  const getValidationStatusClass = (status: ApiKeyValidationStatus) => {
    switch (status) {
      case 'valid':
        return 'settings-validation-valid';
      case 'invalid':
        return 'settings-validation-invalid';
      case 'validating':
        return 'settings-validation-validating';
      default:
        return '';
    }
  };

  const getValidationIcon = (status: ApiKeyValidationStatus) => {
    switch (status) {
      case 'valid':
        return <Check className="settings-validation-icon settings-validation-icon-valid" />;
      case 'invalid':
        return <X className="settings-validation-icon settings-validation-icon-invalid" />;
      case 'validating':
        return <div className="settings-spinner" aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <div className="settings-container">
      {/* Header */}
      <div className="settings-header">
        <div className="settings-header-content">
          <Settings className="settings-header-icon" />
          <div>
            <h1 className="settings-title">Settings</h1>
            <div className="settings-subtitle">Configure API keys, audio settings, and manage your data</div>
          </div>
        </div>
        {saveIndicator === 'saved' && (
          <div className="settings-save-indicator">
            <Check className="settings-save-icon" />
            <span>Saved</span>
          </div>
        )}
      </div>

      {/* API Keys Section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Key className="settings-section-icon" />
          <h2 className="settings-section-title">API Keys</h2>
        </div>
        <div className="settings-cards-grid">
          {/* OpenWeather API Key */}
          <Card variant="elevated" padding="md" className="settings-card">
            <div className="settings-api-key-header">
              <Cloud className="settings-api-key-icon" />
              <div className="settings-api-key-title">OpenWeather API</div>
            </div>
            <Input
              label="API Key"
              value={openWeatherKey}
              onChange={(e) => handleOpenWeatherKeyChange(e.target.value)}
              placeholder="Enter your OpenWeather API key..."
              helperText="Required for weather data in Environmental Sensors tab. Get your key at openweathermap.org"
              containerClassName="settings-input-wrapper"
            />
            <div className={`settings-validation-status ${getValidationStatusClass(openWeatherValidation.status)}`}>
              {getValidationIcon(openWeatherValidation.status)}
              {openWeatherValidation.message && (
                <span className="settings-validation-message">{openWeatherValidation.message}</span>
              )}
            </div>
          </Card>

          {/* Steam API Key */}
          <Card variant="elevated" padding="md" className={`settings-card${!isRunningInServerMode ? ' settings-card-disabled' : ''}`}>
            {/* Server Mode Required Overlay - shown when running in browser */}
            {!isRunningInServerMode && (
              <div className="settings-discord-overlay">
                <div className="settings-discord-badge">
                  <ServerOff size={14} />
                  <span>Browser Not Supported</span>
                </div>
                <div className="settings-discord-message">
                  <p><strong>Steam API requires a server environment.</strong></p>
                  <p>Browsers block Steam API requests due to CORS restrictions. Steam&apos;s servers don&apos;t allow cross-origin requests from web apps.</p>
                  <p>
                    To use Steam integration, run this app as a desktop application (via{' '}
                    <a
                      href="https://electronjs.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Electron
                    </a>
                    ) or with a backend proxy server.
                  </p>
                </div>
              </div>
            )}
            <div className="settings-api-key-header">
              <Gamepad2 className="settings-api-key-icon" />
              <div className="settings-api-key-title">Steam API</div>
            </div>
            <Input
              label="API Key"
              value={steamKey}
              onChange={(e) => handleSteamKeyChange(e.target.value)}
              placeholder="Enter your Steam API key..."
              helperText="Required for Steam integration. Get your key at steamcommunity.com/dev/apikey (32-char hex key)"
              containerClassName="settings-input-wrapper"
              disabled={!isRunningInServerMode}
            />
            {isRunningInServerMode && (
              <div className={`settings-validation-status ${getValidationStatusClass(steamValidation.status)}`}>
                {getValidationIcon(steamValidation.status)}
                {steamValidation.message && (
                  <span className="settings-validation-message">{steamValidation.message}</span>
                )}
              </div>
            )}
          </Card>

          {/* Discord Client ID */}
          <Card variant="elevated" padding="md" className={`settings-card${!isRunningInServerMode ? ' settings-card-disabled' : ''}`}>
            {/* Server Mode Required Overlay - shown when running in browser */}
            {!isRunningInServerMode && (
              <div className="settings-discord-overlay">
                <div className="settings-discord-badge">
                  <ServerOff size={14} />
                  <span>Browser Not Supported</span>
                </div>
                <div className="settings-discord-message">
                  <p><strong>Discord Rich Presence requires a desktop app.</strong></p>
                  <p>This feature isn&apos;t available in web browsers because Discord requires direct system access that browsers don&apos;t provide.</p>
                  <p>
                    To use Discord integration, run this app as a desktop application (via{' '}
                    <a
                      href="https://electronjs.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Electron
                    </a>
                    ).
                  </p>
                </div>
              </div>
            )}
            <div className="settings-api-key-header">
              <Gamepad2 className="settings-api-key-icon settings-api-key-icon-discord" />
              <div className="settings-api-key-title">Discord Integration</div>
            </div>
            <Input
              label="Client ID"
              value={discordClientId}
              onChange={(e) => handleDiscordClientIdChange(e.target.value)}
              placeholder="Enter your Discord Client ID..."
              helperText="For Discord music status integration. Create an app at discord.com/developers/applications"
              containerClassName="settings-input-wrapper"
              disabled={!isRunningInServerMode}
            />
          </Card>
        </div>
      </section>

      {/* Audio Settings Section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Volume2 className="settings-section-icon" />
          <h2 className="settings-section-title">Audio Settings</h2>
        </div>
        <Card variant="elevated" padding="md" className="settings-audio-card">
          <div className="settings-audio-content">
            <div className="settings-audio-info">
              <label className="settings-label" htmlFor="fft-size-select">
                Audio FFT Size: <span className="settings-value-highlight">{audioFftSize}</span>
              </label>
              <div className="settings-description">
                FFT size for audio analysis. Larger values provide better frequency resolution but slower performance.
              </div>
            </div>
            <select
              id="fft-size-select"
              value={audioFftSize}
              onChange={(e) => handleAudioFftSizeChange(e.target.value)}
              className="settings-select"
            >
              {FFT_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <div className="settings-fft-options">
            <div className="settings-fft-option">
              <span className="settings-fft-value">1024</span>
              <span className="settings-fft-desc">Fast, less detailed (real-time)</span>
            </div>
            <div className="settings-fft-option">
              <span className="settings-fft-value">2048</span>
              <span className="settings-fft-desc">Balanced (default)</span>
            </div>
            <div className="settings-fft-option">
              <span className="settings-fft-value">4096+</span>
              <span className="settings-fft-desc">Detailed, slower (offline)</span>
            </div>
          </div>
        </Card>
      </section>

      {/* Debug Settings Section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Bug className="settings-section-icon" />
          <h2 className="settings-section-title">Debug Settings</h2>
        </div>
        <Card variant="elevated" padding="md" className="settings-debug-card">
          <div className="settings-toggle-row">
            <div className="settings-toggle-info">
              <div className="settings-toggle-label">Verbose Logging</div>
              <div className="settings-description">
                Enable detailed debug logs in the browser console for troubleshooting.
              </div>
            </div>
            <button
              onClick={() => handleVerboseLoggingChange(!verboseLogging)}
              className={`settings-toggle ${verboseLogging ? 'settings-toggle-active' : ''}`}
              role="switch"
              aria-checked={verboseLogging}
              type="button"
            >
              <span className="settings-toggle-slider" />
            </button>
          </div>
          {verboseLogging && (
            <div className="settings-verbose-notice">
              <Check className="settings-verbose-icon" />
              <span>Verbose logging is enabled. Check the browser console for detailed debug output.</span>
            </div>
          )}
        </Card>
      </section>

      {/* Data Management Section */}
      <section className="settings-section">
        <div className="settings-section-header">
          <Database className="settings-section-icon" />
          <h2 className="settings-section-title">Data Management</h2>
        </div>
        <Card variant="elevated" padding="lg" className="settings-data-card">
          <div className="settings-data-description">
            Export all your data from the showcase app, including playlists, characters, sensor data, and settings.
          </div>

          <div className="settings-data-actions">
            <Button
              onClick={handleExportAllData}
              disabled={exportStatus === 'exporting'}
              variant="primary"
              leftIcon={exportStatus === 'success' ? Check : exportStatus === 'error' ? X : Download}
              className="settings-export-btn"
            >
              {exportStatus === 'exporting' ? 'Exporting...' :
               exportStatus === 'success' ? 'Export Complete!' :
               exportStatus === 'error' ? 'Export Failed' :
               'Export All Data to JSON'}
            </Button>

            <div className="settings-import-wrapper">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportFromFile}
                disabled={importStatus === 'importing'}
                className="settings-file-input"
                id="import-file-input"
              />
              <Button
                onClick={() => document.getElementById('import-file-input')?.click()}
                disabled={importStatus === 'importing'}
                variant="secondary"
                leftIcon={importStatus === 'success' ? Check : importStatus === 'error' ? X : Upload}
                className="settings-import-btn"
              >
                {importStatus === 'importing' ? 'Importing...' :
                 importStatus === 'success' ? 'Import Complete!' :
                 importStatus === 'error' ? 'Import Failed' :
                 'Import from JSON File'}
              </Button>
            </div>
          </div>

          {/* Status messages */}
          {exportStatus === 'success' && (
            <div className="settings-status-message settings-status-success">
              <Check className="settings-status-icon" />
              <span>Data exported successfully! Check your downloads folder.</span>
            </div>
          )}
          {exportStatus === 'error' && (
            <div className="settings-status-message settings-status-error">
              <X className="settings-status-icon" />
              <span>Failed to export data. Please try again.</span>
            </div>
          )}
          {importStatus === 'success' && importMessage && (
            <div className="settings-status-message settings-status-success">
              <Check className="settings-status-icon" />
              <span>{importMessage}</span>
            </div>
          )}
          {importStatus === 'error' && importMessage && (
            <div className="settings-status-message settings-status-error">
              <X className="settings-status-icon" />
              <span>{importMessage}</span>
            </div>
          )}

          {/* Export details */}
          <div className="settings-export-details">
            <div className="settings-export-details-title">Export includes:</div>
            <ul className="settings-export-list">
              <li>Playlist: Current playlist, selected track, audio profile</li>
              <li>Characters: All generated characters with stats and XP</li>
              <li>Sensors: Environmental context, gaming context, permissions</li>
              <li>Settings: API keys, audio config, XP rate</li>
            </ul>
          </div>
        </Card>
      </section>

      {/* Danger Zone Section */}
      <section className="settings-section settings-section-danger">
        <div className="settings-section-header settings-section-header-danger">
          <AlertTriangle className="settings-section-icon settings-section-icon-danger" />
          <h2 className="settings-section-title">Danger Zone</h2>
        </div>
        <Card variant="outlined" padding="lg" className="settings-danger-card">
          <div className="settings-danger-content">
            <AlertTriangle className="settings-danger-icon" />
            <div className="settings-danger-text">
              <div className="settings-danger-title">Reset to Defaults</div>
              <div className="settings-description">
                This will delete all your playlists, characters, sensor data, and settings. This action cannot be undone.
              </div>
            </div>
          </div>

          <Button
            onClick={handleResetToDefaults}
            disabled={resetStatus === 'resetting' || resetStatus === 'success'}
            variant={resetStatus === 'confirming' ? 'secondary' : 'destructive'}
            className="settings-reset-btn"
          >
            {resetStatus === 'resetting' ? 'Resetting...' :
             resetStatus === 'success' ? 'Reset Complete!' :
             resetStatus === 'confirming' ? 'Confirm Reset' :
             'Reset to Defaults'}
          </Button>

          {resetStatus === 'confirming' && resetMessage && (
            <div className="settings-status-message settings-status-warning">
              <AlertTriangle className="settings-status-icon" />
              <span>{resetMessage}</span>
            </div>
          )}
          {resetStatus === 'success' && resetMessage && (
            <div className="settings-status-message settings-status-success">
              <Check className="settings-status-icon" />
              <span>{resetMessage}</span>
            </div>
          )}
          {resetStatus === 'error' && resetMessage && (
            <div className="settings-status-message settings-status-error">
              <X className="settings-status-icon" />
              <span>{resetMessage}</span>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
