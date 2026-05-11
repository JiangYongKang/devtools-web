/**
 * 支持的哈希算法配置
 * id: 算法唯一标识，与 Web Crypto API 命名保持一致（SHA-256 等）
 * source: 实现来源
 *   - 'webcrypto': 使用浏览器原生 Web Crypto API（推荐，性能最优）
 *   - 'custom': 纯 JavaScript 实现（Web Crypto 不支持的算法）
 * security: 安全等级
 *   - 'weak': 已被密码分析证明存在碰撞风险，不可用于安全场景
 *   - 'strong': SHA-2 家族，当前业界标准
 */
const ALGORITHMS = [
  { id: 'MD5', name: 'MD5', source: 'custom', description: '128 位摘要，已被证明不安全，仅用于非安全场景的完整性校验', security: 'weak' },
  { id: 'SHA-1', name: 'SHA-1', source: 'webcrypto', description: '160 位摘要，已被证明存在碰撞风险，不推荐用于安全场景', security: 'weak' },
  { id: 'SHA-256', name: 'SHA-256', source: 'webcrypto', description: '256 位摘要，SHA-2 家族，适用于大多数安全场景', security: 'strong' },
  { id: 'SHA-384', name: 'SHA-384', source: 'webcrypto', description: '384 位摘要，SHA-2 家族，安全性更高', security: 'strong' },
  { id: 'SHA-512', name: 'SHA-512', source: 'webcrypto', description: '512 位摘要，SHA-2 家族，最高安全性', security: 'strong' },
]

/**
 * HTML 转义函数，防止 XSS 攻击
 * 利用 DOM 原生特性进行安全转义
 * @param {string|null|undefined} text - 需要转义的文本
 * @returns {string} 转义后的安全 HTML 字符串
 */
function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

/**
 * 将字节数格式化为人类可读的字符串（B、KB、MB、GB）
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的字符串，如 "2.50 MB"
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + units[i]
}

/**
 * 将 ArrayBuffer 转换为十六进制字符串（小写）
 * 业界标准表示方式，每字节转换为两位十六进制字符
 * @param {ArrayBuffer} buffer - 二进制数据
 * @returns {string} 十六进制字符串，如 "a1b2c3d4..."
 */
function arrayBufferToHex(buffer) {
  const bytes = new Uint8Array(buffer)
  const hexChars = []
  for (let i = 0; i < bytes.length; i++) {
    hexChars.push(bytes[i].toString(16).padStart(2, '0'))
  }
  return hexChars.join('')
}

/**
 * 异步读取文件为 ArrayBuffer
 * 使用 FileReader API，适合处理任意类型的二进制文件
 * @param {File} file - 浏览器 File 对象
 * @returns {Promise<ArrayBuffer>} 文件的二进制数据
 * @throws {Error} 读取失败时抛出错误
 */
function readFileAsArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

/**
 * MD5 算法纯 JavaScript 实现（RFC 1321）
 * 
 * 说明：Web Crypto API 不包含 MD5（因已被密码学废弃），
 * 故需要纯 JS 实现以支持兼容场景。
 * 
 * 算法原理：
 * - 输入：任意长度的二进制数据
 * - 输出：128 位（16 字节）消息摘要
 * - 核心：64 轮变换（FF、GG、HH、II 各 16 轮）
 * 
 * 安全警告：
 * - 2004 年王小云院士团队公布碰撞攻击
 * - 2008 年实现伪造 CA 证书攻击
 * - 不可用于数字签名、密码存储等安全场景
 */
const MD5 = (function () {
  /** MD5 轮函数 F：第 0-15 轮使用 */
  function F(x, y, z) { return (x & y) | ((~x) & z) }
  /** MD5 轮函数 G：第 16-31 轮使用 */
  function G(x, y, z) { return (x & z) | (y & (~z)) }
  /** MD5 轮函数 H：第 32-47 轮使用 */
  function H(x, y, z) { return x ^ y ^ z }
  /** MD5 轮函数 I：第 48-63 轮使用 */
  function I(x, y, z) { return y ^ (x | (~z)) }

  /**
   * 循环左移操作（32 位无符号）
   * @param {number} x - 32 位整数
   * @param {number} n - 移位位数
   * @returns {number} 移位后的结果
   */
  function rotateLeft(x, n) {
    return (x << n) | (x >>> (32 - n))
  }

  /** FF 变换：第 0-15 轮，使用轮函数 F */
  function FF(a, b, c, d, x, s, ac) {
    a = a + F(b, c, d) + x + ac
    a = rotateLeft(a, s)
    return a + b
  }

  /** GG 变换：第 16-31 轮，使用轮函数 G */
  function GG(a, b, c, d, x, s, ac) {
    a = a + G(b, c, d) + x + ac
    a = rotateLeft(a, s)
    return a + b
  }

  /** HH 变换：第 32-47 轮，使用轮函数 H */
  function HH(a, b, c, d, x, s, ac) {
    a = a + H(b, c, d) + x + ac
    a = rotateLeft(a, s)
    return a + b
  }

  /** II 变换：第 48-63 轮，使用轮函数 I */
  function II(a, b, c, d, x, s, ac) {
    a = a + I(b, c, d) + x + ac
    a = rotateLeft(a, s)
    return a + b
  }

  /**
   * MD5 填充与分块
   * 
   * 填充规则（RFC 1321）：
   * 1. 追加比特 1
   * 2. 追加比特 0，直到长度 ≡ 448 (mod 512)
   * 3. 追加原始长度的 64 位小端序表示
   * 
   * @param {Uint8Array} bytes - 原始字节数组
   * @returns {number[]} 32 位字数组，每元素代表一个 512 位块中的 32 位字
   */
  function convertToWordArray(bytes) {
    const wordCount = ((bytes.length + 8) >>> 6) + 1
    const wordArray = new Array(wordCount * 16).fill(0)
    let bytePos = 0
    let bitPos = 0
    while (bytePos < bytes.length) {
      wordArray[bitPos >>> 5] |= (bytes[bytePos] & 0xFF) << (bitPos % 32)
      bytePos++
      bitPos += 8
    }
    wordArray[bitPos >>> 5] |= 0x80 << (bitPos % 32)
    wordArray[((wordCount * 16) - 2)] = bytes.length * 8
    return wordArray
  }

  /**
   * 将 32 位字转换为十六进制字符串（小端序）
   * MD5 输出采用小端字节序，与人类阅读习惯一致
   * @param {number} value - 32 位整数
   * @returns {string} 8 位十六进制字符串
   */
  function wordToHex(value) {
    let hex = ''
    for (let i = 0; i < 4; i++) {
      const byte = (value >>> (i * 8)) & 0xFF
      hex += byte.toString(16).padStart(2, '0')
    }
    return hex
  }

  /**
   * 计算 MD5 摘要
   * 
   * 工作流程：
   * 1. 初始化四个 32 位寄存器（A, B, C, D）的魔法常量
   * 2. 对每个 512 位块执行 64 轮变换
   * 3. 将最终状态转换为十六进制字符串
   * 
   * @param {ArrayBuffer} buffer - 输入的二进制数据
   * @returns {string} 32 位十六进制字符串（小写）
   */
  return function (buffer) {
    const bytes = new Uint8Array(buffer)
    const x = convertToWordArray(bytes)

    /** MD5 初始化向量（魔法常量，RFC 1321 定义） */
    let a = 0x67452301
    let b = 0xEFCDAB89
    let c = 0x98BADCFE
    let d = 0x10325476

    /** 对每个 512 位块进行处理 */
    for (let k = 0; k < x.length; k += 16) {
      const AA = a
      const BB = b
      const CC = c
      const DD = d

      /** 第 1 轮（FF，16 次迭代） */
      a = FF(a, b, c, d, x[k + 0], 7, 0xD76AA478)
      d = FF(d, a, b, c, x[k + 1], 12, 0xE8C7B756)
      c = FF(c, d, a, b, x[k + 2], 17, 0x242070DB)
      b = FF(b, c, d, a, x[k + 3], 22, 0xC1BDCEEE)
      a = FF(a, b, c, d, x[k + 4], 7, 0xF57C0FAF)
      d = FF(d, a, b, c, x[k + 5], 12, 0x4787C62A)
      c = FF(c, d, a, b, x[k + 6], 17, 0xA8304613)
      b = FF(b, c, d, a, x[k + 7], 22, 0xFD469501)
      a = FF(a, b, c, d, x[k + 8], 7, 0x698098D8)
      d = FF(d, a, b, c, x[k + 9], 12, 0x8B44F7AF)
      c = FF(c, d, a, b, x[k + 10], 17, 0xFFFF5BB1)
      b = FF(b, c, d, a, x[k + 11], 22, 0x895CD7BE)
      a = FF(a, b, c, d, x[k + 12], 7, 0x6B901122)
      d = FF(d, a, b, c, x[k + 13], 12, 0xFD987193)
      c = FF(c, d, a, b, x[k + 14], 17, 0xA679438E)
      b = FF(b, c, d, a, x[k + 15], 22, 0x49B40821)

      /** 第 2 轮（GG，16 次迭代） */
      a = GG(a, b, c, d, x[k + 1], 5, 0xF61E2562)
      d = GG(d, a, b, c, x[k + 6], 9, 0xC040B340)
      c = GG(c, d, a, b, x[k + 11], 14, 0x265E5A51)
      b = GG(b, c, d, a, x[k + 0], 20, 0xE9B6C7AA)
      a = GG(a, b, c, d, x[k + 5], 5, 0xD62F105D)
      d = GG(d, a, b, c, x[k + 10], 9, 0x02441453)
      c = GG(c, d, a, b, x[k + 15], 14, 0xD8A1E681)
      b = GG(b, c, d, a, x[k + 4], 20, 0xE7D3FBC8)
      a = GG(a, b, c, d, x[k + 9], 5, 0x21E1CDE6)
      d = GG(d, a, b, c, x[k + 14], 9, 0xC33707D6)
      c = GG(c, d, a, b, x[k + 3], 14, 0xF4D50D87)
      b = GG(b, c, d, a, x[k + 8], 20, 0x455A14ED)
      a = GG(a, b, c, d, x[k + 13], 5, 0xA9E3E905)
      d = GG(d, a, b, c, x[k + 2], 9, 0xFCEFA3F8)
      c = GG(c, d, a, b, x[k + 7], 14, 0x676F02D9)
      b = GG(b, c, d, a, x[k + 12], 20, 0x8D2A4C8A)

      /** 第 3 轮（HH，16 次迭代） */
      a = HH(a, b, c, d, x[k + 5], 4, 0xFFFA3942)
      d = HH(d, a, b, c, x[k + 8], 11, 0x8771F681)
      c = HH(c, d, a, b, x[k + 11], 16, 0x6D9D6122)
      b = HH(b, c, d, a, x[k + 14], 23, 0xFDE5380C)
      a = HH(a, b, c, d, x[k + 1], 4, 0xA4BEEA44)
      d = HH(d, a, b, c, x[k + 4], 11, 0x4BDECFA9)
      c = HH(c, d, a, b, x[k + 7], 16, 0xF6BB4B60)
      b = HH(b, c, d, a, x[k + 10], 23, 0xBEBFBC70)
      a = HH(a, b, c, d, x[k + 13], 4, 0x289B7EC6)
      d = HH(d, a, b, c, x[k + 0], 11, 0xEAA127FA)
      c = HH(c, d, a, b, x[k + 3], 16, 0xD4EF3085)
      b = HH(b, c, d, a, x[k + 6], 23, 0x04881D05)
      a = HH(a, b, c, d, x[k + 9], 4, 0xD9D4D039)
      d = HH(d, a, b, c, x[k + 12], 11, 0xE6DB99E5)
      c = HH(c, d, a, b, x[k + 15], 16, 0x1FA27CF8)
      b = HH(b, c, d, a, x[k + 2], 23, 0xC4AC5665)

      /** 第 4 轮（II，16 次迭代） */
      a = II(a, b, c, d, x[k + 0], 6, 0xF4292244)
      d = II(d, a, b, c, x[k + 7], 10, 0x432AFF97)
      c = II(c, d, a, b, x[k + 14], 15, 0xAB9423A7)
      b = II(b, c, d, a, x[k + 5], 21, 0xFC93A039)
      a = II(a, b, c, d, x[k + 12], 6, 0x655B59C3)
      d = II(d, a, b, c, x[k + 3], 10, 0x8F0CCC92)
      c = II(c, d, a, b, x[k + 10], 15, 0xFFEFF47D)
      b = II(b, c, d, a, x[k + 1], 21, 0x85845DD1)
      a = II(a, b, c, d, x[k + 8], 6, 0x6FA87E4F)
      d = II(d, a, b, c, x[k + 15], 10, 0xFE2CE6E0)
      c = II(c, d, a, b, x[k + 6], 15, 0xA3014314)
      b = II(b, c, d, a, x[k + 13], 21, 0x4E0811A1)
      a = II(a, b, c, d, x[k + 4], 6, 0xF7537E82)
      d = II(d, a, b, c, x[k + 11], 10, 0xBD3AF235)
      c = II(c, d, a, b, x[k + 2], 15, 0x2AD7D2BB)
      b = II(b, c, d, a, x[k + 9], 21, 0xEB86D391)

      /** 累加当前块的变换结果 */
      a = a + AA
      b = b + BB
      c = c + CC
      d = d + DD
    }

    /** 按小端序输出最终的 128 位摘要 */
    return wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)
  }
})()

/**
 * 统一的摘要计算入口函数
 * 
 * 根据算法配置选择实现方式：
 * - SHA 系列：使用 Web Crypto API（性能最优，浏览器原生）
 * - MD5：使用纯 JS 实现（Web Crypto 不包含此算法）
 * 
 * @param {ArrayBuffer} buffer - 输入的二进制数据
 * @param {string} algorithm - 算法标识（如 'SHA-256', 'MD5'）
 * @returns {Promise<string>} 十六进制摘要字符串
 * @throws {Error} 当算法不支持或环境不满足时抛出错误
 * 
 * 注意事项：
 * - Web Crypto API（crypto.subtle）仅在 HTTPS 或 localhost 环境可用
 * - 非安全环境（如 file:// 协议）下 SHA 系列不可用
 */
async function computeDigest(buffer, algorithm) {
  const algo = ALGORITHMS.find(a => a.id === algorithm)
  if (!algo) {
    throw new Error(`不支持的算法: ${algorithm}`)
  }

  if (algo.source === 'webcrypto') {
    if (!crypto?.subtle) {
      throw new Error('当前环境不支持 Web Crypto API，请使用现代浏览器')
    }
    const result = await crypto.subtle.digest(algorithm, buffer)
    return arrayBufferToHex(result)
  }

  if (algo.id === 'MD5') {
    return MD5(buffer)
  }

  throw new Error(`算法 ${algorithm} 实现不可用`)
}

export {
  ALGORITHMS,
  escapeHtml,
  formatBytes,
  arrayBufferToHex,
  readFileAsArrayBuffer,
  MD5,
  computeDigest,
}
