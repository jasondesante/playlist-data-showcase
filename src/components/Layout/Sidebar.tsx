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
  /** Optional: Badge count or text to display on the tab (e.g., pending stat increases, "New!") */
  badgeCount?: number | string;
  /** Optional: Whether to show the glow animation for the badge */
  showBadgeGlow?: boolean;
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
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const hasBadge = tab.badgeCount !== undefined;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              aria-current={activeTab === tab.id ? 'page' : undefined}
              className={`sidebar-button ${activeTab === tab.id ? 'sidebar-button-active' : ''}`}
            >
              <Icon className="sidebar-icon" />
              <span className="sidebar-label">{tab.label}</span>
              {hasBadge && (
                <span className={`tab-badge ${tab.showBadgeGlow ? 'tab-badge-glow' : ''}`}>
                  {tab.badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;
