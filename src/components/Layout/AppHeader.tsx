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
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </header>
  );
}

export default AppHeader;
