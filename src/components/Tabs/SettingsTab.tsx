import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';

/**
 * SettingsTab Component
 *
 * Application settings for API keys and configuration.
 * Phase 4.10.1 - Wire OpenWeather API Key
 */

export function SettingsTab() {
  const { settings, updateSettings } = useAppStore();
  const [openWeatherKey, setOpenWeatherKey] = useState(settings.openWeatherApiKey);
  const [steamKey, setSteamKey] = useState(settings.steamApiKey);
  const [discordClientId, setDiscordClientId] = useState(settings.discordClientId);
  const [saveIndicator, setSaveIndicator] = useState<'saved' | 'saving' | null>(null);

  // Initialize local state from store
  useEffect(() => {
    setOpenWeatherKey(settings.openWeatherApiKey);
    setSteamKey(settings.steamApiKey);
    setDiscordClientId(settings.discordClientId);
  }, [settings.openWeatherApiKey, settings.steamApiKey, settings.discordClientId]);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Settings</h2>
        {saveIndicator === 'saved' && (
          <span className="text-sm text-green-600">✓ Saved</span>
        )}
      </div>

      <p className="text-muted-foreground">Configure API keys and application settings...</p>

      <div className="space-y-4">
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
    </div>
  );
}
