import { CERTIFICATE_LABELS, PRIVATE_KEY_LABELS } from './constants'

function pemDecode(pemString) {
  const lines = pemString.trim().split(/\r?\n/)

  if (lines.length < 3) {
    throw new Error('PEM 格式不完整')
  }

  const beginLine = lines[0].trim()
  const endLine = lines[lines.length - 1].trim()

  const beginMatch = beginLine.match(/^-----BEGIN ([^-]+)-----$/)
  const endMatch = endLine.match(/^-----END ([^-]+)-----$/)

  if (!beginMatch || !endMatch) {
    throw new Error('PEM 格式无效：缺少 BEGIN/END 标记')
  }

  const beginLabel = beginMatch[1]
  const endLabel = endMatch[1]

  if (beginLabel !== endLabel) {
    throw new Error(`PEM 标记不匹配：BEGIN ${beginLabel} vs END ${endLabel}`)
  }

  const base64Content = lines.slice(1, -1).map(line => line.trim()).join('')

  if (!base64Content) {
    throw new Error('PEM 内容为空')
  }

  const cleanBase64 = base64Content.replace(/\s+/g, '')

  let binary
  try {
    binary = atob(cleanBase64)
  } catch (e) {
    throw new Error('Base64 解码失败')
  }

  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }

  return {
    label: beginLabel,
    base64: cleanBase64,
    bytes,
    rawPem: pemString,
  }
}

function splitPemBlocks(input) {
  const blocks = []
  const regex = /-----BEGIN [^-]+-----[\s\S]*?-----END [^-]+-----/g
  let match

  while ((match = regex.exec(input)) !== null) {
    blocks.push({
      content: match[0],
      index: match.index,
    })
  }

  return blocks
}

function classifyPemLabel(label) {
  if (CERTIFICATE_LABELS.has(label)) {
    return 'certificate'
  }

  if (PRIVATE_KEY_LABELS.has(label)) {
    return 'privateKey'
  }

  if (label === 'PKCS7' || label === 'CMS') {
    return 'pkcs7'
  }

  return 'unknown'
}

function parsePemToBlocks(input) {
  const blocks = splitPemBlocks(input)
  const results = []

  for (const block of blocks) {
    try {
      const decoded = pemDecode(block.content)
      const type = classifyPemLabel(decoded.label)
      results.push({
        ...decoded,
        type,
        success: true,
      })
    } catch (e) {
      results.push({
        success: false,
        error: e.message,
        rawContent: block.content,
      })
    }
  }

  return results
}

function hasPrivateKey(input) {
  const blocks = splitPemBlocks(input)
  for (const block of blocks) {
    const labelMatch = block.content.match(/^-----BEGIN ([^-]+)-----/)
    if (labelMatch && PRIVATE_KEY_LABELS.has(labelMatch[1])) {
      return true
    }
  }
  return false
}

function countCertificates(input) {
  const blocks = splitPemBlocks(input)
  let count = 0
  for (const block of blocks) {
    const labelMatch = block.content.match(/^-----BEGIN ([^-]+)-----/)
    if (labelMatch && CERTIFICATE_LABELS.has(labelMatch[1])) {
      count++
    }
  }
  return count
}

export {
  pemDecode,
  splitPemBlocks,
  classifyPemLabel,
  parsePemToBlocks,
  hasPrivateKey,
  countCertificates,
}
