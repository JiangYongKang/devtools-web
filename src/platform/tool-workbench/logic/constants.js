const SESSION_STORAGE_PREFIX = 'tool-workbench-v1'

const SESSION_STORAGE_KEYS = {
  LAYOUT_TOPOLOGY: `${SESSION_STORAGE_PREFIX}:layout-topology`,
  SIDEBAR_VISIBLE: `${SESSION_STORAGE_PREFIX}:sidebar-visible`,
  OUTPUT_FORMAT: `${SESSION_STORAGE_PREFIX}:output-format`,
  TREE_COLLAPSE_STATE: `${SESSION_STORAGE_PREFIX}:tree-collapse-state`,
}

const LAYOUT_TOPOLOGIES = {
  SIDE_BY_SIDE: 'side-by-side',
  STACKED: 'stacked',
}

const OUTPUT_FORMATS = {
  PLAIN_TEXT: 'plain-text',
  JSON: 'json',
}

const DEBOUNCE_DELAY_MS = {
  SMALL: 150,
  MEDIUM: 300,
  LARGE: 500,
  DEFAULT: 300,
}

const RESPONSIVE_BREAKPOINTS = {
  NARROW: 640,
  MEDIUM: 1024,
  WIDE: 1280,
}

const RESPONSIVE_CLASS_NAMES = {
  NARROW: 'wb-bp-narrow',
  MEDIUM: 'wb-bp-medium',
  WIDE: 'wb-bp-wide',
}

const DEFAULT_PARTITION_MIN_HEIGHTS = {
  input: 120,
  output: 120,
  sidebar: 80,
  meta: 60,
}

const DEFAULT_PARTITION_RATIOS = {
  input: 0.45,
  output: 0.45,
  sidebar: 0.2,
  meta: 0.1,
}

const OUTPUT_THRESHOLDS = {
  WARN_SIZE_BYTES: 1024 * 1024,
  MAX_DISPLAY_SIZE_BYTES: 5 * 1024 * 1024,
}

const EXAMPLE_SIZES = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
}

const PARTITION_NAMES = {
  INPUT: 'input',
  OUTPUT: 'output',
  ACTIONS: 'actions',
  META: 'meta',
  SIDEBAR: 'sidebar',
}

const DISPLAY_STATES = {
  EMPTY: 'empty',
  LOADING: 'loading',
  READY: 'ready',
  ERROR: 'error',
  READ_ONLY: 'read-only',
}

const MARKDOWN_ALLOWED_TAGS = [
  'p', 'br',
  'strong', 'b',
  'em', 'i',
  'code',
  'pre',
  'ul', 'ol', 'li',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]

const MARKDOWN_XSS_POLICY = {
  stripScripts: true,
  stripEventHandlers: true,
  allowedTags: MARKDOWN_ALLOWED_TAGS,
}

const STREAMING_CHUNK_DEFAULTS = {
  MAX_CHUNK_SIZE: 8192,
  VIRTUAL_SCROLL_PAGE_SIZE: 50,
}

export {
  SESSION_STORAGE_PREFIX,
  SESSION_STORAGE_KEYS,
  LAYOUT_TOPOLOGIES,
  OUTPUT_FORMATS,
  DEBOUNCE_DELAY_MS,
  RESPONSIVE_BREAKPOINTS,
  RESPONSIVE_CLASS_NAMES,
  DEFAULT_PARTITION_MIN_HEIGHTS,
  DEFAULT_PARTITION_RATIOS,
  OUTPUT_THRESHOLDS,
  EXAMPLE_SIZES,
  PARTITION_NAMES,
  DISPLAY_STATES,
  MARKDOWN_ALLOWED_TAGS,
  MARKDOWN_XSS_POLICY,
  STREAMING_CHUNK_DEFAULTS,
}
