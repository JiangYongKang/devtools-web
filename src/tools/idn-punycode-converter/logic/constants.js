const MAX_INPUT_LINES = 500
const MAX_DOMAIN_LENGTH = 253
const MAX_LABEL_LENGTH = 63
const THROTTLE_DELAY_MS = 150
const STORAGE_KEY = 'idn-punycode-converter:options'

const PUNYCODE_PREFIX = 'xn--'
const PUNYCODE_PREFIX_UPPER = 'XN--'

const OUTPUT_MODES = {
  AUTO: 'AUTO',
  TO_PUNYCODE: 'TO_PUNYCODE',
  TO_UNICODE: 'TO_UNICODE',
  VALIDATE_ONLY: 'VALIDATE_ONLY',
  DECODE_PUNYCODE_ONLY: 'DECODE_PUNYCODE_ONLY',
}

const OUTPUT_MODE_LABELS = {
  [OUTPUT_MODES.AUTO]: '自动检测',
  [OUTPUT_MODES.TO_PUNYCODE]: '编码为 Punycode',
  [OUTPUT_MODES.TO_UNICODE]: '解码为 Unicode',
  [OUTPUT_MODES.VALIDATE_ONLY]: '仅校验不转换',
  [OUTPUT_MODES.DECODE_PUNYCODE_ONLY]: '仅解码 Punycode',
}

const XN_CASE_OPTIONS = {
  LOWER: 'LOWER',
  UPPER: 'UPPER',
  PRESERVE: 'PRESERVE',
}

const XN_CASE_OPTION_LABELS = {
  [XN_CASE_OPTIONS.LOWER]: '小写 xn--',
  [XN_CASE_OPTIONS.UPPER]: '大写 XN--',
  [XN_CASE_OPTIONS.PRESERVE]: '保留输入',
}

const IDNA_MODES = {
  IDNA2008: 'IDNA2008',
  UTS46: 'UTS46',
  NONE: 'NONE',
}

const IDNA_MODE_LABELS = {
  [IDNA_MODES.IDNA2008]: '尝试 IDNA2008',
  [IDNA_MODES.UTS46]: '尝试 UTS46',
  [IDNA_MODES.NONE]: '不使用语义切片',
}

const EXAMPLE_DOMAINS = [
  {
    label: '中文域名',
    input: '例子.中国',
    description: '纯中文域名示例',
  },
  {
    label: '混合域名',
    input: 'münchen.de',
    description: '德语 Umlaut 示例',
  },
  {
    label: 'Punycode 解码',
    input: 'xn--fsqu00a.xn--fiqs8s',
    description: 'Punycode 编码的中文域名',
  },
  {
    label: '错误 Punycode',
    input: 'xn--invalid-123',
    description: '非法 Punycode 示例',
  },
  {
    label: '带协议前缀',
    input: 'https://例子.中国/path?query=1',
    description: 'URL 前缀自动剥离示例',
  },
  {
    label: '多脚本混合',
    input: 'paypal.com.cy',
    description: '潜在混合脚本警告示例',
  },
  {
    label: '批量示例',
    input: '例子.中国\nmünchen.de\nxn--fsqu00a.xn--fiqs8s',
    description: '多行批量转换示例',
  },
]

const MIXED_SCRIPT_RULES = [
  '标签内包含来自多个 Unicode 脚本的字符时警告',
  'ASCII 字母（Latin）与其他脚本混合时警告',
  '常见同形异义字符组合会被标记',
  '纯 ASCII 或纯单一脚本标签无警告',
]

const BIDI_CONTROL_CHARS = [
  0x200E,
  0x200F,
  0x202A,
  0x202B,
  0x202C,
  0x202D,
  0x202E,
  0x2066,
  0x2067,
  0x2068,
  0x2069,
]

const INVISIBLE_CHARS = [
  0x0000, 0x0001, 0x0002, 0x0003, 0x0004, 0x0005, 0x0006, 0x0007,
  0x0008, 0x0009, 0x000A, 0x000B, 0x000C, 0x000D, 0x000E, 0x000F,
  0x0010, 0x0011, 0x0012, 0x0013, 0x0014, 0x0015, 0x0016, 0x0017,
  0x0018, 0x0019, 0x001A, 0x001B, 0x001C, 0x001D, 0x001E, 0x001F,
  0x007F, 0x0080, 0x0081, 0x0082, 0x0083, 0x0084, 0x0085, 0x0086,
  0x0087, 0x0088, 0x0089, 0x008A, 0x008B, 0x008C, 0x008D, 0x008E,
  0x008F, 0x0090, 0x0091, 0x0092, 0x0093, 0x0094, 0x0095, 0x0096,
  0x0097, 0x0098, 0x0099, 0x009A, 0x009B, 0x009C, 0x009D, 0x009E,
  0x009F, 0x00AD, 0x034F, 0x061C, 0x115F, 0x1160, 0x17B4, 0x17B5,
  0x180B, 0x180C, 0x180D, 0x180E, 0x2000, 0x2001, 0x2002, 0x2003,
  0x2004, 0x2005, 0x2006, 0x2007, 0x2008, 0x2009, 0x200A, 0x200B,
  0x200C, 0x200D, 0x200E, 0x200F, 0x2028, 0x2029, 0x202A, 0x202B,
  0x202C, 0x202D, 0x202E, 0x202F, 0x205F, 0x2060, 0x2061, 0x2062,
  0x2063, 0x2064, 0x2066, 0x2067, 0x2068, 0x2069, 0x206A, 0x206B,
  0x206C, 0x206D, 0x206E, 0x206F, 0xFEFF, 0xFFA0, 0xFFF0, 0xFFF1,
  0xFFF2, 0xFFF3, 0xFFF4, 0xFFF5, 0xFFF6, 0xFFF7, 0xFFF8, 0xFFF9,
  0xFFFA, 0xFFFB, 0xFFFC, 0xFFFD, 0xFE00, 0xFE01, 0xFE02, 0xFE03,
  0xFE04, 0xFE05, 0xFE06, 0xFE07, 0xFE08, 0xFE09, 0xFE0A, 0xFE0B,
  0xFE0C, 0xFE0D, 0xFE0E, 0xFE0F, 0x1D173, 0x1D174, 0x1D175, 0x1D176,
  0x1D177, 0x1D178, 0x1D179, 0x1D17A, 0xE0000, 0xE0001, 0xE0002,
  0xE0003, 0xE0004, 0xE0005, 0xE0006, 0xE0007, 0xE0008, 0xE0009,
  0xE000A, 0xE000B, 0xE000C, 0xE000D, 0xE000E, 0xE000F, 0xE0010,
  0xE0011, 0xE0012, 0xE0013, 0xE0014, 0xE0015, 0xE0016, 0xE0017,
  0xE0018, 0xE0019, 0xE001A, 0xE001B, 0xE001C, 0xE001D, 0xE001E,
  0xE001F,
]

export {
  MAX_INPUT_LINES,
  MAX_DOMAIN_LENGTH,
  MAX_LABEL_LENGTH,
  THROTTLE_DELAY_MS,
  STORAGE_KEY,
  PUNYCODE_PREFIX,
  PUNYCODE_PREFIX_UPPER,
  OUTPUT_MODES,
  OUTPUT_MODE_LABELS,
  XN_CASE_OPTIONS,
  XN_CASE_OPTION_LABELS,
  IDNA_MODES,
  IDNA_MODE_LABELS,
  EXAMPLE_DOMAINS,
  MIXED_SCRIPT_RULES,
  BIDI_CONTROL_CHARS,
  INVISIBLE_CHARS,
}
