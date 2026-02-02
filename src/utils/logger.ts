/**
 * Logger Utility
 * 
 * Implements Principle 3: Console Logging Over Test Suites.
 * Provides categorized logging to help developers debug engine behavior.
 */

type LogCategory =
    | 'System'
    | 'PlaylistParser'
    | 'AudioAnalyzer'
    | 'CharacterGenerator'
    | 'SessionTracker'
    | 'XPCalculator'
    | 'CharacterUpdater'
    | 'EnvironmentalSensors'
    | 'GamingPlatformSensors'
    | 'CombatEngine'
    | 'Settings'
    | 'Store'
    | 'AutoCharacterSetup'
    | 'SessionCompletion'
    | 'FeatureNames'
    | 'HeroEquipment';



class Logger {
    private isEnabled = true;
    private verbose = false;

    constructor() {
        // Check if verbose logging is enabled in localStorage
        try {
            const storedVerbose = localStorage.getItem('debug_verbose');
            this.verbose = storedVerbose === 'true';
        } catch (e) {
            // Ignore storage errors
        }

        // Startup log
        console.log('%c🎵 Playlist Data Engine Showcase', 'color: #0ea5e9; font-size: 16px; font-weight: bold');
        console.log('%cConsole logging enabled per Constitution v1.1.0 Principle 3', 'color: #6b7280; font-style: italic');
    }

    public setVerbose(enabled: boolean) {
        this.verbose = enabled;
        localStorage.setItem('debug_verbose', String(enabled));
    }

    private formatMessage(category: LogCategory, message: string): string {
        const timestamp = new Date().toLocaleTimeString();
        return `[${timestamp}] [${category}] ${message}`;
    }

    public info(category: LogCategory, message: string, data?: any) {
        if (!this.isEnabled) return;

        console.group(`%c${this.formatMessage(category, message)}`, 'color: #0ea5e9; font-weight: bold');
        if (data !== undefined) {
            console.log('Data:', data);
        }
        console.groupEnd();
    }

    public warn(category: LogCategory, message: string, data?: any) {
        if (!this.isEnabled) return;

        console.group(`%c${this.formatMessage(category, message)}`, 'color: #f59e0b; font-weight: bold');
        if (data !== undefined) {
            console.warn('Data:', data);
        }
        console.groupEnd();
    }

    public error(category: LogCategory, message: string, error?: any) {
        if (!this.isEnabled) return;

        console.group(`%c${this.formatMessage(category, message)}`, 'color: #ef4444; font-weight: bold');
        if (error) {
            console.error(error);
        }
        console.groupEnd();
    }

    public debug(category: LogCategory, message: string, data?: any) {
        if (!this.isEnabled || !this.verbose) return;

        console.group(`%c${this.formatMessage(category, message)}`, 'color: #6b7280');
        if (data !== undefined) {
            console.debug('Data:', data);
        }
        console.groupEnd();
    }

    public table(category: LogCategory, message: string, data: any[]) {
        if (!this.isEnabled) return;

        console.group(`%c${this.formatMessage(category, message)}`, 'color: #0ea5e9; font-weight: bold');
        console.table(data);
        console.groupEnd();
    }
}

export const logger = new Logger();
