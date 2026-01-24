import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

/**
 * SettingsTab Component
 *
 * Application settings for API keys and configuration.
 * Phase 4.10 - Settings Tab Implementation
 */

// Valid FFT sizes for Web Audio API (must be power of 2)
const FFT_SIZE_OPTIONS = [1024, 2048, 4096, 8192] as const;
type FFTSizeOption = (typeof FFT_SIZE_OPTIONS)[number];

export function SettingsTab() {
  const { settings, updateSettings } = useAppStore();
  const [openWeatherKey, setOpenWeatherKey] = useState(settings.openWeatherApiKey);
  const [steamKey, setSteamKey] = useState(settings.steamApiKey);
  const [discordClientId, setDiscordClientId] = useState(settings.discordClientId);
  const [audioFftSize, setAudioFftSize] = useState(settings.audioFftSize);
  const [baseXpRate, setBaseXpRate] = useState(settings.baseXpRate);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | null>(null);

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
    </div>
  );
}
