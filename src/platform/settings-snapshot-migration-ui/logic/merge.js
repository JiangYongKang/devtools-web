import { MERGE_STRATEGIES } from './constants.js';

/**
 * 浅合并两个对象，顶层属性直接覆盖
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的对象
 */
export function shallowMerge(target, source) {
    return { ...target, ...source };
}

/**
 * 深度合并两个对象，递归合并嵌套对象
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的对象
 */
export function deepMerge(target, source) {
    if (!target || typeof target !== 'object') return source;
    if (!source || typeof source !== 'object') return target;

    const result = Array.isArray(target) ? [...target] : { ...target };

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const targetValue = result[key];
            const sourceValue = source[key];

            if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
                result[key] = [...targetValue, ...sourceValue];
            } else if (
                targetValue &&
                sourceValue &&
                typeof targetValue === 'object' &&
                typeof sourceValue === 'object' &&
                !Array.isArray(targetValue) &&
                !Array.isArray(sourceValue)
            ) {
                result[key] = deepMerge(targetValue, sourceValue);
            } else {
                result[key] = sourceValue;
            }
        }
    }

    return result;
}

/**
 * 完全覆盖合并，直接返回源对象
 * @param {Object} target - 目标对象（被忽略）
 * @param {Object} source - 源对象
 * @returns {Object} 源对象
 */
export function overwriteMerge(target, source) {
    return source;
}

/**
 * 根据指定的策略合并两个对象
 * @param {Object} target - 目标对象（当前设置）
 * @param {Object} source - 源对象（导入的设置）
 * @param {string} strategy - 合并策略: MERGE 或 OVERWRITE
 * @returns {Object} 合并结果，包含 success 和 data 属性
 */
export function mergeWithStrategy(target, source, strategy) {
    let data;
    switch (strategy) {
        case MERGE_STRATEGIES.OVERWRITE:
            data = overwriteMerge(target, source);
            break;
        case MERGE_STRATEGIES.MERGE:
        default:
            data = deepMerge(target, source);
            break;
    }
    return {
        success: true,
        data,
    };
}
