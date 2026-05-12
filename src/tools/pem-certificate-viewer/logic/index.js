import { parsePemToBlocks, hasPrivateKey } from './pemParser'
import { parseCertificate, certificateToSummary } from './certificateParser'
import { computeFingerprints, formatFingerprint } from './fingerprint'
import { ERROR_CODES, createError, MAX_SAFE_INPUT_LENGTH } from './errors'
import { EXAMPLE_LABELS, EXAMPLE_PEMS } from './constants'

function escapeHtml(text) {
  if (text == null) return ''
  const str = String(text)
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeInput(input) {
  if (input == null) return ''
  return String(input)
}

function buildCertSummaryTable(summary, fingerprints) {
  const table = []

  table.push({
    category: 'basic',
    key: 'version',
    label: '版本 (Version)',
    value: `v${summary.version}`,
  })

  table.push({
    category: 'basic',
    key: 'serialNumber',
    label: '序列号 (Serial Number)',
    value: summary.serialNumber ? summary.serialNumber.toUpperCase() : '',
  })

  table.push({
    category: 'basic',
    key: 'signatureAlgorithm',
    label: '签名算法 (Signature Algorithm)',
    value: summary.signatureAlgorithm || '',
  })

  table.push({
    category: 'subject',
    key: 'subject',
    label: '主题 (Subject)',
    value: summary.subject,
  })

  if (summary.subjectAttributes) {
    for (const attr of summary.subjectAttributes) {
      table.push({
        category: 'subject',
        key: `subject.${attr.oid}`,
        label: `  ${attr.name}`,
        value: attr.value,
      })
    }
  }

  table.push({
    category: 'issuer',
    key: 'issuer',
    label: '颁发者 (Issuer)',
    value: summary.issuer,
  })

  if (summary.issuerAttributes) {
    for (const attr of summary.issuerAttributes) {
      table.push({
        category: 'issuer',
        key: `issuer.${attr.oid}`,
        label: `  ${attr.name}`,
        value: attr.value,
      })
    }
  }

  table.push({
    category: 'validity',
    key: 'notBefore',
    label: '有效期开始 (Not Before)',
    value: summary.notBefore,
  })

  table.push({
    category: 'validity',
    key: 'notAfter',
    label: '有效期结束 (Not After)',
    value: summary.notAfter,
  })

  table.push({
    category: 'publicKey',
    key: 'publicKeyAlgorithm',
    label: '公钥算法 (Public Key Algorithm)',
    value: summary.publicKeyAlgorithm || '',
  })

  if (summary.publicKeyCurve) {
    table.push({
      category: 'publicKey',
      key: 'publicKeyCurve',
      label: '椭圆曲线 (Curve)',
      value: summary.publicKeyCurve,
    })
  }

  if (summary.keyLengthBits) {
    table.push({
      category: 'publicKey',
      key: 'keyLength',
      label: '密钥长度 (Key Length)',
      value: `${summary.keyLengthBits} bits`,
    })
  }

  if (fingerprints) {
    if (fingerprints.md5 && fingerprints.md5 !== 'N/A') {
      table.push({
        category: 'fingerprints',
        key: 'fingerprint.md5',
        label: 'MD5 指纹',
        value: formatFingerprint(fingerprints.md5, ':'),
      })
    }

    if (fingerprints.sha1 && fingerprints.sha1 !== 'N/A') {
      table.push({
        category: 'fingerprints',
        key: 'fingerprint.sha1',
        label: 'SHA-1 指纹',
        value: formatFingerprint(fingerprints.sha1, ':'),
      })
    }

    if (fingerprints.sha256 && fingerprints.sha256 !== 'N/A') {
      table.push({
        category: 'fingerprints',
        key: 'fingerprint.sha256',
        label: 'SHA-256 指纹',
        value: formatFingerprint(fingerprints.sha256, ':'),
      })
    }
  }

  return table
}

function getCategoryLabel(category) {
  const labels = {
    basic: '基本信息',
    subject: '主题信息 (Subject)',
    issuer: '颁发者信息 (Issuer)',
    validity: '有效期 (Validity)',
    publicKey: '公钥信息',
    fingerprints: '指纹信息',
  }
  return labels[category] || category
}

async function analyzePemCertificates(input) {
  const normalizedInput = normalizeInput(input)
  const result = {
    success: true,
    error: null,
    result: {
      certificates: [],
      privateKeyDetected: false,
      totalBlocks: 0,
      certificateCount: 0,
      warnings: [],
    },
  }

  if (!normalizedInput.trim()) {
    return {
      success: false,
      error: createError(ERROR_CODES.EMPTY_INPUT),
      result: { certificates: [], privateKeyDetected: false, totalBlocks: 0, certificateCount: 0 },
    }
  }

  if (normalizedInput.length > MAX_SAFE_INPUT_LENGTH) {
    result.result.warnings.push({
      type: 'INPUT_TOO_LARGE',
      message: `输入内容过大（${normalizedInput.length.toLocaleString()} 字符），建议在 ${MAX_SAFE_INPUT_LENGTH.toLocaleString()} 字符以内`,
    })
  }

  result.result.privateKeyDetected = hasPrivateKey(normalizedInput)

  const blocks = parsePemToBlocks(normalizedInput)
  result.result.totalBlocks = blocks.length

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]

    if (!block.success) {
      continue
    }

    if (block.type === 'privateKey') {
      continue
    }

    if (block.type !== 'certificate') {
      result.result.warnings.push({
        type: 'NOT_A_CERTIFICATE',
        message: `检测到非证书类型 PEM 块：${block.label}`,
      })
      continue
    }

    try {
      const parseResult = parseCertificate(block.bytes)

      if (!parseResult.success) {
        result.result.warnings.push({
          type: 'PARSE_FAILED',
          message: `证书 #${i + 1} 解析失败：${parseResult.error?.message || '未知错误'}`,
        })
        continue
      }

      const summary = certificateToSummary(parseResult.result, block.bytes, block.label)
      const fingerprints = await computeFingerprints(block.bytes)

      result.result.certificates.push({
        index: result.result.certificates.length,
        summary,
        summaryTable: buildCertSummaryTable(summary, fingerprints),
        rawPem: block.rawPem,
        fingerprints,
      })

      result.result.certificateCount++
    } catch (e) {
      result.result.warnings.push({
        type: 'PARSE_FAILED',
        message: `证书 #${i + 1} 解析异常：${e.message}`,
      })
    }
  }

  if (result.result.certificateCount === 0) {
    return {
      success: false,
      error: createError(ERROR_CODES.NO_VALID_BLOCKS),
      result: result.result,
    }
  }

  return result
}

function certificatesToJson(result) {
  if (!result || !result.certificates) return '[]'

  const simplified = result.certificates.map(cert => ({
    index: cert.index,
    summary: cert.summary,
    fingerprints: cert.fingerprints,
  }))

  try {
    return JSON.stringify(simplified, null, 2)
  } catch (e) {
    return '{}'
  }
}

export {
  analyzePemCertificates,
  buildCertSummaryTable,
  getCategoryLabel,
  certificatesToJson,
  escapeHtml,
  EXAMPLE_LABELS,
  EXAMPLE_PEMS,
  ERROR_CODES,
  MAX_SAFE_INPUT_LENGTH,
  formatFingerprint,
}
