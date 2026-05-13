import { MERGE_STRATEGIES, ERROR_CODES } from './constants.js';
import { createError, createSuccess } from './errors.js';

export function isPlainObject(value) {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    return Object.prototype.toString.call(value) === '[object Object]';
}

export function shallowMerge(target, source) {
    return { ...target, ...source };
}

export function deepMerge(target, source) {
    if (!isPlainObject(source)) {
        return source;
    }
    
    if (!isPlainObject(target)) {
        return JSON.parse(JSON.stringify(source));
    }
    
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
        const sourceValue = source[key];
        const targetValue = result[key];
        
        if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        } else {
            result[key] = JSON.parse(JSON.stringify(sourceValue));
        }
    }
    
    return result;
}

export function mergeWithStrategy(target, source, strategy = MERGE_STRATEGIES.SHALLOW) {
    try {
        let result;
        
        switch (strategy) {
            case MERGE_STRATEGIES.DEEP:
                result = deepMerge(target, source);
                break;
            case MERGE_STRATEGIES.SHALLOW:
            default:
                result = shallowMerge(target, source);
                break;
        }
        
        return createSuccess({ data: result, strategy });
    } catch (error) {
        return createError(ERROR_CODES.MERGE_ERROR, {
            message: error.message,
            strategy,
        });
    }
}
