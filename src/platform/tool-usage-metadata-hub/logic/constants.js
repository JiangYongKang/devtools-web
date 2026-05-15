export const KEY_NAMESPACE = 'devtools:tool-usage:';

export const STORAGE_VERSIONS = {
    V1: '1.0.0',
    V2: '2.0.0',
    LATEST: '2.0.0',
};

export const STORAGE_TYPE = {
    LOCAL: 'localStorage',
    SESSION: 'sessionStorage',
    MEMORY: 'memory',
    NONE: 'none',
};

export const MERGE_STRATEGIES = {
    KEEP_LATEST: 'keepLatest',
    UNION_TAGS: 'unionTags',
};

export const ERROR_CODES = {
    STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    SERIALIZATION_ERROR: 'SERIALIZATION_ERROR',
    DESERIALIZATION_ERROR: 'DESERIALIZATION_ERROR',
    MIGRATION_ERROR: 'MIGRATION_ERROR',
    MIGRATION_VERSION_TOO_HIGH: 'MIGRATION_VERSION_TOO_HIGH',
    IMPORT_CORRUPTED: 'IMPORT_CORRUPTED',
    IMPORT_INVALID_CHECKSUM: 'IMPORT_INVALID_CHECKSUM',
    IMPORT_VERSION_MISMATCH: 'IMPORT_VERSION_MISMATCH',
    IMPORT_XSS_DETECTED: 'IMPORT_XSS_DETECTED',
    LRU_EVICTION_FAILED: 'LRU_EVICTION_FAILED',
    PRIVACY_MODE: 'PRIVACY_MODE',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
    SENSITIVE_SLUG: 'SENSITIVE_SLUG',
    INVALID_SLUG: 'INVALID_SLUG',
};

export const ERROR_MESSAGES = {
    [ERROR_CODES.STORAGE_UNAVAILABLE]: '存储不可用，已降级到内存存储',
    [ERROR_CODES.QUOTA_EXCEEDED]: '存储空间配额已满，已执行 LRU 裁剪',
    [ERROR_CODES.SERIALIZATION_ERROR]: '序列化失败',
    [ERROR_CODES.DESERIALIZATION_ERROR]: '反序列化失败，数据已损坏，已降级为空集合',
    [ERROR_CODES.MIGRATION_ERROR]: '数据迁移失败',
    [ERROR_CODES.MIGRATION_VERSION_TOO_HIGH]: '数据版本高于当前支持版本',
    [ERROR_CODES.IMPORT_CORRUPTED]: '导入的数据包已损坏',
    [ERROR_CODES.IMPORT_INVALID_CHECKSUM]: '导入的数据包校验和无效',
    [ERROR_CODES.IMPORT_VERSION_MISMATCH]: '导入的数据包版本不兼容',
    [ERROR_CODES.IMPORT_XSS_DETECTED]: '检测到潜在的 XSS 注入内容',
    [ERROR_CODES.LRU_EVICTION_FAILED]: 'LRU 键驱逐策略执行失败',
    [ERROR_CODES.PRIVACY_MODE]: '隐私模式或第三方 Cookie 隔离导致存储不可用',
    [ERROR_CODES.UNKNOWN_ERROR]: '未知错误',
    [ERROR_CODES.SENSITIVE_SLUG]: '检测到敏感 slug，拒绝记录明文令牌',
    [ERROR_CODES.INVALID_SLUG]: '无效的 slug 格式',
};

export const SENSITIVE_PATTERNS = [
    /api[_-]?key/i,
    /secret/i,
    /password/i,
    /token/i,
    /auth/i,
    /credential/i,
    /private[_-]?key/i,
    /access[_-]?token/i,
    /refresh[_-]?token/i,
    /bearer/i,
];

export const DEFAULT_DEBOUNCE_MS = 500;

export const MAX_RECENT_TOOLS = 100;

export const DEFAULT_CHECK_ALGORITHM = 'simple';

export const STORAGE_KEYS = {
    RECENT_TOOLS: 'recent',
    FAVORITES: 'favorites',
    TAGS: 'tags',
    SETTINGS: 'settings',
};

export const TOOL_ALIASES = {
    'http-client': ['HTTP 客户端', '请求发送', '接口测试'],
    'json-formatter': ['JSON 格式化', 'JSON 校验', 'JSON 编辑器'],
    'base64': ['Base64 编码', 'Base64 解码', 'Base64 转换器'],
    'uuid-generator': ['UUID 生成', '唯一 ID', 'GUID 生成'],
    'hash-generator': ['哈希计算', 'MD5', 'SHA1', 'SHA256'],
    'url-parser': ['URL 解析', 'URL 编码', '查询参数'],
    'color-picker': ['颜色选择', '颜色转换', '调色板'],
    'regex-tester': ['正则测试', '正则表达式', 'Regex 调试'],
    'timestamp': ['时间戳转换', 'Unix 时间', '日期转换'],
    'markdown': ['Markdown 预览', 'Markdown 编辑', 'MD 渲染'],
    'jwt-decoder': ['JWT 解码', 'JWT 验证', 'Token 解析'],
    'csv-parser': ['CSV 解析', 'CSV 转换', '表格工具'],
    'image-optimizer': ['图片压缩', '图片优化', '图片转换'],
    'qr-generator': ['QR 码生成', '二维码', 'QR Code'],
    'diff-checker': ['差异对比', '文本对比', 'Diff 工具'],
    'yaml-json': ['YAML JSON 转换', 'YAML 解析'],
    'html-entities': ['HTML 实体', '实体编码', 'XSS 转义'],
    'number-base': ['进制转换', '二进制', '十六进制'],
    'lorem-ipsum': ['占位文本', '假数据', 'Lorem 生成'],
    'password-gen': ['密码生成', '强密码', '随机密码'],
};
