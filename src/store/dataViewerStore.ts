import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { storage } from '@/utils/storage';
import { logger } from '@/utils/logger';

/**
 * State for tracking data viewer updates and changes
 */
interface DataViewerState {
    /** Timestamp of last data change (custom item added, etc.) */
    lastDataChange: number | null;
    /** Whether there are pending changes to show in Data Viewer */
    hasPendingChanges: boolean;
    /** Last known equipment count */
    lastEquipmentCount: number;

    /**
     * Notify that data has changed (e.g., custom item added)
     * This will trigger the "New!" badge on the Data Viewer tab
     */
    notifyDataChanged: () => void;
    /**
     * Mark pending changes as viewed (clears the "New!" badge)
     * Call this when the user visits the Data Viewer tab
     */
    markChangesViewed: () => void;
    /**
     * Update the last known equipment count
     * @param count - The current equipment count
     */
    updateEquipmentCount: (count: number) => void;
    /**
     * Check if equipment count has increased
     * @param currentCount - The current equipment count to compare
     * @returns true if count has increased since last check
     */
    hasEquipmentCountIncreased: (currentCount: number) => boolean;
}

export const useDataViewerStore = create<DataViewerState>()(
    persist(
        (set, get) => ({
            lastDataChange: null,
            hasPendingChanges: false,
            lastEquipmentCount: 0,

            /**
             * Notify that data has changed (e.g., custom item added)
             * This will trigger the "New!" badge on the Data Viewer tab
             */
            notifyDataChanged: () => {
                logger.debug('DataViewer', 'Data change notified');
                set({
                    lastDataChange: Date.now(),
                    hasPendingChanges: true
                });
            },

            /**
             * Mark pending changes as viewed (clears the "New!" badge)
             * Call this when the user visits the Data Viewer tab
             */
            markChangesViewed: () => {
                if (get().hasPendingChanges) {
                    logger.debug('DataViewer', 'Changes marked as viewed');
                    set({ hasPendingChanges: false });
                }
            },

            /**
             * Update the last known equipment count
             * @param count - The current equipment count
             */
            updateEquipmentCount: (count: number) => {
                set({ lastEquipmentCount: count });
            },

            /**
             * Check if equipment count has increased
             * @param currentCount - The current equipment count to compare
             * @returns true if count has increased since last check
             */
            hasEquipmentCountIncreased: (currentCount: number) => {
                return currentCount > get().lastEquipmentCount;
            }
        }),
        {
            name: 'dataviewer-storage',
            storage: createJSONStorage(() => storage),
            // Only persist certain fields
            partialize: (state) => ({
                lastEquipmentCount: state.lastEquipmentCount
            })
        }
    )
);
