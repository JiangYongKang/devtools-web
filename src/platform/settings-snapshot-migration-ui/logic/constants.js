export const SNAPSHOT_VERSIONS = {
    V1: '1.0.0',
    V2: '2.0.0',
    V3: '3.0.0',
    LATEST: '3.0.0',
};

export const MERGE_STRATEGIES = {
    MERGE: 'merge',
    OVERWRITE: 'overwrite',
};

export const ERROR_CODES = {
    INVALID_JSON: 'INVALID_JSON',
    INVALID_SCHEMA: 'INVALID_SCHEMA',
    VERSION_TOO_OLD: 'VERSION_TOO_OLD',
    VERSION_TOO_HIGH: 'VERSION_TOO_HIGH',
    VERSION_TOO_NEW: 'VERSION_TOO_HIGH',
    INVALID_CHECKSUM: 'INVALID_CHECKSUM',
    MIGRATION_FAILED: 'MIGRATION_FAILED',
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    MAX_DEPTH_EXCEEDED: 'MAX_DEPTH_EXCEEDED',
    MAX_KEYS_EXCEEDED: 'MAX_KEYS_EXCEEDED',
    COMPRESSION_FAILED: 'COMPRESSION_FAILED',
    DECOMPRESSION_FAILED: 'DECOMPRESSION_FAILED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

export const ERROR_MESSAGES = {
    [ERROR_CODES.INVALID_JSON]: 'JSON 格式无效',
    [ERROR_CODES.INVALID_SCHEMA]: '快照 Schema 不合法',
    [ERROR_CODES.VERSION_TOO_OLD]: '快照版本过旧，需要先升级应用',
    [ERROR_CODES.VERSION_TOO_NEW]: '快照版本过高，请升级应用到最新版本',
    [ERROR_CODES.INVALID_CHECKSUM]: '快照校验和无效，数据可能已损坏',
    [ERROR_CODES.MIGRATION_FAILED]: '数据迁移失败',
    [ERROR_CODES.VALIDATION_FAILED]: '数据校验失败',
    [ERROR_CODES.MAX_DEPTH_EXCEEDED]: '对象嵌套深度超出限制',
    [ERROR_CODES.MAX_KEYS_EXCEEDED]: '键值数量超出限制',
    [ERROR_CODES.COMPRESSION_FAILED]: 'gzip 压缩失败',
    [ERROR_CODES.DECOMPRESSION_FAILED]: 'gzip 解压失败',
    [ERROR_CODES.UNKNOWN_ERROR]: '未知错误',
};

export const VALIDATION_LIMITS = {
    MAX_DEPTH: 20,
    MAX_KEYS: 10000,
};

export const SENSITIVE_KEY_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /api[_-]?key/i,
    /private[_-]?key/i,
    /auth/i,
    /credential/i,
];

export const CHECKSUM_ALGORITHM = 'simple-hash';

export const BREAKING_CHANGES = {
    '1.0.0->2.0.0': [
        { field: 'theme', type: 'rename', old: 'themeMode', new: 'theme.mode' },
        { field: 'sidebar', type: 'structure', old: 'sidebarCollapsed', new: 'layout.sidebar.collapsed' },
        { field: 'tools', type: 'rename', old: 'toolStates', new: 'tools' },
    ],
    '2.0.0->3.0.0': [
        { field: 'user', type: 'remove', description: '用户偏好字段已移至独立存储' },
        { field: 'workspace', type: 'structure', old: 'workspaceData', new: 'workspace.settings' },
    ],
};
