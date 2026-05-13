export const DOMAINS = {
  SHELL: 'shell',
  TOOL: 'tool',
  CODE: 'code',
}

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
}

export const STORAGE_KEY = 'theme-system-preference'

export const TOKEN_CATEGORIES = {
  BACKGROUND: 'background',
  SURFACE: 'surface',
  BORDER: 'border',
  SEMANTIC: 'semantic',
  SPACING: 'spacing',
  RADIUS: 'radius',
  TYPOGRAPHY: 'typography',
  SHADOW: 'shadow',
  MOTION: 'motion',
  Z_INDEX: 'zIndex',
}

export const SEMANTIC_COLOR_TYPES = {
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  INFO: 'info',
  ACCENT: 'accent',
}

export const ERROR_CODES = {
  INVALID_COLOR: 'INVALID_COLOR',
  INVALID_RADIUS: 'INVALID_RADIUS',
  INVALID_THEME: 'INVALID_THEME',
  SCHEMA_VALIDATION_FAILED: 'SCHEMA_VALIDATION_FAILED',
  UNKNOWN_VERSION: 'UNKNOWN_VERSION',
  INVALID_DOMAIN: 'INVALID_DOMAIN',
}

export const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_COLOR]: '无效的颜色值',
  [ERROR_CODES.INVALID_RADIUS]: '无效的圆角值',
  [ERROR_CODES.INVALID_THEME]: '无效的主题模式',
  [ERROR_CODES.SCHEMA_VALIDATION_FAILED]: '主题 JSON 校验失败',
  [ERROR_CODES.UNKNOWN_VERSION]: '未知的主题版本',
  [ERROR_CODES.INVALID_DOMAIN]: '无效的域',
}

export const CURRENT_THEME_SCHEMA_VERSION = '1.0.0'

export const SUPPORTED_SCHEMA_VERSIONS = ['1.0.0']

export const HUE_STEPS = 12

export const LUMINANCE_STEPS = 5

export const DEFAULT_PRIMARY_HUE = 260

export const DEFAULT_PRIMARY_SATURATION = 65

export const DEFAULT_RADIUS = 8
