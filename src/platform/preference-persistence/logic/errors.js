import { ERROR_CODES, ERROR_MESSAGES } from './constants.js';

export function getErrorMessage(code) {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR];
}

export function createError(code, details = {}) {
    return {
        success: false,
        errorCode: code,
        errorMessage: getErrorMessage(code),
        details,
    };
}

export function createSuccess(data = {}) {
    return {
        success: true,
        ...data,
    };
}

export function isQuotaExceededError(error) {
    if (!error) return false;
    if (error.code === 22 || error.code === 1014) return true;
    if (error.name === 'QuotaExceededError') return true;
    if (error.message && error.message.includes('quota')) return true;
    return false;
}

export function isPrivacyModeError(error) {
    if (!error) return false;
    if (error.name === 'SecurityError') return true;
    if (error.message && error.message.includes('security')) return true;
    return false;
}
