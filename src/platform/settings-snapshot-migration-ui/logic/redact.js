import { SENSITIVE_KEY_PATTERNS } from './constants.js';

/**
 * 判断键名是否为敏感键
 * @param {string} key - 待检测的键名
 * @returns {boolean} 是敏感键返回 true
 */
export function isSensitiveKey(key) {
    return SENSITIVE_KEY_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * 递归查找对象中所有敏感字段的路径
 * @param {Object} obj - 待查找的对象
 * @param {string} path - 当前路径，用于递归调用
 * @param {Array} result - 结果数组，用于递归调用
 * @returns {Array} 敏感字段数组，每项包含 path、key、value
 */
export function findSensitivePaths(obj, path = '', result = []) {
    if (!obj || typeof obj !== 'object') {
        return result;
    }

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (isSensitiveKey(key)) {
            result.push({
                path: currentPath,
                key,
                value: typeof value === 'string' ? '*'.repeat(8) : value,
            });
        }

        if (value && typeof value === 'object' && !Array.isArray(value)) {
            findSensitivePaths(value, currentPath, result);
        }
    }

    return result;
}

/**
 * 脱敏数据中的敏感字段
 * @param {Object} obj - 待脱敏的对象
 * @param {Array} selectedPaths - 需要脱敏的键名数组，为空则脱敏所有敏感键
 * @returns {Object} 脱敏后的对象
 */
export function redactSensitiveData(obj, selectedPaths = []) {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => redactSensitiveData(item, selectedPaths));
    }

    const result = {};

    for (const [key, value] of Object.entries(obj)) {
        const isSensitive = isSensitiveKey(key);
        const isSelected = selectedPaths.length === 0 || selectedPaths.includes(key);

        if (isSensitive && isSelected && typeof value === 'string') {
            result[key] = '********';
        } else if (value && typeof value === 'object') {
            result[key] = redactSensitiveData(value, selectedPaths);
        } else {
            result[key] = value;
        }
    }

    return result;
}

/**
 * 生成示例数据，用于展示导出功能
 * @returns {Object} 示例设置对象
 */
export function generateSampleData() {
    return {
        theme: {
            mode: 'dark',
            accentColor: '#0078d4',
        },
        layout: {
            sidebar: {
                collapsed: false,
                width: 280,
            },
            panels: {
                left: 'explorer',
                right: 'properties',
            },
        },
        apiKeys: {
            openai: 'sk-1234567890abcdefghijklmnopqrst',
            google: 'AIzaSyAbCDefGhIjKlMnOpQrStUvWxYz1234567890',
        },
        auth: {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            refreshToken: 'refresh_abcdefghijklmnopqrstuvwxyz',
        },
        tools: {
            enabled: ['explorer', 'search', 'terminal'],
            preferences: {
                fontSize: 14,
                lineNumbers: true,
            },
        },
        workspace: {
            lastOpened: '/path/to/project',
            recentProjects: [
                '/path/to/project1',
                '/path/to/project2',
            ],
        },
    };
}

/**
 * 生成被篡改的示例数据，用于展示校验失败
 * @returns {Object} 被篡改的示例设置对象
 */
export function generateCorruptedSample() {
    const sample = generateSampleData();
    sample.theme.mode = 'invalid-mode';
    sample.apiKeys.openai = 'corrupted-key';
    return sample;
}
