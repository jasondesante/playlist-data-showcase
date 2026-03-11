import { ArrowRight } from 'lucide-react';
import './StepCompletionPrompt.css';

export interface StepCompletionPromptAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
    icon?: typeof ArrowRight;
}

interface StepCompletionPromptProps {
    message: string;
    actions: StepCompletionPromptAction[];
    visible: boolean;
}

/**
 * StepCompletionPrompt
 *
 * Displays a subtle prompt at the bottom of a step's content after completion,
 * guiding users to the next logical step or offering skip options.
 */
export function StepCompletionPrompt({ message, actions, visible }: StepCompletionPromptProps) {
    if (!visible) return null;

    return (
        <div className="step-completion-prompt">
            <div className="step-completion-prompt-message">
                {message}
            </div>
            <div className="step-completion-prompt-actions">
                {actions.map((action, index) => {
                    const Icon = action.icon || ArrowRight;
                    const isPrimary = action.variant !== 'secondary';

                    return (
                        <button
                            key={index}
                            className={`step-completion-prompt-action ${isPrimary ? 'step-completion-prompt-action-primary' : 'step-completion-prompt-action-secondary'}`}
                            onClick={action.onClick}
                        >
                            <span className="step-completion-prompt-action-label">{action.label}</span>
                            <Icon className="step-completion-prompt-action-icon" size={14} />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default StepCompletionPrompt;
