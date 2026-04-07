/**
 * Balance Config Transfer
 *
 * Lightweight mechanism to transfer encounter configuration from CombatSimulatorTab
 * to BalanceLabTab when the user clicks "Run Balance Simulation".
 *
 * Uses a custom event on window so the two tabs can communicate without
 * tight coupling or shared state management.
 */

import type { CharacterSheet } from 'playlist-data-engine';
import type { EncounterConfigUI } from '@/types/simulation';

export interface BalanceConfigTransferPayload {
    /** Party members (CharacterSheets) */
    party: CharacterSheet[];
    /** Pre-generated enemies (CharacterSheets) */
    enemies: CharacterSheet[];
    /** Encounter configuration for the Balance Lab form */
    encounterConfig: EncounterConfigUI;
    /** Party member seed identifiers for selection in Balance Lab */
    partySeeds: string[];
}

const TRANSFER_EVENT = 'balance-config-transfer';

/**
 * Dispatch a config transfer event from CombatSimulatorTab.
 * BalanceLabTab will listen for this and pre-fill its form.
 */
export function dispatchBalanceConfigTransfer(payload: BalanceConfigTransferPayload): void {
    window.dispatchEvent(new CustomEvent<BalanceConfigTransferPayload>(TRANSFER_EVENT, {
        detail: payload,
    }));
}

/**
 * Subscribe to config transfer events in BalanceLabTab.
 * Returns an unsubscribe function.
 */
export function onBalanceConfigTransfer(
    handler: (payload: BalanceConfigTransferPayload) => void,
): () => void {
    const listener = (event: Event) => {
        handler((event as CustomEvent<BalanceConfigTransferPayload>).detail);
    };
    window.addEventListener(TRANSFER_EVENT, listener);
    return () => window.removeEventListener(TRANSFER_EVENT, listener);
}
