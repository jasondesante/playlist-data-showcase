/**
 * MainLayout Component
 *
 * Main container layout for the application.
 * Extracted from App.tsx lines 42-80 as part of Phase 3.2.3 refactoring.
 *
 * This component provides the primary layout structure including:
 * - Container with proper spacing
 * - Single-column layout (main content only)
 * - Card-based main content area
 *
 * Navigation is now handled in the AppHeader tabs.
 */

interface MainLayoutProps {
  /** Content to render in the main area */
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="main-layout">
      <div className="main-layout-grid">
        <main className="main-content">
          <div className="main-content-card">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
