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
