const ERROR_CODES = {
  INVALID_INPUT: 'INVALID_INPUT',
  CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
  PARSING_FAILED: 'PARSING_FAILED',
  SANITIZATION_ERROR: 'SANITIZATION_ERROR',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.INVALID_INPUT]: 'HTML 输入无效',
  [ERROR_CODES.CONTENT_TOO_LARGE]: 'HTML 内容超过大小限制',
  [ERROR_CODES.PARSING_FAILED]: 'HTML 解析失败',
  [ERROR_CODES.SANITIZATION_ERROR]: 'HTML 消毒过程中发生错误',
}

const DEFAULT_MAX_HTML_SIZE_BYTES = 1024 * 1024

const DEFAULT_WHITELIST = {
  tags: [
    'a', 'abbr', 'acronym', 'address', 'area', 'article', 'aside',
    'b', 'bdi', 'bdo', 'big', 'blockquote', 'br',
    'caption', 'center', 'cite', 'code', 'col', 'colgroup',
    'data', 'dd', 'del', 'details', 'dfn', 'div', 'dl', 'dt',
    'em',
    'figcaption', 'figure', 'footer',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr',
    'i', 'img', 'ins',
    'kbd',
    'li',
    'main', 'mark', 'menu',
    'nav',
    'ol',
    'p', 'picture', 'pre',
    'q',
    'rp', 'rt', 'ruby',
    's', 'samp', 'section', 'small', 'source', 'span', 'strike', 'strong', 'sub', 'summary', 'sup',
    'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'time', 'tr', 'track', 'tt',
    'u', 'ul',
    'var',
    'wbr',
  ],
  attributes: {
    '*': ['title', 'lang', 'dir', 'class', 'id'],
    'a': ['href', 'target', 'rel'],
    'img': ['src', 'alt', 'width', 'height', 'title'],
    'td': ['colspan', 'rowspan', 'align', 'valign'],
    'th': ['colspan', 'rowspan', 'align', 'valign'],
    'col': ['span', 'width'],
    'colgroup': ['span'],
    'table': ['border', 'cellpadding', 'cellspacing', 'width'],
    'source': ['srcset', 'media', 'type'],
    'picture': [],
    'time': ['datetime'],
    'data': ['value'],
  },
  protocols: {
    'a': ['http', 'https', 'mailto'],
    'img': ['http', 'https', 'data'],
  },
}

const TAGS_TO_ALWAYS_REMOVE = ['script', 'style', 'iframe', 'frame', 'frameset', 'template', 'form']

const MAX_DATA_URL_LENGTH = 1024 * 1024

const ALLOWED_DATA_URL_MIME_TYPES = ['image/png']

const UNKNOWN_TAG_POLICIES = {
  REMOVE: 'remove',
  UNWRAP: 'unwrap',
}

const SANITIZATION_MODES = {
  PLAIN_TEXT: 'plain_text',
  WHITELIST: 'whitelist',
}

const OWASP_SAMPLES = {
  basicXss: `<script>alert('XSS')</script>`,
  svgOnload: `<svg onload=alert('XSS')>`,
  javascriptProtocol: `<a href="javascript:alert('XSS')">Click me</a>`,
  dataTextHtml: `<iframe src="data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="></iframe>`,
  eventHandler: `<img src="x" onerror="alert('XSS')">`,
  styleAttribute: `<div style="background:url(javascript:alert('XSS'))">Test</div>`,
  mixedCase: `<SCRIPT>alert('XSS')</SCRIPT>`,
  hexEncoded: `<a href="&#106;&#97;&#118;&#97;&#115;&#99;&#114;&#105;&#112;&#116;:alert('XSS')">Click</a>`,
}

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  DEFAULT_MAX_HTML_SIZE_BYTES,
  DEFAULT_WHITELIST,
  TAGS_TO_ALWAYS_REMOVE,
  MAX_DATA_URL_LENGTH,
  ALLOWED_DATA_URL_MIME_TYPES,
  UNKNOWN_TAG_POLICIES,
  SANITIZATION_MODES,
  OWASP_SAMPLES,
}
