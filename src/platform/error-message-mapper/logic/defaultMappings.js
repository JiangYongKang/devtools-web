import {
  DOMAINS,
  SEVERITY,
  ERROR_CODES,
  DEFAULT_RETRY_DELAY_SECONDS,
} from './constants.js'

function createDefaultMappingEntry({
  domain,
  httpStatus = null,
  businessCode = null,
  errorCode,
  userTitle = {},
  userDetail = {},
  recoveryHints = {},
  severity,
  retryable = false,
  suggestedRetryDelaySeconds = DEFAULT_RETRY_DELAY_SECONDS,
}) {
  return {
    match: { domain, httpStatus, businessCode },
    template: {
      errorCode,
      userTitle,
      userDetail,
      recoveryHints,
      severity,
      retryable,
      suggestedRetryDelaySeconds,
    },
  }
}

const DEFAULT_MAPPINGS = [
  createDefaultMappingEntry({
    domain: DOMAINS.HTTP,
    httpStatus: 400,
    errorCode: ERROR_CODES.HTTP_400,
    userTitle: {
      zh: '请求参数错误',
      en: 'Request Parameters Error',
    },
    userDetail: {
      zh: '服务器无法解析您的请求参数。请检查参数格式和值是否正确。',
      en: 'The server cannot parse your request parameters. Please check parameter format and values.',
    },
    recoveryHints: {
      zh: ['检查请求参数格式', '确认必填项已填写', '联系技术支持'],
      en: ['Check request parameter format', 'Ensure required fields are filled', 'Contact technical support'],
    },
    severity: SEVERITY.WARNING,
    retryable: false,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.HTTP,
    httpStatus: 401,
    errorCode: ERROR_CODES.HTTP_401,
    userTitle: {
      zh: '未授权访问',
      en: 'Unauthorized Access',
    },
    userDetail: {
      zh: '您尚未登录或登录凭证已过期。请重新登录。',
      en: 'You are not logged in or your session has expired. Please log in again.',
    },
    recoveryHints: {
      zh: ['刷新页面重新登录', '检查登录状态', '联系管理员'],
      en: ['Refresh page to log in again', 'Check login status', 'Contact administrator'],
    },
    severity: SEVERITY.WARNING,
    retryable: false,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.HTTP,
    httpStatus: 403,
    errorCode: ERROR_CODES.HTTP_403,
    userTitle: {
      zh: '权限不足',
      en: 'Insufficient Permissions',
    },
    userDetail: {
      zh: '您没有权限访问该资源。',
      en: 'You do not have permission to access this resource.',
    },
    recoveryHints: {
      zh: ['确认账号权限', '联系管理员申请权限'],
      en: ['Confirm account permissions', 'Contact administrator to request access'],
    },
    severity: SEVERITY.WARNING,
    retryable: false,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.HTTP,
    httpStatus: 404,
    errorCode: ERROR_CODES.HTTP_404,
    userTitle: {
      zh: '资源不存在',
      en: 'Resource Not Found',
    },
    userDetail: {
      zh: '请求的资源不存在或已被删除。',
      en: 'The requested resource does not exist or has been deleted.',
    },
    recoveryHints: {
      zh: ['检查 URL 是否正确', '确认资源是否存在'],
      en: ['Check if URL is correct', 'Confirm resource exists'],
    },
    severity: SEVERITY.WARNING,
    retryable: false,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.HTTP,
    httpStatus: 429,
    errorCode: ERROR_CODES.HTTP_429,
    userTitle: {
      zh: '请求过于频繁',
      en: 'Too Many Requests',
    },
    userDetail: {
      zh: '您的请求过于频繁，请稍后再试。',
      en: 'Your requests are too frequent. Please try again later.',
    },
    recoveryHints: {
      zh: ['等待几秒后重试', '减少请求频率'],
      en: ['Wait a few seconds and retry', 'Reduce request frequency'],
    },
    severity: SEVERITY.WARNING,
    retryable: true,
    suggestedRetryDelaySeconds: 5,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.HTTP,
    httpStatus: 500,
    errorCode: ERROR_CODES.HTTP_500,
    userTitle: {
      zh: '服务器错误',
      en: 'Server Error',
    },
    userDetail: {
      zh: '服务器内部发生错误，请稍后再试或联系技术支持。',
      en: 'An internal server error occurred. Please try again later or contact technical support.',
    },
    recoveryHints: {
      zh: ['稍后重试', '刷新页面', '联系技术支持'],
      en: ['Retry later', 'Refresh the page', 'Contact technical support'],
    },
    severity: SEVERITY.ERROR,
    retryable: true,
    suggestedRetryDelaySeconds: 3,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.HTTP,
    httpStatus: 503,
    errorCode: ERROR_CODES.HTTP_503,
    userTitle: {
      zh: '服务不可用',
      en: 'Service Unavailable',
    },
    userDetail: {
      zh: '服务暂时不可用，可能是维护中或负载过高。',
      en: 'The service is temporarily unavailable, possibly due to maintenance or high load.',
    },
    recoveryHints: {
      zh: ['稍后重试', '检查服务状态', '等待 Retry-After 头指定的时间'],
      en: ['Retry later', 'Check service status', 'Wait for Retry-After header specified time'],
    },
    severity: SEVERITY.ERROR,
    retryable: true,
    suggestedRetryDelaySeconds: 10,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.HTTP,
    businessCode: 'TIMEOUT',
    errorCode: ERROR_CODES.TIMEOUT_ERROR,
    userTitle: {
      zh: '请求超时',
      en: 'Request Timeout',
    },
    userDetail: {
      zh: '请求处理超时，请检查网络连接或稍后重试。',
      en: 'Request processing timed out. Please check your network connection or try again later.',
    },
    recoveryHints: {
      zh: ['检查网络连接', '稍后重试', '联系技术支持'],
      en: ['Check network connection', 'Retry later', 'Contact technical support'],
    },
    severity: SEVERITY.WARNING,
    retryable: true,
    suggestedRetryDelaySeconds: 2,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.WS,
    businessCode: 'CONNECTION_FAILED',
    errorCode: ERROR_CODES.WS_CONNECTION_FAILED,
    userTitle: {
      zh: 'WebSocket 连接失败',
      en: 'WebSocket Connection Failed',
    },
    userDetail: {
      zh: '无法建立 WebSocket 连接。',
      en: 'Failed to establish WebSocket connection.',
    },
    recoveryHints: {
      zh: ['检查网络连接', '确认 WebSocket 服务器状态', '重试连接'],
      en: ['Check network connection', 'Verify WebSocket server status', 'Retry connection'],
    },
    severity: SEVERITY.ERROR,
    retryable: true,
    suggestedRetryDelaySeconds: 5,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.CLIPBOARD,
    businessCode: 'PERMISSION_DENIED',
    errorCode: ERROR_CODES.CLIPBOARD_PERMISSION_DENIED,
    userTitle: {
      zh: '剪贴板权限被拒绝',
      en: 'Clipboard Permission Denied',
    },
    userDetail: {
      zh: '浏览器拒绝了剪贴板访问权限。',
      en: 'The browser denied clipboard access permission.',
    },
    recoveryHints: {
      zh: ['在浏览器设置中允许剪贴板访问', '使用 Ctrl+C/Ctrl+V 手动操作'],
      en: ['Allow clipboard access in browser settings', 'Use Ctrl+C/Ctrl+V manually'],
    },
    severity: SEVERITY.WARNING,
    retryable: false,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.STORAGE,
    businessCode: 'QUOTA_EXCEEDED',
    errorCode: ERROR_CODES.STORAGE_QUOTA_EXCEEDED,
    userTitle: {
      zh: '存储空间已满',
      en: 'Storage Quota Exceeded',
    },
    userDetail: {
      zh: '本地存储空间已满，请清理后重试。',
      en: 'Local storage space is full. Please clean up and try again.',
    },
    recoveryHints: {
      zh: ['清理浏览器缓存', '删除不需要的数据', '使用隐身模式'],
      en: ['Clear browser cache', 'Delete unnecessary data', 'Use incognito mode'],
    },
    severity: SEVERITY.WARNING,
    retryable: false,
  }),
  createDefaultMappingEntry({
    domain: DOMAINS.STORAGE,
    businessCode: 'DISABLED',
    errorCode: ERROR_CODES.STORAGE_DISABLED,
    userTitle: {
      zh: '存储功能已禁用',
      en: 'Storage Function Disabled',
    },
    userDetail: {
      zh: '浏览器存储功能已被禁用，无法保存数据。',
      en: 'Browser storage functionality has been disabled, cannot save data.',
    },
    recoveryHints: {
      zh: ['启用浏览器存储功能', '检查隐私设置'],
      en: ['Enable browser storage functionality', 'Check privacy settings'],
    },
    severity: SEVERITY.ERROR,
    retryable: false,
  }),
]

function getDefaultMappings() {
  return [...DEFAULT_MAPPINGS]
}

export {
  DEFAULT_MAPPINGS,
  getDefaultMappings,
  createDefaultMappingEntry,
}
