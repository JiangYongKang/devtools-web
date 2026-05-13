export const STORAGE_KEY_DRAFTS = 'error_recovery_drafts'

export const FINGERPRINT_WINDOW_MS = 60000

export const MAX_REPORTS_PER_WINDOW = 10

export const DEBOUNCE_WINDOW_MS = 500

export const HANDLED_MARKER = '__er_handled'

export const SOURCE_PATH_PRODUCTION_PATTERNS = [
    /\/node_modules\//,
    /\/\.vite\//,
    /\/\.webpack\//,
    /\.min\.js($|:)/,
]

export const ERROR_SOURCES = {
    BOUNDARY: 'boundary',
    GLOBAL_ERROR: 'global.error',
    GLOBAL_UNHANDLED_REJECTION: 'global.unhandledrejection',
}

export const ENVIRONMENTS = {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
}
