import { simpleChecksum } from './validators.js'

export const DEMO_LOCALES = {
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
  FICTITIOUS: 'xx',
}

const zhCNCommon = {
  greeting: '你好, {{name}}!',
  welcome: '欢迎来到 i18n 演示',
  home: '首页',
  settings: '设置',
  profile: '个人资料',
  items: {
    one: '你有 1 个项目',
    many: '你有 {{count}} 个项目',
  },
  today: '今天是 {{date}}',
  errors: {
    HTTP_404: '页面未找到',
    HTTP_404_detail: '请求的资源不存在 ({{httpStatus}})',
    HTTP_500: '服务器内部错误',
    HTTP_500_detail: '服务器遇到意外情况 ({{httpStatus}})',
    HTTP_502: '网关错误',
    HTTP_502_detail: '上游服务器响应异常 ({{httpStatus}})',
    UNKNOWN: '未知错误',
  },
  button: {
    save: '保存',
    cancel: '取消',
    load: '加载',
    reset: '重置',
  },
  labels: {
    username: '用户名',
    password: '密码',
    email: '邮箱',
    language: '语言',
  },
  deep: {
    nested: {
      key: '深层嵌套的键',
    },
  },
}

const enUSCommon = {
  greeting: 'Hello, {{name}}!',
  welcome: 'Welcome to i18n Demo',
  home: 'Home',
  settings: 'Settings',
  profile: 'Profile',
  items: {
    one: 'You have 1 item',
    many: 'You have {{count}} items',
  },
  today: 'Today is {{date}}',
  errors: {
    HTTP_404: 'Page Not Found',
    HTTP_404_detail: 'The requested resource does not exist ({{httpStatus}})',
    HTTP_500: 'Internal Server Error',
    HTTP_500_detail: 'The server encountered an unexpected condition ({{httpStatus}})',
    HTTP_502: 'Bad Gateway',
    HTTP_502_detail: 'The upstream server responded abnormally ({{httpStatus}})',
    UNKNOWN: 'Unknown Error',
  },
  button: {
    save: 'Save',
    cancel: 'Cancel',
    load: 'Load',
    reset: 'Reset',
  },
  labels: {
    username: 'Username',
    password: 'Password',
    email: 'Email',
    language: 'Language',
  },
  deep: {
    nested: {
      key: 'Deeply nested key',
    },
  },
}

export const DEMO_BUNDLES = {
  [DEMO_LOCALES.ZH_CN]: {
    common: zhCNCommon,
  },
  [DEMO_LOCALES.EN_US]: {
    common: enUSCommon,
  },
}

const missingKeysBundle = {
  greeting: 'Greeting with missing key below',
  home: 'Home',
}

const badInterpolationBundle = {
  greeting: 'Hello, {{name}!',
  broken: 'This has a {{unclosed and {{also}} another',
}

const extraPlaceholderBundle = {
  greeting: 'Hello, {{name}}',
  test: '{{extra}} and {{another}}',
}

const scriptBundle = {
  safe: 'This is safe',
  unsafe: '<script>alert(1)</script>',
}

const circularBundle = (() => {
  const obj = {
    a: 'value',
  }
  obj.self = obj
  return obj
})()

const versionConflictBundle = {
  __meta__: {
    version: '0.5.0',
  },
  greeting: 'Older version greeting',
}

const badChecksumBundle = {
  __meta__: {
    checksum: 'deadbeef',
  },
  greeting: 'Wrong checksum',
}

export const BAD_BUNDLES = {
  missingKeys: {
    description: '缺少键的包',
    data: missingKeysBundle,
  },
  badInterpolation: {
    description: '坏插值的包',
    data: badInterpolationBundle,
  },
  extraPlaceholder: {
    description: '多余占位符的包',
    data: extraPlaceholderBundle,
  },
  script: {
    description: '含 script 的包',
    data: scriptBundle,
  },
  circular: {
    description: '循环引用的包',
    data: circularBundle,
  },
  versionConflict: {
    description: '版本冲突的包',
    data: versionConflictBundle,
  },
  badChecksum: {
    description: '校验和错误的包',
    data: badChecksumBundle,
  },
}

export function createValidBundleWithChecksum(data, version = '1.0.0') {
  const payload = { ...data }
  const checksum = simpleChecksum(payload)
  return {
    ...payload,
    __meta__: {
      version,
      checksum,
    },
  }
}

export function getFictitiousLocaleBundle() {
  return {
    greeting: 'XX-{{name}}-XX',
    onlyInFallback: 'This should fall back',
  }
}

export function mockLocaleUrl(baseUrl = '/locales') {
  const routes = new Map()
  const add = new Map()
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  add.set(base + '/en-US/common.json', {
    status: 200,
    body: JSON.stringify(enUSCommon),
  })
  add.set(base + '/zh-CN/common.json', {
    status: 200,
    body: JSON.stringify(zhCNCommon),
  })
  return {
    getResponse: (url) => {
      const normalized = url.startsWith('/') ? url : '/' + url
      const key = base + normalized
      if (routes.has(key)) {
        return routes.get(key)
      }
      if (add.has(url)) {
        return add.get(url)
      }
      return { status: 404, body: null }
    },
    setResponse: (url, response) => {
      const key = url.startsWith(base) ? url : base + (url.startsWith('/') ? '' : '/') + url
      routes.set(key, response)
    },
    setError: (url, status = 500) => {
      routes.set(url, { status, body: null })
    },
    set304: (url) => {
      routes.set(url, { status: 304, body: null })
    },
    setEmpty: (url) => {
      routes.set(url, { status: 200, body: '' })
    },
  }
}
