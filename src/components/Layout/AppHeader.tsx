/**
 * AppHeader Component
 *
 * Displays the application header with title and subtitle.
 * Extracted from App.tsx lines 35-40 as part of Phase 3.2.1 refactoring.
 */

interface AppHeaderProps {
  /** Main title displayed in the header */
  title?: string;
  /** Subtitle/tagline displayed below the title */
  subtitle?: string;
}

export function AppHeader({ title = 'Playlist Data Engine Showcase', subtitle = 'Technical validation • Console logging enabled' }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="app-header-inner">
        <h1 className="app-header-title">{title}</h1>
        <p className="app-header-subtitle">{subtitle}</p>
      </div>
    </header>
  );
}

export default AppHeader;
