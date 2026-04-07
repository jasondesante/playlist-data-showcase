import { useState, createContext, useContext, useMemo } from 'react';
import { Music, User, Activity, Zap, Gamepad2, Swords, Settings, Users, Backpack, Database, Drum, Scale } from 'lucide-react';
import { AppHeader } from './components/Layout/AppHeader';
import { MainLayout } from './components/Layout/MainLayout';
import { ToastContainer } from './components/ui/Toast';
import { LevelUpDetailModal } from './components/LevelUpDetailModal';
import type { TabItem } from './components/Layout/Sidebar';
import { PlaylistLoaderTab } from './components/Tabs/PlaylistLoaderTab';
import { AudioAnalysisTab } from './components/Tabs/AudioAnalysisTab';
import { BeatDetectionTab } from './components/Tabs/BeatDetectionTab';
import { CharacterGenTab } from './components/Tabs/CharacterGenTab';
import { PartyTab } from './components/Tabs/PartyTab';
import { SessionTrackingTab } from './components/Tabs/SessionTrackingTab';
import { XPCalculatorTab } from './components/Tabs/XPCalculatorTab';
import { CharacterLevelingTab } from './components/Tabs/CharacterLevelingTab';
import { EnvironmentalSensorsTab } from './components/Tabs/EnvironmentalSensorsTab';
import { GamingPlatformsTab } from './components/Tabs/GamingPlatformsTab';
import { CombatSimulatorTab } from './components/Tabs/CombatSimulatorTab';
import { SettingsTab } from './components/Tabs/SettingsTab';
import { BalanceLabTab } from './components/Tabs/BalanceLabTab';
import { ItemsTab } from './components/Tabs/ItemsTab';
import { DataViewerTab } from './components/Tabs/DataViewerTab';
import { useAutoCharacterSetup } from './hooks/useAutoCharacterSetup';
import { useSessionCompletion } from './hooks/useSessionCompletion';
import { useCharacterStore } from './store/characterStore';
import { useDataViewerStore } from './store/dataViewerStore';
import { useCustomEquipmentInitializer } from './hooks/useItemCreator';

type Tab = 'playlist' | 'audio' | 'beat' | 'character' | 'party' | 'items' | 'dataviewer' | 'session' | 'xp' | 'leveling' | 'sensors' | 'gaming' | 'combat' | 'balance' | 'settings';

// Create context for active tab
const TabContext = createContext<{ activeTab: Tab } | null>(null);

export const useTabContext = () => useContext(TabContext);

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('playlist');

  // Initialize custom equipment from localStorage on app startup
  // This ensures custom items can be equipped after page refresh
  useCustomEquipmentInitializer();

  // Auto-analyze and generate characters on first listen of new tracks
  useAutoCharacterSetup();

  // Handle session completion - process XP and show level-up modals
  const { showLevelUpModal, levelUpDetails, closeLevelUpModal } = useSessionCompletion();

  // Get pending stat increases count for the Leveling tab badge
  const characters = useCharacterStore((state) => state.characters);
  const activeCharacterId = useCharacterStore((state) => state.activeCharacterId);

  // Get Data Viewer pending changes state
  const hasPendingDataChanges = useDataViewerStore((state) => state.hasPendingChanges);

  // Compute pending stat increases count for badge
  const pendingStatIncreasesCount = useMemo(() => {
    if (!activeCharacterId) return 0;
    const character = characters.find((c) => c.seed === activeCharacterId);
    return character?.pendingStatIncreases ?? 0;
  }, [activeCharacterId, characters]);

  // Note: Track restoration from activeCharacterId is now handled by the
  // onRehydrateStorage callback in characterStore.ts, which fires AFTER
  // the character data is loaded from localStorage. This ensures that
  // the characters array is populated before we try to find the active character.

  const tabs: TabItem[] = [
    { id: 'playlist', label: 'Playlist', icon: Music },
    { id: 'audio', label: 'Audio Analysis', icon: Music },
    { id: 'beat', label: 'Beat Detection', icon: Drum },
    { id: 'character', label: 'Character Gen', icon: User },
    { id: 'party', label: 'Party', icon: Users },
    { id: 'items', label: 'Items', icon: Backpack },
    {
      id: 'dataviewer',
      label: 'Data Viewer',
      icon: Database,
      // Show "New!" badge when custom items are added
      badgeCount: hasPendingDataChanges ? 'New!' : undefined,
      showBadgeGlow: hasPendingDataChanges
    },
    { id: 'session', label: 'Session', icon: Activity },
    { id: 'xp', label: 'XP Calc', icon: Zap },
    {
      id: 'leveling',
      label: 'Leveling',
      icon: User,
      // Show badge with count if there are pending stat increases
      badgeCount: pendingStatIncreasesCount > 0 ? pendingStatIncreasesCount : undefined,
      showBadgeGlow: pendingStatIncreasesCount > 0
    },
    { id: 'sensors', label: 'Sensors', icon: Activity },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'combat', label: 'Combat', icon: Swords },
    { id: 'balance', label: 'Balance Lab', icon: Scale },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'playlist': return <PlaylistLoaderTab />;
      case 'audio': return <AudioAnalysisTab />;
      case 'beat': return <BeatDetectionTab />;
      case 'character': return <CharacterGenTab />;
      case 'party': return <PartyTab />;
      case 'items': return <ItemsTab />;
      case 'dataviewer': return <DataViewerTab />;
      case 'session': return <SessionTrackingTab />;
      case 'xp': return <XPCalculatorTab />;
      case 'leveling': return <CharacterLevelingTab />;
      case 'sensors': return <EnvironmentalSensorsTab />;
      case 'gaming': return <GamingPlatformsTab />;
      case 'combat': return <CombatSimulatorTab />;
      case 'balance': return <BalanceLabTab />;
      case 'settings': return <SettingsTab />;
      default: return null;
    }
  };

  return (
    <TabContext.Provider value={{ activeTab }}>
      <div className="app-root">
        <AppHeader tabs={tabs} activeTab={activeTab} onTabChange={(tabId) => setActiveTab(tabId as Tab)} />

      <MainLayout>
        {renderActiveTab()}
      </MainLayout>

      <ToastContainer position="top-right" />

        {/* Level-Up Detail Modal */}
        <LevelUpDetailModal
          levelUpDetails={levelUpDetails}
          isOpen={showLevelUpModal}
          onClose={closeLevelUpModal}
        />
      </div>
    </TabContext.Provider>
  );
}

export default App;
