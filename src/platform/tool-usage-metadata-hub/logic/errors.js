import { ERROR_CODES, ERROR_MESSAGES } from './constants.js';

export function createSuccess(data = {}) {
    return {
        success: true,
        ...data,
    };
}

export function createError(errorCode, details = {}) {
    return {
        success: false,
        errorCode,
        errorMessage: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR],
        ...details,
    };
}

export function isQuotaExceededError(error) {
    if (!error) return false;
    const name = error.name || '';
    const message = error.message || '';
    return (
        name === 'QuotaExceededError' ||
        name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
        message.includes('Quota') ||
        message.includes('quota') ||
        message.includes('exceeded')
    );
}

export function isPrivacyModeError(error) {
    if (!error) return false;
    const name = error.name || '';
    const message = error.message || '';
    return (
        name === 'SecurityError' ||
        message.includes('SecurityError') ||
        message.includes('denied') ||
        message.includes('not allowed') ||
        message.includes('permission')
    );
}

export function wrapError(error, defaultErrorCode = ERROR_CODES.UNKNOWN_ERROR) {
    if (isQuotaExceededError(error)) {
        return createError(ERROR_CODES.QUOTA_EXCEEDED, { originalError: error.message });
    }
    if (isPrivacyModeError(error)) {
        return createError(ERROR_CODES.PRIVACY_MODE, { originalError: error.message });
    }
    return createError(defaultErrorCode, { originalError: error.message });
}
