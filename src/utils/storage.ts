import localforage from 'localforage';
import { logger } from './logger';

/**
 * Storage Utility
 * 
 * Wraps LocalForage for IndexedDB persistence.
 * Implements Principle 3 by logging storage operations.
 */

// Initialize LocalForage instance
localforage.config({
    name: 'PlaylistDataShowcase',
    storeName: 'app_state',
    description: 'Storage for Playlist Data Engine Showcase App'
});

export const storage = {
    async getItem<T>(key: string): Promise<T | null> {
        try {
            const value = await localforage.getItem<T>(key);
            logger.debug('Store', `Retrieved ${key}`, value);
            return value;
        } catch (error) {
            logger.error('Store', `Failed to get item: ${key}`, error);
            return null;
        }
    },

    async setItem<T>(key: string, value: T): Promise<T> {
        try {
            const result = await localforage.setItem<T>(key, value);
            logger.debug('Store', `Saved ${key}`, value);
            return result;
        } catch (error) {
            logger.error('Store', `Failed to set item: ${key}`, error);
            throw error;
        }
    },

    async removeItem(key: string): Promise<void> {
        try {
            await localforage.removeItem(key);
            logger.info('Store', `Removed ${key}`);
        } catch (error) {
            logger.error('Store', `Failed to remove item: ${key}`, error);
            throw error;
        }
    },

    async clear(): Promise<void> {
        try {
            await localforage.clear();
            logger.warn('Store', 'Storage cleared');
        } catch (error) {
            logger.error('Store', 'Failed to clear storage', error);
            throw error;
        }
    },

    async keys(): Promise<string[]> {
        try {
            return await localforage.keys();
        } catch (error) {
            logger.error('Store', 'Failed to get keys', error);
            return [];
        }
    }
};
