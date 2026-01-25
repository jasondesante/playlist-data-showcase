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

  return (
    <details
      open={defaultOpen}
      className="raw-json-dump"
    >
      <summary className="raw-json-summary">
        <div className="raw-json-summary-content">
          {status && <span>{getStatusEmoji()}</span>}
          <span className="raw-json-summary-title">{title}</span>
          {timestamp && (
            <span className="raw-json-summary-timestamp">
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
          className="raw-json-copy-button"
          aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
        >
          {copied ? (
            <Check className="copied" />
          ) : (
            <Copy className="uncopied" />
          )}
        </button>
      </summary>
      <div className={`raw-json-content ${status || 'healthy'}`}>
        <pre className="raw-json-pre">
          <code className="raw-json-code">{JSON.stringify(data, null, 2)}</code>
        </pre>
      </div>
    </details>
  );
}

export default RawJsonDump;
