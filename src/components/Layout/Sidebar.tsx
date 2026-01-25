/**
 * Sidebar Component
 *
 * Displays the navigation sidebar with tabs for the application.
 * Extracted from App.tsx lines 44-63 as part of Phase 3.2.2 refactoring.
 */

import type { LucideIcon } from 'lucide-react';

export interface TabItem {
  /** Unique identifier for the tab */
  id: string;
  /** Display label for the tab */
  label: string;
  /** Icon component from lucide-react */
  icon: LucideIcon;
}

interface SidebarProps {
  /** Array of tab items to display */
  tabs: TabItem[];
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when a tab is clicked */
  onTabChange: (tabId: string) => void;
}

export function Sidebar({ tabs, activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-full md:w-64 shrink-0">
      <nav className={`
        ${activeTab ? 'flex md:flex-col md:space-y-1' : 'space-y-1'}
        overflow-x-auto md:overflow-x-visible
        -mx-4 px-4 md:mx-0 md:px-0
        scrollbar-hide
      `}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg transition-colors shrink-0
                whitespace-nowrap
                ${activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-accent text-foreground'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium text-sm md:text-base">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
