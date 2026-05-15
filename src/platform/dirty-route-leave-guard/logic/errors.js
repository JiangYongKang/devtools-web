const ERROR_CODES = {
    INVALID_INITIAL_STATE: 'DIRTY_001',
    INVALID_IGNORE_PATH: 'DIRTY_002',
    HASH_FUNCTION_ERROR: 'DIRTY_003',
    ROUTER_NOT_INITIALIZED: 'DIRTY_004',
    LEASE_ACQUIRE_FAILED: 'DIRTY_005',
}

const ERROR_MESSAGES = {
    [ERROR_CODES.INVALID_INITIAL_STATE]: '初始状态无效',
    [ERROR_CODES.INVALID_IGNORE_PATH]: '忽略路径格式无效',
    [ERROR_CODES.HASH_FUNCTION_ERROR]: '哈希函数执行出错',
    [ERROR_CODES.ROUTER_NOT_INITIALIZED]: '路由器未初始化',
    [ERROR_CODES.LEASE_ACQUIRE_FAILED]: '无法获取编辑租约，可能其他标签页正在编辑',
}

function createError(code, details = null) {
    const message = ERROR_MESSAGES[code] || '未知错误'
    const error = new Error(details ? `${message}: ${details}` : message)
    error.code = code
    error.details = details
    return error
}

export { ERROR_CODES, ERROR_MESSAGES, createError }
