/**
 * MainLayout Component
 *
 * Main container layout for the application.
 * Extracted from App.tsx lines 42-80 as part of Phase 3.2.3 refactoring.
 *
 * This component provides the primary layout structure including:
 * - Container with proper spacing
 * - Two-column layout (sidebar + main content)
 * - Card-based main content area
 */

import type { TabItem } from './Sidebar';
import { Sidebar } from './Sidebar';

interface MainLayoutProps {
  /** Array of tab items for the sidebar navigation */
  tabs: TabItem[];
  /** Currently active tab ID */
  activeTab: string;
  /** Callback when a tab is clicked */
  onTabChange: (tabId: string) => void;
  /** Content to render in the main area */
  children: React.ReactNode;
}

export function MainLayout({ tabs, activeTab, onTabChange, children }: MainLayoutProps) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex gap-6">
        <Sidebar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />

        <main className="flex-1">
          <div className="bg-card border border-border rounded-lg p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
