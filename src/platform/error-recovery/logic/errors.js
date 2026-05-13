export const ERROR_CODES = {
    RENDER_ERROR: 'RENDER_ERROR',
    ASYNC_EFFECT_ERROR: 'ASYNC_EFFECT_ERROR',
    EVENT_HANDLER_ERROR: 'EVENT_HANDLER_ERROR',
    PROMISE_REJECTION: 'PROMISE_REJECTION',
    DOM_EXCEPTION: 'DOM_EXCEPTION',
    NETWORK_ERROR: 'NETWORK_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
}

export const ERROR_MESSAGES = {
    [ERROR_CODES.RENDER_ERROR]: '组件渲染异常',
    [ERROR_CODES.ASYNC_EFFECT_ERROR]: '异步副作用异常',
    [ERROR_CODES.EVENT_HANDLER_ERROR]: '事件处理器异常',
    [ERROR_CODES.PROMISE_REJECTION]: 'Promise 拒绝未处理',
    [ERROR_CODES.DOM_EXCEPTION]: 'DOM 操作异常',
    [ERROR_CODES.NETWORK_ERROR]: '网络请求异常',
    [ERROR_CODES.UNKNOWN_ERROR]: '未知错误',
}

export function getErrorMessage(code) {
    return ERROR_MESSAGES[code] || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR]
}

export function createError(code, message) {
    return {
        errorCode: code,
        errorMessage: message || getErrorMessage(code),
    }
}
