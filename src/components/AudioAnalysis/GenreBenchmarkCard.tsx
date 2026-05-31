import { useState, useMemo, useCallback } from 'react';
import { FlaskConical, Check, X, ArrowUp, ArrowDown, Minus, Trash2, Copy, CheckCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import type { MusicClassificationProfile } from '@/types';
import './GenreBenchmarkCard.css';

export interface BenchmarkRun {
  label: string;
  duration: number | null;       // null = full song
  startPosition: number;
  elapsedMs: number;
  profile: MusicClassificationProfile;
}

export interface GenreBenchmarkCardProps {
  runs: BenchmarkRun[];
  isRunning: boolean;
  currentRunIndex: number;
  error: string | null;
  onClear: () => void;
}

/** Number of top genres/moods to compare for overlap scoring */
const BENCHMARK_COMPARE_N = 10;

// Take the top N tags from a ClassificationTag array
function topN(tags: MusicClassificationProfile['genres'], n: number) {
  return tags.slice(0, n);
}

// Count how many reference tags appear in the candidate list at the same or better position.
// A reference tag at rank R only counts if the candidate also has it at rank R or higher.
function overlapCount(reference: string[], candidate: string[]) {
  let count = 0;
  const candidateLower = candidate.map(t => t.toLowerCase());
  for (let i = 0; i < reference.length; i++) {
    const limit = i + 1; // must appear in first (i+1) positions
    const window = candidateLower.slice(0, limit);
    if (window.includes(reference[i].toLowerCase())) {
      count++;
    }
  }
  return count;
}

// Find confidence for a tag name in an array (best match)
function findConfidence(tags: MusicClassificationProfile['genres'], name: string): number {
  const match = tags.find(t => t.name.toLowerCase() === name.toLowerCase());
  return match?.confidence ?? 0;
}

function formatDelta(delta: number): string {
  const abs = Math.abs(delta);
  if (abs < 0.001) return '0.00';
  return delta >= 0 ? `+${abs.toFixed(2)}` : `-${abs.toFixed(2)}`;
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function DeltaBadge({ delta }: { delta: number }) {
  const abs = Math.abs(delta);
  if (abs < 0.01) return <span className="gb-delta-badge gb-delta-neutral"><Minus size={10} /> {formatDelta(delta)}</span>;
  if (delta >= 0) return <span className="gb-delta-badge gb-delta-positive"><ArrowUp size={10} /> {formatDelta(delta)}</span>;
  return <span className="gb-delta-badge gb-delta-negative"><ArrowDown size={10} /> {formatDelta(delta)}</span>;
}

export function GenreBenchmarkCard({ runs, isRunning, currentRunIndex, error, onClear }: GenreBenchmarkCardProps) {
  const reference = runs[0]?.profile; // Full song is always first

  const insights = useMemo(() => {
    if (runs.length < 2 || !reference) return [];

    const fullElapsed = runs[0].elapsedMs;
    const N = BENCHMARK_COMPARE_N;
    const result: string[] = [];

    for (let i = 1; i < runs.length; i++) {
      const run = runs[i];
      if (!run.profile) continue;
      const speedup = fullElapsed / run.elapsedMs;
      const genreMatch = run.profile.primary_genre === reference.primary_genre;
      const genreOverlap = overlapCount(
        topN(reference.genres, N).map(t => t.name),
        topN(run.profile.genres, N).map(t => t.name)
      );
      const moodMatch = run.profile.mood_tags[0] === reference.mood_tags[0];
      const moodOverlap = overlapCount(
        topN(reference.moods, N).map(t => t.name),
        topN(run.profile.moods, N).map(t => t.name)
      );

      const genreNote = genreMatch
        ? `genre correct (${genreOverlap}/${N})`
        : `genre wrong (${genreOverlap}/${N})`;
      const moodNote = moodMatch
        ? `mood correct (${moodOverlap}/${N})`
        : `mood wrong (${moodOverlap}/${N})`;
      result.push(`${run.label}: ${speedup.toFixed(1)}x faster — ${genreNote}, ${moodNote}`);
    }

    return result;
  }, [runs, reference]);

  const clipboardText = useMemo(() => {
    if (runs.length < 2 || !reference) return '';
    const N = BENCHMARK_COMPARE_N;
    const lines: string[] = ['GENRE BENCHMARK RESULTS', `Track: ${reference.analysis_metadata.analyzed_at}`, ''];

    // Speed table
    lines.push('== SPEED ==');
    const fullElapsed = runs[0].elapsedMs;
    for (const run of runs) {
      const speedup = run === runs[0] ? null : fullElapsed / run.elapsedMs;
      lines.push(`  ${run.label.padEnd(12)} ${formatMs(run.elapsedMs).padEnd(8)}${speedup !== null ? `${speedup.toFixed(1)}x` : '—'}`);
    }
    lines.push('');

    // Genre comparison
    lines.push('== GENRE ACCURACY (top 10) ==');
    lines.push(`  Reference: ${topN(reference.genres, N).map(t => t.name).join(', ')}`);
    for (let i = 1; i < runs.length; i++) {
      const run = runs[i];
      const match = run.profile.primary_genre === reference.primary_genre;
      const overlap = overlapCount(
        topN(reference.genres, N).map(t => t.name),
        topN(run.profile.genres, N).map(t => t.name)
      );
      lines.push(`  ${run.label.padEnd(12)} primary=${match ? 'MATCH' : 'MISMATCH'} (${run.profile.primary_genre}) overlap=${overlap}/${N}`);
    }
    lines.push('');

    // Mood comparison
    lines.push('== MOOD ACCURACY (top 10) ==');
    lines.push(`  Reference: ${topN(reference.moods, N).map(t => t.name).join(', ')}`);
    for (let i = 1; i < runs.length; i++) {
      const run = runs[i];
      const match = run.profile.mood_tags[0] === reference.mood_tags[0];
      const overlap = overlapCount(
        topN(reference.moods, N).map(t => t.name),
        topN(run.profile.moods, N).map(t => t.name)
      );
      lines.push(`  ${run.label.padEnd(12)} primary=${match ? 'MATCH' : 'MISMATCH'} (${run.profile.mood_tags[0] ?? '—'}) overlap=${overlap}/${N}`);
    }
    lines.push('');

    // Vibe metrics
    lines.push('== VIBE METRICS ==');
    for (const run of runs) {
      const v = run.profile.vibe_metrics;
      const vals = VIBE_KEYS.map(k => `${k}=${(v?.[k] ?? 0).toFixed(2)}`).join('  ');
      lines.push(`  ${run.label.padEnd(12)} ${vals}`);
    }
    lines.push('');

    // Insights
    lines.push('== INSIGHTS ==');
    for (const insight of insights) {
      lines.push(`  - ${insight}`);
    }

    return lines.join('\n');
  }, [runs, reference, insights]);

  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(async () => {
    if (!clipboardText) return;
    await navigator.clipboard.writeText(clipboardText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [clipboardText]);

  if (runs.length === 0 && !isRunning) return null;

  return (
    <Card variant="elevated" padding="md" className="gb-card full-width">
      <CardHeader className="gb-header">
        <div className="gb-header-left">
          <FlaskConical size={16} className="gb-header-icon" />
          <div className="gb-header-titles">
            <CardTitle className="gb-title">Genre Benchmark</CardTitle>
            <span className="gb-subtitle">
              {isRunning
                ? `Run ${currentRunIndex + 1}/${runs.length + (5 - runs.length - (isRunning ? 1 : 0))}: ${BENCHMARK_CONFIGS[Math.min(currentRunIndex, BENCHMARK_CONFIGS.length - 1)].label}...`
                : `${runs.length} runs complete`}
            </span>
          </div>
        </div>
        <div className="gb-header-actions">
          {runs.length > 0 && !isRunning && (
            <button type="button" className={`gb-copy-btn${copied ? ' gb-copy-btn--copied' : ''}`} onClick={handleCopy} title="Copy benchmark results to clipboard">
              {copied ? <CheckCheck size={14} /> : <Copy size={14} />}
              <span className="gb-copy-label">{copied ? 'Copied' : 'Copy'}</span>
            </button>
          )}
          {runs.length > 0 && !isRunning && (
            <button type="button" className="gb-clear-btn" onClick={onClear} title="Clear benchmark results">
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </CardHeader>

      {error && (
        <div className="gb-error">{error}</div>
      )}

      {/* Speed table */}
      {runs.length > 0 && (
        <div className="gb-section">
          <div className="gb-section-title">Speed Comparison</div>
          <div className="gb-table">
            <div className="gb-table-row gb-table-header">
              <span className="gb-table-cell gb-table-cell--label">Segment</span>
              <span className="gb-table-cell gb-table-cell--duration">Duration</span>
              <span className="gb-table-cell gb-table-cell--time">Time</span>
              <span className="gb-table-cell gb-table-cell--speedup">Speedup</span>
            </div>
            {runs.map((run, i) => {
              const fullElapsed = runs[0].elapsedMs;
              const speedup = i === 0 ? null : fullElapsed / run.elapsedMs;
              return (
                <div key={i} className={`gb-table-row${i === 0 ? ' gb-table-row--reference' : ''}`}>
                  <span className="gb-table-cell gb-table-cell--label">{run.label}{i === 0 && <span className="gb-ref-badge">Reference</span>}</span>
                  <span className="gb-table-cell gb-table-cell--duration">{run.duration !== null ? `${run.duration}s` : 'Full'}</span>
                  <span className="gb-table-cell gb-table-cell--time">{formatMs(run.elapsedMs)}</span>
                  <span className="gb-table-cell gb-table-cell--speedup">
                    {speedup !== null ? `${speedup.toFixed(1)}x` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Genre comparison */}
      {runs.length > 1 && reference && (
        <div className="gb-section">
          <div className="gb-section-title">Genre Accuracy</div>
          <div className="gb-comparison-grid">
            {/* Reference row */}
            <div className="gb-comp-header">
              <span className="gb-comp-label">Reference genres:</span>
              <div className="gb-comp-tags">
                {topN(reference.genres, BENCHMARK_COMPARE_N).map(t => (
                  <span key={t.name} className="gb-comp-tag gb-comp-tag--ref">{t.name}</span>
                ))}
              </div>
            </div>
            {/* Per-run comparison */}
            {runs.slice(1).map((run, i) => {
              const profile = run.profile;
              const primaryMatch = profile.primary_genre === reference.primary_genre;
              const refGenres = topN(reference.genres, BENCHMARK_COMPARE_N).map(t => t.name);
              const runGenres = topN(profile.genres, BENCHMARK_COMPARE_N).map(t => t.name);
              const overlap = overlapCount(refGenres, runGenres);
              const confDelta = findConfidence(profile.genres, reference.primary_genre) - findConfidence(reference.genres, reference.primary_genre);

              return (
                <div key={i} className="gb-comp-row">
                  <div className="gb-comp-row-header">
                    <span className="gb-comp-row-label">{run.label}</span>
                    <span className="gb-comp-row-genre">{profile.primary_genre}</span>
                    <span className={`gb-comp-match${primaryMatch ? ' gb-comp-match--yes' : ' gb-comp-match--no'}`}>
                      {primaryMatch ? <Check size={12} /> : <X size={12} />}
                    </span>
                    <span className="gb-comp-overlap">{overlap}/{BENCHMARK_COMPARE_N}</span>
                    <DeltaBadge delta={confDelta} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mood comparison */}
      {runs.length > 1 && reference && (
        <div className="gb-section">
          <div className="gb-section-title">Mood Accuracy</div>
          <div className="gb-comparison-grid">
            <div className="gb-comp-header">
              <span className="gb-comp-label">Reference moods:</span>
              <div className="gb-comp-tags">
                {topN(reference.moods, BENCHMARK_COMPARE_N).map(t => (
                  <span key={t.name} className="gb-comp-tag gb-comp-tag--ref">{t.name}</span>
                ))}
              </div>
            </div>
            {runs.slice(1).map((run, i) => {
              const profile = run.profile;
              const primaryMatch = profile.mood_tags[0] === reference.mood_tags[0];
              const refMoods = topN(reference.moods, BENCHMARK_COMPARE_N).map(t => t.name);
              const runMoods = topN(profile.moods, BENCHMARK_COMPARE_N).map(t => t.name);
              const overlap = overlapCount(refMoods, runMoods);
              const confDelta = findConfidence(profile.moods, reference.moods[0].name) - findConfidence(reference.moods, reference.moods[0].name);

              return (
                <div key={i} className="gb-comp-row">
                  <div className="gb-comp-row-header">
                    <span className="gb-comp-row-label">{run.label}</span>
                    <span className="gb-comp-row-genre">{profile.mood_tags[0] ?? '—'}</span>
                    <span className={`gb-comp-match${primaryMatch ? ' gb-comp-match--yes' : ' gb-comp-match--no'}`}>
                      {primaryMatch ? <Check size={12} /> : <X size={12} />}
                    </span>
                    <span className="gb-comp-overlap">{overlap}/{BENCHMARK_COMPARE_N}</span>
                    <DeltaBadge delta={confDelta} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Vibe metrics comparison */}
      {runs.length > 1 && reference?.vibe_metrics && (
        <div className="gb-section">
          <div className="gb-section-title">Vibe Metrics</div>
          <div className="gb-table">
            <div className="gb-table-row gb-table-header">
              <span className="gb-table-cell gb-table-cell--label">Segment</span>
              {VIBE_KEYS.map(key => (
                <span key={key} className="gb-table-cell gb-table-cell--metric">{key}</span>
              ))}
            </div>
            {runs.map((run, i) => (
              <div key={i} className={`gb-table-row${i === 0 ? ' gb-table-row--reference' : ''}`}>
                <span className="gb-table-cell gb-table-cell--label">{run.label}</span>
                {VIBE_KEYS.map(key => {
                  const refVal = reference.vibe_metrics?.[key] ?? 0;
                  const runVal = run.profile.vibe_metrics?.[key];
                  return (
                    <span key={key} className="gb-table-cell gb-table-cell--metric">
                      {runVal !== undefined ? (
                        <>
                          {runVal.toFixed(2)}
                          {i > 0 && <DeltaBadge delta={runVal - refVal} />}
                        </>
                      ) : '—'}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="gb-section gb-insights">
          <div className="gb-section-title">Insights</div>
          <ul className="gb-insights-list">
            {insights.map((insight, i) => (
              <li key={i} className="gb-insight-item">{insight}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

/** Benchmark run configurations — exported for reuse in AudioAnalysisTab */
export const BENCHMARK_CONFIGS = [
  { label: 'Full Song', durationSeconds: null as number | null, startPosition: 0.3 },
  { label: '120s',       durationSeconds: 120,                startPosition: 0.3 },
  { label: '60s',        durationSeconds: 60,                 startPosition: 0.3 },
  { label: '30s',        durationSeconds: 30,                 startPosition: 0.3 },
  { label: '15s',        durationSeconds: 15,                 startPosition: 0.3 },
];

const VIBE_KEYS: (keyof import('@/types').VibeMetrics)[] = ['danceability', 'energy', 'valence'];
