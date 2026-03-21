/**
 * ExitPromptModal Component
 *
 * Modal displayed when user attempts to exit practice mode with unclaimed XP.
 * Shows a session summary with Score, XP, and Max Combo statistics.
 *
 * Part of the BeatPracticeView refactoring.
 */

interface ExitPromptModalProps {
  /** Whether the modal is visible */
  isOpen: boolean;
  /** Total score from the rhythm session */
  totalScore: number;
  /** Total XP earned in the session */
  totalXP: number;
  /** Maximum combo achieved during the session */
  maxCombo: number;
  /** Callback when user chooses to claim XP and exit */
  onClaimXPAndExit: () => void;
  /** Callback when user chooses to discard XP and exit */
  onDiscardAndExit: () => void;
  /** Callback when user cancels the exit */
  onCancel: () => void;
}

export function ExitPromptModal({
  isOpen,
  totalScore,
  totalXP,
  maxCombo,
  onClaimXPAndExit,
  onDiscardAndExit,
  onCancel,
}: ExitPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="exit-prompt-overlay"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-prompt-title"
    >
      <div className="exit-prompt-container">
        <h2 id="exit-prompt-title" className="exit-prompt-title">
          Session Summary
        </h2>

        <div className="exit-prompt-summary">
          <div className="exit-prompt-stat">
            <span className="exit-prompt-stat-value">{Math.round(totalScore)}</span>
            <span className="exit-prompt-stat-label">Score</span>
          </div>
          <div className="exit-prompt-stat exit-prompt-stat--xp">
            <span className="exit-prompt-stat-value">{Math.round(totalXP)}</span>
            <span className="exit-prompt-stat-label">XP</span>
          </div>
          <div className="exit-prompt-stat">
            <span className="exit-prompt-stat-value">{maxCombo}</span>
            <span className="exit-prompt-stat-label">Max Combo</span>
          </div>
        </div>

        <p className="exit-prompt-message">
          You have unclaimed XP from this session. What would you like to do?
        </p>

        <div className="exit-prompt-actions">
          <button
            type="button"
            className="exit-prompt-btn exit-prompt-btn--primary"
            onClick={onClaimXPAndExit}
          >
            Claim {Math.round(totalXP)} XP
          </button>
          <button
            type="button"
            className="exit-prompt-btn exit-prompt-btn--danger"
            onClick={onDiscardAndExit}
          >
            Discard & Exit
          </button>
          <button
            type="button"
            className="exit-prompt-btn exit-prompt-btn--secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
