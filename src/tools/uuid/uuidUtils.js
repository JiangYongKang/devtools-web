/**
 * UUID 工具函数集合
 *
 * 说明：
 * - 优先使用浏览器原生 crypto.randomUUID()（V4）
 * - 降级到 Math.random()（旧浏览器）
 * - 解析支持多种输入格式：标准、无分隔符、大小写、带大括号、URN 等
 */

/**
 * 生成随机 UUID（版本 4）
 *
 * 随机源说明：
 * - 优先：crypto.randomUUID() - 浏览器原生加密级随机数，符合密码学安全
 * - 降级：Math.random() - 非密码学安全，仅兼容旧浏览器
 *
 * @returns {string} UUID 字符串，标准格式：xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 */
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  /**
   * 降级方案：使用 Math.random() 生成 V4 UUID
   * 说明：Math.random() 非密码学安全，仅用于不支持 crypto.randomUUID() 的旧浏览器
   */
  const hex = []
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      hex[i] = '-'
    } else if (i === 14) {
      hex[i] = '4'
    } else if (i === 19) {
      hex[i] = ((Math.random() * 4) | 8).toString(16)
    } else {
      hex[i] = (Math.random() * 16 | 0).toString(16)
    }
  }
  return hex.join('')
}

/**
 * 生成 NIL UUID（全零 UUID）
 * 用于占位或特殊场景
 * @returns {string} 00000000-0000-0000-0000-000000000000
 */
function generateNILUUID() {
  return '00000000-0000-0000-0000-000000000000'
}

/**
 * 标准化 UUID 字符串
 *
 * 解析宽松度说明：
 * - 支持大小写混合
 * - 支持带/不带连字符
 * - 支持带/不带大括号
 * - 支持 URN 格式（urn:uuid:...）
 *
 * @param {string} input - 原始输入
 * @returns {string|null} 标准化后的 UUID（小写，标准格式），无效时返回 null
 */
function normalizeUUID(input) {
  if (!input || typeof input !== 'string') return null

  let clean = input.trim()

  /** 去除 URN 前缀 */
  if (clean.startsWith('urn:uuid:')) {
    clean = clean.slice(9)
  }

  /** 去除大括号 */
  if (clean.startsWith('{') && clean.endsWith('}')) {
    clean = clean.slice(1, -1)
  }

  /** 去除连字符 */
  clean = clean.replace(/-/g, '')
  clean = clean.toLowerCase()

  /** 长度与格式校验 */
  if (clean.length !== 32) return null
  if (!/^[0-9a-f]{32}$/.test(clean)) return null

  /** 重组为标准格式 */
  return [
    clean.slice(0, 8),
    clean.slice(8, 12),
    clean.slice(12, 16),
    clean.slice(16, 20),
    clean.slice(20, 32),
  ].join('-')
}

/**
 * 校验 UUID 是否有效
 * @param {string} input - 输入
 * @returns {boolean}
 */
function isValidUUID(input) {
  return normalizeUUID(input) !== null
}

/**
 * 解析 UUID 的详细信息
 *
 * 解析宽松度说明：
 * 支持多种输入格式（见 normalizeUUID）
 *
 * @param {string} input
 * @returns {object|null} 解析结果或 null（无效）
 */
function parseUUID(input) {
  const normalized = normalizeUUID(input)
  if (!normalized) return null

  const parts = normalized.split('-')
  const hex = normalized.replace(/-/g, '')

  /** 版本：第 13 个字符（索引 12） */
  const versionChar = hex[12]
  const version = parseInt(versionChar, 16)

  /** 变体：第 17 个字符（索引 16）的高 1-3 位 */
  const variantChar = hex[16]
  const variantNibble = parseInt(variantChar, 16)

  let variantName = 'reserved'
  if ((variantNibble & 0x8) === 0x8) {
    if ((variantNibble & 0xC) === 0x8) {
      variantName = 'RFC 4122'
    } else if ((variantNibble & 0xE) === 0xC) {
      variantName = 'Microsoft'
    } else {
      variantName = 'reserved'
    }
  } else if ((variantNibble & 0xC) === 0x0) {
    variantName = 'NCS'
  }

  return {
    normalized,
    version,
    variant: variantName,
    hex,
    timeLow: parts[0],
    timeMid: parts[1],
    timeHiAndVersion: parts[2],
    clockSeqHiAndReserved: parts[3],
    clockSeqLow: parts[4].slice(0, 2),
    node: parts[4].slice(2, 12),
  }
}

/**
 * 转换为多种格式
 * @param {string} uuid - 标准化后的 UUID
 * @returns {object|null} 各种格式的对象，无效时返回 null
 */
function formatUUID(uuid) {
  const normalized = normalizeUUID(uuid)
  if (!normalized) return null

  const hex = normalized.replace(/-/g, '')

  return {
    standard: normalized,
    noHyphens: hex,
    upper: normalized.toUpperCase(),
    upperNoHyphens: hex.toUpperCase(),
    braced: `{${normalized}}`,
    bracedUpper: `{${normalized.toUpperCase()}}`,
    urn: `urn:uuid:${normalized}`,
    urnUpper: `urn:uuid:${normalized.toUpperCase()}`,
  }
}

export {
  generateUUID,
  generateNILUUID,
  normalizeUUID,
  isValidUUID,
  parseUUID,
  formatUUID,
}
