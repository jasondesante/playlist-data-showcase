/**
 * ChartEditorToolbar Component
 *
 * A toolbar for the chart editor with style selection, tools, and import/export.
 * Part of Phase 4: Chart Editor UI - Task 4.3.
 *
 * Features:
 * - Chart style selector: DDR / Guitar Hero toggle
 * - Tool selection: Paint, Erase
 * - Clear All button
 * - Key palette integration (filtered by chart style)
 * - Chart statistics display (key count, keys used)
 * - Export Level button
 * - Import Level button with file picker
 *
 * @component
 */

import { useCallback, useRef, useState } from 'react';
import { cn } from '@/utils/cn';
import './ChartEditorToolbar.css';
import {
    useBeatDetectionStore,
    useChartStyle,
    useSelectedKey,
    useEditorMode,
    useChartStatistics,
    useSubdividedBeatMap,
} from '../../store/beatDetectionStore';
import { KeyPalette } from './KeyPalette';
import type {
    ChartStyle,
    SupportedKey,
    LevelExportData,
    LevelImportValidationResult,
} from '@/types';
import { getKeySymbol } from '@/types';

/**
 * Props for the ChartEditorToolbar component.
 */
export interface ChartEditorToolbarProps {
    /** Whether the toolbar is disabled */
    disabled?: boolean;
    /** Optional audio title for export */
    audioTitle?: string;
    /** Optional additional CSS classes */
    className?: string;
}

/**
 * ChartEditorToolbar Component
 *
 * Renders a toolbar for the chart editor with all controls and statistics.
 *
 * @example
 * ```tsx
 * <ChartEditorToolbar
 *   disabled={!hasSubdividedBeatMap}
 *   audioTitle={trackTitle}
 * />
 * ```
 */
export function ChartEditorToolbar({
    disabled = false,
    audioTitle,
    className,
}: ChartEditorToolbarProps) {
    const chartStyle = useChartStyle();
    const selectedKey = useSelectedKey();
    const editorMode = useEditorMode();
    const statistics = useChartStatistics();
    const subdividedBeatMap = useSubdividedBeatMap();

    // Store actions
    const setChartStyle = useBeatDetectionStore((state) => state.actions.setChartStyle);
    const setSelectedKey = useBeatDetectionStore((state) => state.actions.setSelectedKey);
    const setEditorMode = useBeatDetectionStore((state) => state.actions.setEditorMode);
    const clearAllKeys = useBeatDetectionStore((state) => state.actions.clearAllKeys);
    const exportLevel = useBeatDetectionStore((state) => state.actions.exportLevel);
    const importLevel = useBeatDetectionStore((state) => state.actions.importLevel);

    // File input ref for import
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Import state for error/success messages
    const [importStatus, setImportStatus] = useState<{
        type: 'success' | 'error' | null;
        message: string;
    }>({ type: null, message: '' });

    /**
     * Handle chart style change
     */
    const handleStyleChange = useCallback(
        (style: ChartStyle) => {
            if (disabled) return;
            setChartStyle(style);
            // Clear selected key when style changes since the available keys change
            setSelectedKey(null);
        },
        [disabled, setChartStyle, setSelectedKey]
    );

    /**
     * Handle tool selection
     */
    const handleToolChange = useCallback(
        (tool: 'paint' | 'erase') => {
            if (disabled) return;
            setEditorMode(tool);
        },
        [disabled, setEditorMode]
    );

    /**
     * Handle key selection from palette
     */
    const handleKeySelect = useCallback(
        (key: SupportedKey) => {
            if (disabled) return;
            setSelectedKey(key);
            // Auto-switch to paint mode when selecting a key
            if (editorMode !== 'paint') {
                setEditorMode('paint');
            }
        },
        [disabled, editorMode, setSelectedKey, setEditorMode]
    );

    /**
     * Handle clear all keys
     */
    const handleClearAll = useCallback(() => {
        if (disabled) return;
        if (statistics.keyCount === 0) return;
        clearAllKeys();
    }, [disabled, statistics.keyCount, clearAllKeys]);

    /**
     * Handle export level
     */
    const handleExport = useCallback(() => {
        if (disabled || !subdividedBeatMap) return;

        const levelData = exportLevel(audioTitle);
        if (!levelData) return;

        // Create and trigger download
        const blob = new Blob([JSON.stringify(levelData, null, 2)], {
            type: 'application/json',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `level-${subdividedBeatMap.audioId}-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [disabled, subdividedBeatMap, audioTitle, exportLevel]);

    /**
     * Handle import click - trigger file picker
     */
    const handleImportClick = useCallback(() => {
        if (disabled) return;
        fileInputRef.current?.click();
    }, [disabled]);

    /**
     * Handle file selection for import
     */
    const handleFileSelect = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const file = event.target.files?.[0];
            if (!file) return;

            // Clear the input so the same file can be selected again
            event.target.value = '';

            try {
                const text = await file.text();
                const data = JSON.parse(text) as LevelExportData;

                const result: LevelImportValidationResult = importLevel(data);

                if (result.valid) {
                    setImportStatus({
                        type: 'success',
                        message: `Successfully imported level with ${data.metadata.keyCount} keys`,
                    });
                    // Clear success message after 3 seconds
                    setTimeout(() => setImportStatus({ type: null, message: '' }), 3000);
                } else {
                    setImportStatus({
                        type: 'error',
                        message: result.errors[0] || 'Import failed',
                    });
                    // Clear error message after 5 seconds
                    setTimeout(() => setImportStatus({ type: null, message: '' }), 5000);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to parse file';
                setImportStatus({
                    type: 'error',
                    message: `Import error: ${message}`,
                });
                setTimeout(() => setImportStatus({ type: null, message: '' }), 5000);
            }
        },
        [importLevel]
    );

    // Determine if export/import buttons should be enabled
    const canExport = !disabled && subdividedBeatMap !== null;
    const canImport = !disabled && subdividedBeatMap !== null;

    return (
        <div className={cn('chart-editor-toolbar', className)}>
            {/* Row 1: Style selector and Tools */}
            <div className="chart-editor-toolbar-row">
                {/* Chart style selector */}
                <div className="chart-editor-toolbar-group chart-editor-toolbar-group--style">
                    <span className="chart-editor-toolbar-label">Style</span>
                    <div className="chart-editor-style-toggle">
                        <button
                            className={cn(
                                'chart-editor-style-btn',
                                chartStyle === 'ddr' && 'chart-editor-style-btn--active'
                            )}
                            onClick={() => handleStyleChange('ddr')}
                            disabled={disabled}
                            title="DDR Mode: 4 arrow keys"
                        >
                            DDR
                        </button>
                        <button
                            className={cn(
                                'chart-editor-style-btn',
                                chartStyle === 'guitar-hero' && 'chart-editor-style-btn--active'
                            )}
                            onClick={() => handleStyleChange('guitar-hero')}
                            disabled={disabled}
                            title="Guitar Hero Mode: 5 number keys"
                        >
                            Guitar
                        </button>
                    </div>
                </div>

                {/* Tool selection */}
                <div className="chart-editor-toolbar-group chart-editor-toolbar-group--tools">
                    <span className="chart-editor-toolbar-label">Tool</span>
                    <div className="chart-editor-tools">
                        <button
                            className={cn(
                                'chart-editor-tool-btn',
                                editorMode === 'paint' && 'chart-editor-tool-btn--active'
                            )}
                            onClick={() => handleToolChange('paint')}
                            disabled={disabled}
                            title="Paint mode: Click or drag to assign keys"
                        >
                            Paint
                        </button>
                        <button
                            className={cn(
                                'chart-editor-tool-btn',
                                editorMode === 'erase' && 'chart-editor-tool-btn--active'
                            )}
                            onClick={() => handleToolChange('erase')}
                            disabled={disabled}
                            title="Erase mode: Click to remove key assignments"
                        >
                            Erase
                        </button>
                    </div>
                </div>

                {/* Clear all button */}
                <div className="chart-editor-toolbar-group chart-editor-toolbar-group--clear">
                    <button
                        className="chart-editor-clear-btn"
                        onClick={handleClearAll}
                        disabled={disabled || statistics.keyCount === 0}
                        title="Remove all key assignments"
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {/* Row 2: Key palette */}
            <div className="chart-editor-toolbar-row chart-editor-toolbar-row--palette">
                <KeyPalette
                    chartStyle={chartStyle}
                    selectedKey={selectedKey}
                    onKeySelect={handleKeySelect}
                    disabled={disabled}
                    showShortcuts={true}
                />
            </div>

            {/* Row 3: Statistics and Import/Export */}
            <div className="chart-editor-toolbar-row">
                {/* Statistics */}
                <div className="chart-editor-toolbar-group chart-editor-toolbar-group--stats">
                    <span className="chart-editor-toolbar-label">Statistics</span>
                    <div className="chart-editor-stats">
                        <span className="chart-editor-stat">
                            {statistics.keyCount} keys assigned
                        </span>
                        {statistics.usedKeys.length > 0 && (
                            <span className="chart-editor-stat chart-editor-stat--keys">
                                {statistics.usedKeys.map((k) => getKeySymbol(k as SupportedKey)).join(' ')}
                            </span>
                        )}
                    </div>
                </div>

                {/* Import/Export buttons */}
                <div className="chart-editor-toolbar-group chart-editor-toolbar-group--io">
                    <button
                        className="chart-editor-io-btn chart-editor-io-btn--export"
                        onClick={handleExport}
                        disabled={!canExport}
                        title="Export level (beat map + chart) as JSON"
                    >
                        Export Level
                    </button>
                    <button
                        className="chart-editor-io-btn chart-editor-io-btn--import"
                        onClick={handleImportClick}
                        disabled={!canImport}
                        title="Import level from JSON file"
                    >
                        Import Level
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json,application/json"
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                        aria-hidden="true"
                    />
                </div>
            </div>

            {/* Import status message */}
            {importStatus.type && (
                <div
                    className={cn(
                        'chart-editor-import-status',
                        `chart-editor-import-status--${importStatus.type}`
                    )}
                    role="alert"
                >
                    {importStatus.message}
                </div>
            )}
        </div>
    );
}

export default ChartEditorToolbar;
