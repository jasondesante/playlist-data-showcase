/**
 * StepNav Component
 *
 * Horizontal step navigation for the beat detection wizard UI.
 * Part of Beat Detection Step-Based UI Refactor - Phase 2, Task 2.1.
 *
 * Features:
 * - Horizontal tabs with descriptive labels (no step numbers)
 * - Checkmark (✓) displayed before label for completed steps
 * - Step 4 shows "Ready" when available, "Not Ready" when disabled
 * - Active step highlighted with primary color
 * - Disabled steps grayed out with reduced opacity
 * - Keyboard navigation support (Arrow keys, Enter/Space)
 * - Full accessibility with ARIA attributes
 */

import { useCallback, useRef, useEffect, useState, type KeyboardEvent } from 'react';
import { cn } from '../../utils/cn';
import './StepNav.css';

export interface Step {
    /** Step identifier (1-4) */
    id: number;
    /** Base label for the step */
    label: string;
    /** Optional dynamic label - overrides label when step becomes available */
    dynamicLabel?: {
        /** Label when step is available */
        available: string;
        /** Label when step is disabled */
        disabled: string;
    };
}

export interface StepNavProps {
    /** Array of step configurations */
    steps: Step[];
    /** Currently active step number */
    currentStep: number;
    /** Set of completed step numbers */
    completedSteps: Set<number>;
    /** Set of available (clickable) step numbers */
    availableSteps: Set<number>;
    /** Callback when a step is clicked */
    onStepClick: (step: number) => void;
    /** ID of the tab panel that this nav controls (for aria-controls) */
    panelId?: string;
    /** Optional class name for the container */
    className?: string;
    /** Key to force re-render/animation when mode changes (e.g., 'manual' or 'automatic') */
    modeKey?: string;
}

/**
 * StepNav - Horizontal step navigation component
 *
 * Renders a horizontal tab bar for navigating between wizard steps.
 * Supports completion indicators, availability states, and accessibility.
 */
export function StepNav({
    steps,
    currentStep,
    completedSteps,
    availableSteps,
    onStepClick,
    panelId,
    className,
    modeKey,
}: StepNavProps) {
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [isAnimating, setIsAnimating] = useState(false);
    const prevStepCountRef = useRef(steps.length);

    const handleKeyDown = useCallback((event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
        const availableStepIndices = steps
            .map((step, index) => ({ step, index }))
            .filter(({ step }) => availableSteps.has(step.id));

        const currentAvailableIndex = availableStepIndices.findIndex(({ index }) => index === currentIndex);

        let nextIndex: number | null = null;

        switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
                event.preventDefault();
                if (currentAvailableIndex < availableStepIndices.length - 1) {
                    nextIndex = availableStepIndices[currentAvailableIndex + 1].index;
                } else if (availableStepIndices.length > 0) {
                    nextIndex = availableStepIndices[0].index;
                }
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
                event.preventDefault();
                if (currentAvailableIndex > 0) {
                    nextIndex = availableStepIndices[currentAvailableIndex - 1].index;
                } else if (availableStepIndices.length > 0) {
                    nextIndex = availableStepIndices[availableStepIndices.length - 1].index;
                }
                break;
            case 'Home':
                event.preventDefault();
                if (availableStepIndices.length > 0) {
                    nextIndex = availableStepIndices[0].index;
                }
                break;
            case 'End':
                event.preventDefault();
                if (availableStepIndices.length > 0) {
                    nextIndex = availableStepIndices[availableStepIndices.length - 1].index;
                }
                break;
            default:
                return;
        }

        if (nextIndex !== null) {
            tabRefs.current[nextIndex]?.focus();
        }
    }, [steps, availableSteps]);

    /**
     * Detect step count changes and trigger animation.
     * This handles the transition between 3-step (auto mode) and 4-step (manual mode) configurations.
     */
    useEffect(() => {
        const currentStepCount = steps.length;
        if (prevStepCountRef.current !== currentStepCount) {
            // Step count changed - trigger animation
            setIsAnimating(true);
            prevStepCountRef.current = currentStepCount;

            // Remove animation class after animation completes
            const timer = setTimeout(() => {
                setIsAnimating(false);
            }, 300); // Match animation duration

            return () => clearTimeout(timer);
        }
    }, [steps.length, modeKey]);

    const getStepLabel = (step: Step, isAvailable: boolean): string => {
        if (step.dynamicLabel) {
            return isAvailable ? step.dynamicLabel.available : step.dynamicLabel.disabled;
        }
        return step.label;
    };

    const getAriaLabel = (step: Step, isAvailable: boolean, isCompleted: boolean): string => {
        const label = getStepLabel(step, isAvailable);
        const status = isCompleted ? 'completed' : isAvailable ? 'available' : 'not available';
        return `${label}, ${status}`;
    };

    return (
        <nav
            className={cn(
                'step-nav',
                isAnimating && 'step-nav-animating',
                className
            )}
            role="tablist"
            aria-label="Beat detection workflow steps"
            key={modeKey}
        >
            {steps.map((step, index) => {
                const isCompleted = completedSteps.has(step.id);
                const isAvailable = availableSteps.has(step.id);
                const isActive = currentStep === step.id;
                const label = getStepLabel(step, isAvailable);

                return (
                    <button
                        key={step.id}
                        id={`step-nav-tab-${step.id}`}
                        ref={(el) => { tabRefs.current[index] = el; }}
                        type="button"
                        role="tab"
                        tabIndex={isActive ? 0 : -1}
                        aria-selected={isActive}
                        aria-disabled={!isAvailable}
                        aria-controls={panelId}
                        aria-label={getAriaLabel(step, isAvailable, isCompleted)}
                        disabled={!isAvailable}
                        data-step-number={step.id}
                        className={cn(
                            'step-nav-tab',
                            isActive && 'step-nav-tab-active',
                            isCompleted && 'step-nav-tab-completed',
                            !isAvailable && 'step-nav-tab-disabled'
                        )}
                        onClick={() => isAvailable && onStepClick(step.id)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                    >
                        {isCompleted && (
                            <span className="step-nav-checkmark" aria-hidden="true">
                                ✓
                            </span>
                        )}
                        <span className="step-nav-label">{label}</span>
                    </button>
                );
            })}
        </nav>
    );
}

export default StepNav;
