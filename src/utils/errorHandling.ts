import { logger } from './logger';

/**
 * Error Handling Utility
 * 
 * Provides centralized error handling and logging.
 */

export class AppError extends Error {
    public category: string;
    public originalError?: any;
    public isFatal: boolean;

    constructor(message: string, category: string, originalError?: any, isFatal = false) {
        super(message);
        this.name = 'AppError';
        this.category = category;
        this.originalError = originalError;
        this.isFatal = isFatal;
    }
}

export const handleError = (error: any, category: string = 'System', isFatal = false) => {
    const appError = error instanceof AppError
        ? error
        : new AppError(error.message || 'Unknown error', category, error, isFatal);

    logger.error(category as any, appError.message, {
        stack: appError.stack,
        original: appError.originalError,
        isFatal: appError.isFatal
    });

    if (isFatal) {
        // In a real app, might trigger a crash screen or reload
        console.error('FATAL ERROR:', appError);
        alert(`Critical Error: ${appError.message}. Check console for details.`);
    }

    return appError;
};

export const tryCatch = async <T>(
    fn: () => Promise<T>,
    category: string,
    fallback?: T
): Promise<T | undefined> => {
    try {
        return await fn();
    } catch (error) {
        handleError(error, category);
        return fallback;
    }
};
