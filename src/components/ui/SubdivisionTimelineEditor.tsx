/**
 * SubdivisionTimelineEditor Component
 *
 * DEPRECATED: This component uses the segment-based configuration format
 * which is incompatible with the new per-beat subdivision format.
 *
 * Phase 7: This component will be removed and replaced with BeatSubdivisionGrid.
 *
 * @deprecated Use SubdivisionSettings instead
 * @see SubdivisionSettings - The parent component with timeline editing
 */

import './SubdivisionTimelineEditor.css';

interface SubdivisionTimelineEditorProps {
    /** Whether controls should be disabled */
    disabled?: boolean;
    /** Whether to show the timeline editor */
    showTimeline?: boolean;
}

/**
 * @deprecated SubdivisionTimelineEditor
 * Use SubdivisionSettings instead
 */
export function SubdivisionTimelineEditor({ disabled: _disabled = false, showTimeline: _showTimeline = false }: SubdivisionTimelineEditorProps) {
    // Per-beat format doesn't have segments - return empty
    return null;
}
