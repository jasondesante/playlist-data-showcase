import { useState, useCallback, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Clamp a position so the tooltip stays within the viewport.
 */
function clampToViewport(x: number, y: number, width: number, height: number) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const pad = 8;

    if (x - width / 2 < pad) x = width / 2 + pad;
    if (x + width / 2 > vw - pad) x = vw - width / 2 - pad;
    if (y - height < pad) y = height + pad;
    if (y > vh - pad) y = vh - pad;

    return { x, y };
}

/**
 * Wrapper that shows a portal-based tooltip that follows the mouse cursor.
 *
 * Replaces CSS ::after pseudo-element tooltips that get clipped by
 * overflow:hidden containers. Uses createPortal to document.body
 * with position:fixed, matching the HitMissChart pattern.
 */
export function PillTooltip({ tooltip, children }: { tooltip: string; children: ReactNode }) {
    const [visible, setVisible] = useState(false);
    const mouseRef = useRef({ x: 0, y: 0 });
    const [, forceUpdate] = useState(0);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        mouseRef.current = { x: e.clientX, y: e.clientY };
        forceUpdate(n => n + 1);
    }, []);

    const handleMouseEnter = useCallback(() => {
        setVisible(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setVisible(false);
    }, []);

    const pos = clampToViewport(mouseRef.current.x, mouseRef.current.y, 280, 50);

    return (
        <>
            <div
                onMouseMove={handleMouseMove}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{ display: 'contents' }}
            >
                {children}
            </div>
            {visible && createPortal(
                <div
                    className="pill-tooltip-portal"
                    style={{
                        position: 'fixed',
                        left: pos.x,
                        top: pos.y,
                        transform: 'translate(-50%, -100%)',
                        zIndex: 9999,
                        pointerEvents: 'none',
                        maxWidth: 280,
                    }}
                >
                    {tooltip}
                </div>,
                document.body,
            )}
        </>
    );
}
