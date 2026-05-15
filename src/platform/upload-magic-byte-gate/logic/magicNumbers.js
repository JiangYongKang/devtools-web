import { MAX_HEADER_BYTES } from './constants.js'

const BUILTIN_MAGIC_RULES = [
  {
    id: 'png',
    signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    offset: 0,
    mime: 'image/png',
    description: 'PNG 图片',
    category: 'image',
  },
  {
    id: 'jpeg',
    signature: [0xFF, 0xD8, 0xFF],
    offset: 0,
    mime: 'image/jpeg',
    description: 'JPEG 图片',
    category: 'image',
  },
  {
    id: 'gif87a',
    signature: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
    offset: 0,
    mime: 'image/gif',
    description: 'GIF 87a 图片',
    category: 'image',
  },
  {
    id: 'gif89a',
    signature: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    offset: 0,
    mime: 'image/gif',
    description: 'GIF 89a 图片',
    category: 'image',
  },
  {
    id: 'webp',
    signature: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
    trailingCheck: {
      offset: 8,
      signature: [0x57, 0x45, 0x42, 0x50],
    },
    mime: 'image/webp',
    description: 'WebP 图片',
    category: 'image',
  },
  {
    id: 'zip-local',
    signature: [0x50, 0x4B, 0x03, 0x04],
    offset: 0,
    mime: 'application/zip',
    description: 'ZIP 压缩包',
    category: 'archive',
    isContainer: true,
  },
  {
    id: 'zip-empty',
    signature: [0x50, 0x4B, 0x05, 0x06],
    offset: 0,
    mime: 'application/zip',
    description: 'ZIP 空压缩包',
    category: 'archive',
    isContainer: true,
  },
  {
    id: 'zip-spanned',
    signature: [0x50, 0x4B, 0x07, 0x08],
    offset: 0,
    mime: 'application/zip',
    description: 'ZIP 分卷压缩包',
    category: 'archive',
    isContainer: true,
  },
  {
    id: 'pdf',
    signature: [0x25, 0x50, 0x44, 0x46],
    offset: 0,
    mime: 'application/pdf',
    description: 'PDF 文档',
    category: 'document',
  },
  {
    id: 'wasm',
    signature: [0x00, 0x61, 0x73, 0x6D],
    offset: 0,
    mime: 'application/wasm',
    description: 'WebAssembly 模块',
    category: 'executable',
  },
  {
    id: 'elf',
    signature: [0x7F, 0x45, 0x4C, 0x46],
    offset: 0,
    mime: 'application/x-executable',
    description: 'ELF 可执行文件',
    category: 'executable',
  },
  {
    id: 'pe-executable',
    signature: [0x4D, 0x5A],
    offset: 0,
    mime: 'application/vnd.microsoft.portable-executable',
    description: 'Windows PE 可执行文件',
    category: 'executable',
  },
  {
    id: 'mach-o-32',
    signature: [0xFE, 0xED, 0xFA, 0xCE],
    offset: 0,
    mime: 'application/x-mach-binary',
    description: 'Mach-O 32位可执行文件',
    category: 'executable',
  },
  {
    id: 'mach-o-64',
    signature: [0xFE, 0xED, 0xFA, 0xCF],
    offset: 0,
    mime: 'application/x-mach-binary',
    description: 'Mach-O 64位可执行文件',
    category: 'executable',
  },
  {
    id: 'utf8-bom',
    signature: [0xEF, 0xBB, 0xBF],
    offset: 0,
    mime: 'text/plain',
    description: 'UTF-8 BOM 文本',
    category: 'text',
  },
  {
    id: 'utf16-le-bom',
    signature: [0xFF, 0xFE],
    offset: 0,
    mime: 'text/plain',
    description: 'UTF-16 LE BOM 文本',
    category: 'text',
  },
  {
    id: 'utf16-be-bom',
    signature: [0xFE, 0xFF],
    offset: 0,
    mime: 'text/plain',
    description: 'UTF-16 BE BOM 文本',
    category: 'text',
  },
  {
    id: 'xml-declaration',
    signature: [0x3C, 0x3F, 0x78, 0x6D, 0x6C],
    offset: 0,
    mime: 'application/xml',
    description: 'XML 文档',
    category: 'text',
  },
  {
    id: 'html-doctype',
    signature: [0x3C, 0x21, 0x44, 0x4F, 0x43, 0x54, 0x59, 0x50, 0x45],
    offset: 0,
    mime: 'text/html',
    description: 'HTML 文档',
    category: 'text',
  },
  {
    id: 'rar',
    signature: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07],
    offset: 0,
    mime: 'application/x-rar-compressed',
    description: 'RAR 压缩包',
    category: 'archive',
    isContainer: true,
  },
  {
    id: '7z',
    signature: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C],
    offset: 0,
    mime: 'application/x-7z-compressed',
    description: '7z 压缩包',
    category: 'archive',
    isContainer: true,
  },
  {
    id: 'gzip',
    signature: [0x1F, 0x8B],
    offset: 0,
    mime: 'application/gzip',
    description: 'GZIP 压缩包',
    category: 'archive',
    isContainer: true,
  },
  {
    id: 'bzip2',
    signature: [0x42, 0x5A, 0x68],
    offset: 0,
    mime: 'application/x-bzip2',
    description: 'BZIP2 压缩包',
    category: 'archive',
    isContainer: true,
  },
  {
    id: 'mp4',
    signature: [0x66, 0x74, 0x79, 0x70],
    offset: 4,
    mime: 'video/mp4',
    description: 'MP4 视频',
    category: 'video',
  },
  {
    id: 'mp3-id3v2',
    signature: [0x49, 0x44, 0x33],
    offset: 0,
    mime: 'audio/mpeg',
    description: 'MP3 音频',
    category: 'audio',
  },
  {
    id: 'ogg',
    signature: [0x4F, 0x67, 0x67, 0x53],
    offset: 0,
    mime: 'audio/ogg',
    description: 'OGG 音频',
    category: 'audio',
  },
]

let customRules = []
let ruleCache = null

function buildRuleCache() {
  const allRules = [...BUILTIN_MAGIC_RULES, ...customRules]
  ruleCache = allRules
  return ruleCache
}

function getRules() {
  if (!ruleCache) {
    buildRuleCache()
  }
  return ruleCache
}

function registerMagicRule(rule) {
  const requiredFields = ['id', 'signature', 'mime']
  const missingFields = requiredFields.filter((f) => !(f in rule))

  if (missingFields.length > 0) {
    throw new Error(`缺少必填字段: ${missingFields.join(', ')}`)
  }

  if (!Array.isArray(rule.signature) || rule.signature.length === 0) {
    throw new Error('signature 必须是非空字节数组')
  }

  const existingIds = new Set(getRules().map((r) => r.id))
  if (existingIds.has(rule.id)) {
    throw new Error(`规则 ID 已存在: ${rule.id}`)
  }

  const normalizedRule = {
    offset: 0,
    description: rule.mime,
    category: 'other',
    isContainer: false,
    ...rule,
  }

  customRules.push(normalizedRule)
  ruleCache = null

  return normalizedRule
}

function unregisterMagicRule(ruleId) {
  const index = customRules.findIndex((r) => r.id === ruleId)
  if (index === -1) {
    return false
  }
  customRules.splice(index, 1)
  ruleCache = null
  return true
}

function clearCustomRules() {
  customRules = []
  ruleCache = null
}

function matchesSignature(bytes, signature, offset = 0) {
  if (!bytes || bytes.length < signature.length + offset) {
    return false
  }
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) {
      return false
    }
  }
  return true
}

function matchesRule(bytes, rule) {
  const offset = rule.offset || 0

  if (!matchesSignature(bytes, rule.signature, offset)) {
    return false
  }

  if (rule.trailingCheck) {
    const trailingOffset = rule.trailingCheck.offset || 0
    if (!matchesSignature(bytes, rule.trailingCheck.signature, trailingOffset)) {
      return false
    }
  }

  return true
}

function detectMimeFromBytes(bytes, maxMatches = 5) {
  if (!bytes || bytes.length === 0) {
    return {
      matches: [],
      confidence: 0,
      primary: null,
    }
  }

  const rules = getRules()
  const matches = []

  for (const rule of rules) {
    if (matchesRule(bytes, rule)) {
      matches.push({
        id: rule.id,
        mime: rule.mime,
        description: rule.description,
        category: rule.category,
        isContainer: rule.isContainer || false,
        signature: Array.from(rule.signature),
        offset: rule.offset || 0,
      })

      if (matches.length >= maxMatches) {
        break
      }
    }
  }

  const primary = matches.length > 0 ? matches[0] : null
  const confidence = matches.length > 0 ? Math.min(100, 50 + matches.length * 10) : 0

  return {
    matches,
    confidence,
    primary,
  }
}

function isLikelyUtf8Text(bytes, sampleSize = 512) {
  if (!bytes || bytes.length === 0) {
    return false
  }

  const sample = bytes.slice(0, sampleSize)
  let i = 0

  while (i < sample.length) {
    const byte = sample[i]

    if (byte <= 0x7F) {
      i++
      continue
    }

    if ((byte & 0xE0) === 0xC0) {
      if (i + 1 >= sample.length || (sample[i + 1] & 0xC0) !== 0x80) {
        return false
      }
      i += 2
    } else if ((byte & 0xF0) === 0xE0) {
      if (i + 2 >= sample.length ||
          (sample[i + 1] & 0xC0) !== 0x80 ||
          (sample[i + 2] & 0xC0) !== 0x80) {
        return false
      }
      i += 3
    } else if ((byte & 0xF8) === 0xF0) {
      if (i + 3 >= sample.length ||
          (sample[i + 1] & 0xC0) !== 0x80 ||
          (sample[i + 2] & 0xC0) !== 0x80 ||
          (sample[i + 3] & 0xC0) !== 0x80) {
        return false
      }
      i += 4
    } else {
      return false
    }
  }

  return true
}

function bytesToHexString(bytes, maxLen = 64, groupSize = 4) {
  if (!bytes || bytes.length === 0) return ''
  const displayBytes = bytes.slice(0, maxLen)
  const hexParts = []
  for (let i = 0; i < displayBytes.length; i += groupSize) {
    const group = displayBytes.slice(i, i + groupSize)
    hexParts.push(
      Array.from(group)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ')
    )
  }
  return hexParts.join('  ')
}

function hexToAscii(bytes, maxLen = 64) {
  if (!bytes || bytes.length === 0) return ''
  const displayBytes = bytes.slice(0, maxLen)
  return Array.from(displayBytes)
    .map((b) => {
      if (b >= 32 && b <= 126) {
        return String.fromCharCode(b)
      }
      return '.'
    })
    .join('')
}

export {
  BUILTIN_MAGIC_RULES,
  registerMagicRule,
  unregisterMagicRule,
  clearCustomRules,
  matchesSignature,
  matchesRule,
  detectMimeFromBytes,
  isLikelyUtf8Text,
  bytesToHexString,
  hexToAscii,
}
