import {
  DOMAINS,
  SEVERITY,
  ERROR_CODES,
  ENVIRONMENTS,
  DEFAULT_RETRY_DELAY_SECONDS,
} from './constants.js'
import { createDefaultMappingEntry } from './defaultMappings.js'

const ENVIRONMENT_OVERRIDES = {
  [ENVIRONMENTS.DEVELOPMENT]: [
    createDefaultMappingEntry({
      domain: DOMAINS.HTTP,
      httpStatus: 500,
      errorCode: ERROR_CODES.HTTP_500,
      userTitle: {
        zh: '开发环境：服务器错误',
        en: 'DEV: Server Error',
      },
      userDetail: {
        zh: '开发环境：服务器内部发生错误。请查看控制台和后端日志。',
        en: 'DEV: An internal server error occurred. Check console and backend logs.',
      },
      recoveryHints: {
        zh: ['查看浏览器控制台', '检查后端日志', '稍后重试'],
        en: ['Check browser console', 'Inspect backend logs', 'Retry later'],
      },
      severity: SEVERITY.ERROR,
      retryable: true,
      suggestedRetryDelaySeconds: 2,
    }),
    createDefaultMappingEntry({
      domain: DOMAINS.HTTP,
      businessCode: 'DEV_DEBUG',
      errorCode: ERROR_CODES.UNKNOWN_BUSINESS,
      userTitle: {
        zh: '开发调试错误',
        en: 'Development Debug Error',
      },
      userDetail: {
        zh: '开发环境调试错误，仅在开发模式下可见。',
        en: 'Development debug error, only visible in dev mode.',
      },
      recoveryHints: {
        zh: ['检查调试信息', '联系开发团队'],
        en: ['Check debug information', 'Contact development team'],
      },
      severity: SEVERITY.DEBUG,
      retryable: false,
    }),
  ],
  [ENVIRONMENTS.STAGING]: [
    createDefaultMappingEntry({
      domain: DOMAINS.HTTP,
      httpStatus: 503,
      errorCode: ERROR_CODES.HTTP_503,
      userTitle: {
        zh: '预发环境：服务不可用',
        en: 'STAGING: Service Unavailable',
      },
      userDetail: {
        zh: '预发环境服务暂时不可用，可能正在进行部署。',
        en: 'Staging service is temporarily unavailable, possibly deploying.',
      },
      recoveryHints: {
        zh: ['等待部署完成', '联系运维团队', '检查部署状态'],
        en: ['Wait for deployment to complete', 'Contact ops team', 'Check deployment status'],
      },
      severity: SEVERITY.ERROR,
      retryable: true,
      suggestedRetryDelaySeconds: 15,
    }),
  ],
  [ENVIRONMENTS.PRODUCTION]: [
    createDefaultMappingEntry({
      domain: DOMAINS.HTTP,
      httpStatus: 500,
      errorCode: ERROR_CODES.HTTP_500,
      userTitle: {
        zh: '服务异常',
        en: 'Service Exception',
      },
      userDetail: {
        zh: '服务遇到异常，我们正在努力修复。请稍后再试或联系客服。',
        en: 'The service encountered an exception. We are working to fix it. Please try again later or contact support.',
      },
      recoveryHints: {
        zh: ['稍后重试', '刷新页面', '联系客服'],
        en: ['Retry later', 'Refresh the page', 'Contact customer support'],
      },
      severity: SEVERITY.ERROR,
      retryable: true,
      suggestedRetryDelaySeconds: 5,
    }),
    createDefaultMappingEntry({
      domain: DOMAINS.HTTP,
      httpStatus: 503,
      errorCode: ERROR_CODES.HTTP_503,
      userTitle: {
        zh: '服务维护中',
        en: 'Service Under Maintenance',
      },
      userDetail: {
        zh: '服务正在进行例行维护，预计很快恢复。',
        en: 'The service is under scheduled maintenance and should be back soon.',
      },
      recoveryHints: {
        zh: ['稍后重试', '查看服务公告', '订阅通知'],
        en: ['Retry later', 'Check service announcements', 'Subscribe to notifications'],
      },
      severity: SEVERITY.WARNING,
      retryable: true,
      suggestedRetryDelaySeconds: 30,
    }),
  ],
}

function getEnvironmentOverrides(env) {
  if (!env) return []
  return ENVIRONMENT_OVERRIDES[env] ? [...ENVIRONMENT_OVERRIDES[env]] : []
}

function getCurrentEnvironment() {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE) {
    return import.meta.env.MODE
  }
  if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV
  }
  return ENVIRONMENTS.PRODUCTION
}

export {
  ENVIRONMENT_OVERRIDES,
  getEnvironmentOverrides,
  getCurrentEnvironment,
}
