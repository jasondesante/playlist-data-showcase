/**
 * SettingsTab Component
 *
 * Application settings for API keys and configuration.
 * This is a placeholder implementation - full save/load functionality
 * is planned in Phase 4 (task 4.10).
 */

export function SettingsTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Settings</h2>
      <p className="text-muted-foreground">Configure API keys and application settings...</p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">OpenWeather API Key</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter API key..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Steam API Key</label>
          <input
            type="text"
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            placeholder="Enter API key..."
          />
        </div>
      </div>
    </div>
  );
}
