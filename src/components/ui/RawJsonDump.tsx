/**
 * RawJsonDump Component
 *
 * Displays raw JSON data in a collapsible section for debugging and engine verification.
 * Created as part of Phase 3.6.1 of COMPLETION_PLAN.md.
 *
 * Features:
 * - Collapsible using HTML <details>/<summary>
 * - Syntax-highlighted JSON with 2-space indent
 * - Timestamp display
 * - Copy to clipboard button
 * - Optional default state (open/collapsed)
 */

import { useState, useCallback } from 'react';
import { Copy, Check } from 'lucide-react';

interface RawJsonDumpProps {
  /** The data to display as JSON */
  data: unknown;
  /** Title shown in the summary */
  title: string;
  /** Whether the details element should be open by default */
  defaultOpen?: boolean;
  /** Optional timestamp to display */
  timestamp?: Date | string;
  /** Optional status indicator */
  status?: 'healthy' | 'degraded' | 'error';
}

export function RawJsonDump({ data, title, defaultOpen = false, timestamp, status }: RawJsonDumpProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const jsonStr = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [data]);

  const formatTimestamp = (ts: Date | string): string => {
    if (ts instanceof Date) {
      return ts.toISOString();
    }
    return ts;
  };

  const getStatusEmoji = () => {
    switch (status) {
      case 'healthy': return '🟢';
      case 'degraded': return '🟡';
      case 'error': return '🔴';
      default: return null;
    }
  };

  const getStatusBgColor = () => {
    switch (status) {
      case 'healthy': return 'border-l-green-500';
      case 'degraded': return 'border-l-yellow-500';
      case 'error': return 'border-l-red-500';
      default: return 'border-l-border';
    }
  };

  return (
    <details
      open={defaultOpen}
      className="group/details border border-border rounded-md overflow-hidden"
    >
      <summary className="flex items-center justify-between cursor-pointer bg-muted/50 hover:bg-muted transition-colors select-none">
        <div className="flex items-center gap-2 px-4 py-3">
          {status && <span>{getStatusEmoji()}</span>}
          <span className="font-medium">{title}</span>
          {timestamp && (
            <span className="text-xs text-muted-foreground">
              {formatTimestamp(timestamp)}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleCopy();
          }}
          className="mr-3 p-2 rounded hover:bg-background transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </summary>
      <div className={`border-l-4 ${getStatusBgColor()}`}>
        <pre className="p-4 text-xs overflow-x-auto bg-background">
          <code>{JSON.stringify(data, null, 2)}</code>
        </pre>
      </div>
    </details>
  );
}

export default RawJsonDump;
