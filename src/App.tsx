import { useState, useEffect } from 'react';
import { Music, User, Activity, Zap, Gamepad2, Swords, Settings } from 'lucide-react';
import { useXPCalculator } from './hooks/useXPCalculator';
import { useEnvironmentalSensors } from './hooks/useEnvironmentalSensors';
import { useGamingPlatforms } from './hooks/useGamingPlatforms';
import { useCombatEngine } from './hooks/useCombatEngine';
import { useCharacterStore } from './store/characterStore';
import { PlaylistLoaderTab } from './components/Tabs/PlaylistLoaderTab';
import { AudioAnalysisTab } from './components/Tabs/AudioAnalysisTab';
import { CharacterGenTab } from './components/Tabs/CharacterGenTab';
import { SessionTrackingTab } from './components/Tabs/SessionTrackingTab';

type Tab = 'playlist' | 'audio' | 'character' | 'session' | 'xp' | 'leveling' | 'sensors' | 'gaming' | 'combat' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('playlist');

  const tabs = [
    { id: 'playlist' as Tab, label: 'Playlist', icon: Music },
    { id: 'audio' as Tab, label: 'Audio Analysis', icon: Music },
    { id: 'character' as Tab, label: 'Character Gen', icon: User },
    { id: 'session' as Tab, label: 'Session', icon: Activity },
    { id: 'xp' as Tab, label: 'XP Calc', icon: Zap },
    { id: 'leveling' as Tab, label: 'Leveling', icon: User },
    { id: 'sensors' as Tab, label: 'Sensors', icon: Activity },
    { id: 'gaming' as Tab, label: 'Gaming', icon: Gamepad2 },
    { id: 'combat' as Tab, label: 'Combat', icon: Swords },
    { id: 'settings' as Tab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">Playlist Data Engine Showcase</h1>
          <p className="text-sm text-muted-foreground">Technical validation • Console logging enabled</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="w-64 shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent text-foreground'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="flex-1">
            <div className="bg-card border border-border rounded-lg p-6">
              {activeTab === 'playlist' && <PlaylistLoaderTab />}
              {activeTab === 'audio' && <AudioAnalysisTab />}
              {activeTab === 'character' && <CharacterGenTab />}
              {activeTab === 'session' && <SessionTrackingTab />}
              {activeTab === 'xp' && <XPTab />}
              {activeTab === 'leveling' && <LevelingTab />}
              {activeTab === 'sensors' && <SensorsTab />}
              {activeTab === 'gaming' && <GamingTab />}
              {activeTab === 'combat' && <CombatTab />}
              {activeTab === 'settings' && <SettingsTab />}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}


function XPTab() {
  const { calculateXP } = useXPCalculator();
  const [duration, setDuration] = useState(180);
  const [result, setResult] = useState<any>(null);

  const handleCalculate = () => {
    const xpResult = calculateXP(duration);
    setResult(xpResult);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">XP Calculator</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Duration (seconds)</label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full px-3 py-2 bg-background border border-input rounded-md"
            min="0"
            max="3600"
          />
        </div>

        <button
          onClick={handleCalculate}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Calculate XP
        </button>

        {result && (
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm text-muted-foreground">Total XP</p>
            <p className="text-3xl font-bold">{result.totalXp}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LevelingTab() {
  const { characters, updateCharacter } = useCharacterStore();
  const [xpAmount, setXpAmount] = useState(100);
  const [currentXP, setCurrentXP] = useState(0);

  const activeChar = characters.length > 0 ? characters[characters.length - 1] : null;

  // Sync currentXP with character when it changes
  useEffect(() => { // Changed from useState to useEffect for proper side effect handling
    if (activeChar) {
      setCurrentXP(activeChar.xp.current);
    }
  }, [activeChar]); // Dependency array to re-run when activeChar changes

  const addXP = (amount: number) => {
    if (!activeChar) return;

    const newXP = currentXP + amount;
    setCurrentXP(newXP);

    // Check if we should level up
    let newLevel = activeChar.level;
    let newNextLevel = activeChar.xp.next_level;

    // Simple level-up check (level 1->2 at 300 XP, 2->3 at 900 XP, etc.)
    const xpThresholds = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

    for (let i = activeChar.level; i < xpThresholds.length; i++) {
      if (newXP >= xpThresholds[i]) {
        newLevel = i + 1;
        newNextLevel = xpThresholds[i + 1] || 999999;
      } else {
        break;
      }
    }

    // Update the character
    const updatedChar = {
      ...activeChar,
      level: newLevel,
      xp: {
        current: newXP,
        next_level: newNextLevel
      }
    };

    updateCharacter(updatedChar);

    if (newLevel > activeChar.level) {
      console.log(`🎉 LEVEL UP! Now level ${newLevel}!`);
    }
    console.log(`Added ${amount} XP. Total: ${newXP} (Level ${newLevel})`);
  };

  if (!activeChar) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold">Character Leveling</h2>
        <p className="text-muted-foreground">Generate a character first</p>
      </div>
    );
  }

  const nextLevel = activeChar.xp.next_level;
  const progress = (currentXP / nextLevel) * 100;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Character Leveling</h2>

      <div className="p-6 bg-gradient-to-r from-primary/20 to-accent rounded-lg border border-border">
        <h3 className="text-xl font-bold">{activeChar.name}</h3>
        <p className="text-lg text-muted-foreground">Level {activeChar.level} {activeChar.race} {activeChar.class}</p>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">XP Progress</p>
            <p className="font-mono text-sm">{currentXP} / {nextLevel}</p>
          </div>
          <div className="h-3 bg-background rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-3">Quick Add XP</label>
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => addXP(50)}
              className="px-4 py-2 bg-card border border-border rounded-md hover:bg-accent"
            >
              +50 XP
            </button>
            <button
              onClick={() => addXP(100)}
              className="px-4 py-2 bg-card border border-border rounded-md hover:bg-accent"
            >
              +100 XP
            </button>
            <button
              onClick={() => addXP(300)}
              className="px-4 py-2 bg-card border border-border rounded-md hover:bg-accent"
            >
              +300 XP
            </button>
            <button
              onClick={() => addXP(1000)}
              className="px-4 py-2 bg-card border border-border rounded-md hover:bg-accent"
            >
              +1000 XP
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Custom XP Amount</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={xpAmount}
              onChange={(e) => setXpAmount(Number(e.target.value))}
              className="flex-1 px-3 py-2 bg-background border border-input rounded-md"
              min="1"
            />
            <button
              onClick={() => addXP(xpAmount)}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
            >
              Add XP
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 bg-card border border-border rounded-md">
        <h4 className="font-medium mb-3">Current Stats</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">HP</p>
            <p className="font-bold">{activeChar.hp.max}</p>
          </div>
          <div>
            <p className="text-muted-foreground">AC</p>
            <p className="font-bold">{activeChar.armor_class}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Prof Bonus</p>
            <p className="font-bold">+{activeChar.proficiency_bonus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SensorsTab() {
  const { requestPermission, startMonitoring, isMonitoring, environmentalContext, permissions, sensors } = useEnvironmentalSensors();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Environmental Sensors</h2>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Geolocation</p>
            <p className="text-xs text-muted-foreground">{permissions.geolocation}</p>
            <button
              onClick={() => requestPermission('geolocation')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Motion</p>
            <p className="text-xs text-muted-foreground">{permissions.motion}</p>
            <button
              onClick={() => requestPermission('motion')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Light</p>
            <p className="text-xs text-muted-foreground">{permissions.light}</p>
            <button
              onClick={() => requestPermission('light')}
              className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded"
            >
              Request
            </button>
          </div>
        </div>

        <button
          onClick={() => startMonitoring()}
          disabled={isMonitoring}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {isMonitoring ? 'Monitoring...' : 'Start Monitoring'}
        </button>

        {environmentalContext && (
          <div className="p-4 bg-card border border-border rounded-md">
            <p className="text-sm font-medium">Environmental Data</p>
            <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(environmentalContext, null, 2)}</pre>
          </div>
        )}

        {environmentalContext ? (
          <div className="space-y-4">
            {/* Live Motion Data */}
            {environmentalContext.motion ? (
              <div className="p-5 bg-green-900/20 border border-green-700 rounded-lg">
                <h3 className="font-bold text-green-300 flex items-center gap-2">
                  Live Motion Active
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-mono">
                  <div>
                    <span className="text-muted-foreground">X:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.x?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Y:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.y?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Z:</span>{' '}
                    <strong>{environmentalContext.motion.accelerationIncludingGravity.z?.toFixed(3) ?? '—'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Activity:</span>{' '}
                    <strong className="text-lg">
                      {(() => {
                        // This is safe now because we added getCurrentActivity()
                        if (!sensors || !environmentalContext.motion) return 'unknown';
                        return sensors.getCurrentActivity();
                      })()}
                    </strong>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Updated: {new Date(environmentalContext.timestamp).toLocaleTimeString()}
                </p>
              </div>
            ) : (
              <div className="p-5 bg-orange-900/30 border border-orange-700 rounded-lg text-orange-300">
                <h3 className="font-bold">No Motion Data Yet</h3>
                <ul className="mt-3 text-sm space-y-1">
                  <li>• Did you grant motion permission? (iOS: must tap "Request")</li>
                  <li>• Is your phone flat on a table? Try tilting it!</li>
                  <li>• Motion updates only when device moves</li>
                  <li>• Check: DeviceMotionEvent supported? {typeof window !== 'undefined' && 'DeviceMotionEvent' in window ? 'Yes' : 'No'}</li>
                </ul>
              </div>
            )}

            {/* Full Debug Dump */}
            <details className="mt-4">
              <summary className="cursor-pointer text-sm font-medium">Raw environmentalContext</summary>
              <pre className="mt-2 text-xs overflow-auto bg-black/50 p-3 rounded">
                {JSON.stringify(environmentalContext, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}

      </div>
    </div>
  );
}

function GamingTab() {
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

function CombatTab() {
  const { startCombat } = useCombatEngine();
  const { characters } = useCharacterStore();

  const handleStartCombat = () => {
    if (characters.length === 0) return;
    // Create a mock enemy
    const enemy = { ...characters[0], name: 'Goblin', hp: { current: 20, max: 20, temp: 0 } };
    startCombat([characters[0]], [enemy]);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Combat Engine</h2>

      {characters.length === 0 ? (
        <p className="text-muted-foreground">Generate a character first</p>
      ) : (
        <button
          onClick={handleStartCombat}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          Start Combat
        </button>
      )}
    </div>
  );
}

function SettingsTab() {
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

export default App;
