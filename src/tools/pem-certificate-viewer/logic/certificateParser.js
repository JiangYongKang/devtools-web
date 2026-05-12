import { parseAsn1Node, getNodeValue, getOidName, getCurveName, ASN1_TAG } from './asn1Decoder'
import { ERROR_CODES, createError } from './errors'

function parseName(node, bytes) {
  const attributes = []

  for (const rdn of node.children) {
    for (const attr of rdn.children) {
      if (attr.children.length >= 2) {
        const oid = getNodeValue(bytes, attr.children[0])
        const value = getNodeValue(bytes, attr.children[1])
        attributes.push({
          oid,
          name: getOidName(oid),
          value: value !== null ? String(value) : '',
        })
      }
    }
  }

  return {
    attributes,
    toString: () => {
      return attributes.map(a => `${a.name}=${a.value}`).join(', ')
    },
  }
}

function parseValidity(validityNode, bytes) {
  let notBefore = null
  let notAfter = null

  if (validityNode.children.length >= 2) {
    notBefore = getNodeValue(bytes, validityNode.children[0])
    notAfter = getNodeValue(bytes, validityNode.children[1])
  }

  return { notBefore, notAfter }
}

function parseSubjectPublicKeyInfo(spkiNode, bytes) {
  const result = {
    algorithm: null,
    algorithmOid: null,
    curve: null,
    curveOid: null,
    keyLengthBits: 0,
    raw: null,
  }

  if (spkiNode.children.length >= 2) {
    const algorithmNode = spkiNode.children[0]
    if (algorithmNode.children.length >= 1) {
      const algorithmOid = getNodeValue(bytes, algorithmNode.children[0])
      result.algorithmOid = algorithmOid
      result.algorithm = getOidName(algorithmOid)

      if (algorithmNode.children.length >= 2 && !algorithmNode.children[1].tagConstructed) {
        const paramsOid = getNodeValue(bytes, algorithmNode.children[1])
        if (typeof paramsOid === 'string' && paramsOid.includes('.')) {
          result.curveOid = paramsOid
          result.curve = getCurveName(paramsOid)
        }
      }
    }

    const keyNode = spkiNode.children[1]
    const keyValue = getNodeValue(bytes, keyNode)
    if (keyValue && keyValue.value) {
      result.raw = keyValue.value

      if (result.algorithm && result.algorithm.includes('RSA')) {
        try {
          const keyData = keyValue.value
          const keyBytes = new Uint8Array(keyData.length + 1)
          keyBytes[0] = 0
          keyBytes.set(keyData, 1)
          const keyNode = parseAsn1Node(keyBytes, 0)

          if (keyNode && keyNode.children.length >= 2) {
            const modulusNode = keyNode.children[0]
            const modulusValue = getNodeValue(keyBytes, modulusNode)
            if (typeof modulusValue === 'string') {
              result.keyLengthBits = modulusValue.length * 4
            }
          }
        } catch (e) {
          result.keyLengthBits = keyValue.value.length * 8
        }
      } else if (result.curve) {
        const curveSizes = {
          'prime192v1': 192,
          'prime256v1': 256,
          'secp256k1': 256,
          'secp384r1': 384,
          'secp521r1': 521,
          'sect163k1': 163,
          'sect163r2': 163,
          'sect233k1': 233,
          'sect233r1': 233,
          'sect283k1': 283,
          'sect283r1': 283,
          'sect409k1': 409,
          'sect409r1': 409,
          'sect571k1': 571,
          'sect571r1': 571,
        }
        result.keyLengthBits = curveSizes[result.curve] || keyValue.value.length * 8
      } else {
        result.keyLengthBits = keyValue.value.length * 8
      }
    }
  }

  return result
}

function parseExtensions(extensionsNode, bytes) {
  const extensions = []

  for (const extNode of extensionsNode.children) {
    if (extNode.children.length >= 2) {
      const oid = getNodeValue(bytes, extNode.children[0])
      let critical = false
      let valueNode = extNode.children[1]

      if (extNode.children.length >= 3) {
        critical = getNodeValue(bytes, extNode.children[1])
        valueNode = extNode.children[2]
      }

      let value = getNodeValue(bytes, valueNode)
      let decodedValue = null

      if (value instanceof Uint8Array) {
        try {
          const innerNode = parseAsn1Node(value, 0)
          if (innerNode) {
            decodedValue = { type: 'sequence', raw: value }
          }
        } catch (e) {
          decodedValue = { type: 'raw', raw: value }
        }
      }

      extensions.push({
        oid,
        name: getOidName(oid),
        critical,
        value,
        decodedValue,
      })
    }
  }

  return extensions
}

function parseCertificate(bytes) {
  const rootNode = parseAsn1Node(bytes, 0)

  if (!rootNode) {
    return { success: false, error: createError(ERROR_CODES.MALFORMED_ASN1, '无法解析 ASN.1 结构') }
  }

  if (rootNode.tag !== ASN1_TAG.SEQUENCE || rootNode.children.length < 1) {
    return { success: false, error: createError(ERROR_CODES.NOT_A_CERTIFICATE, '不是有效的 X.509 证书') }
  }

  const tbsCertificate = rootNode.children[0]

  if (tbsCertificate.children.length < 7) {
    return { success: false, error: createError(ERROR_CODES.MALFORMED_ASN1, '证书结构不完整') }
  }

  let childIndex = 0
  let version = 1
  let serialNumber = ''
  let signatureAlgorithm = null
  let signatureAlgorithmOid = null
  let issuer = null
  let validity = null
  let subject = null
  let subjectPublicKeyInfo = null
  let extensions = []

  if (tbsCertificate.children[childIndex].tag === 0xA0) {
    const versionNode = tbsCertificate.children[childIndex]
    if (versionNode.children.length > 0) {
      const versionValue = getNodeValue(bytes, versionNode.children[0])
      version = (typeof versionValue === 'number' ? versionValue : 0) + 1
    }
    childIndex++
  }

  if (childIndex < tbsCertificate.children.length) {
    serialNumber = getNodeValue(bytes, tbsCertificate.children[childIndex])
    childIndex++
  }

  if (childIndex < tbsCertificate.children.length) {
    const sigAlgNode = tbsCertificate.children[childIndex]
    if (sigAlgNode.children.length >= 1) {
      signatureAlgorithmOid = getNodeValue(bytes, sigAlgNode.children[0])
      signatureAlgorithm = getOidName(signatureAlgorithmOid)
    }
    childIndex++
  }

  if (childIndex < tbsCertificate.children.length) {
    issuer = parseName(tbsCertificate.children[childIndex], bytes)
    childIndex++
  }

  if (childIndex < tbsCertificate.children.length) {
    validity = parseValidity(tbsCertificate.children[childIndex], bytes)
    childIndex++
  }

  if (childIndex < tbsCertificate.children.length) {
    subject = parseName(tbsCertificate.children[childIndex], bytes)
    childIndex++
  }

  if (childIndex < tbsCertificate.children.length) {
    subjectPublicKeyInfo = parseSubjectPublicKeyInfo(tbsCertificate.children[childIndex], bytes)
    childIndex++
  }

  for (let i = childIndex; i < tbsCertificate.children.length; i++) {
    const extNode = tbsCertificate.children[i]
    if (extNode.tag === 0xA3 || extNode.tagClass === 2) {
      if (extNode.children.length > 0) {
        const seqNode = extNode.children[0]
        extensions = parseExtensions(seqNode, bytes)
      }
    }
  }

  return {
    success: true,
    result: {
      version,
      serialNumber: String(serialNumber || ''),
      signatureAlgorithm,
      signatureAlgorithmOid,
      issuer,
      subject,
      validity,
      subjectPublicKeyInfo,
      extensions,
    },
  }
}

function formatDate(date) {
  if (!date) return 'N/A'
  try {
    return date.toISOString()
  } catch (e) {
    return String(date)
  }
}

function certificateToSummary(certResult, pemBytes, label) {
  const summary = {
    version: certResult.version,
    serialNumber: certResult.serialNumber,
    signatureAlgorithm: certResult.signatureAlgorithm || certResult.signatureAlgorithmOid,
    issuer: certResult.issuer ? certResult.issuer.toString() : '',
    issuerAttributes: certResult.issuer ? certResult.issuer.attributes : [],
    subject: certResult.subject ? certResult.subject.toString() : '',
    subjectAttributes: certResult.subject ? certResult.subject.attributes : [],
    notBefore: formatDate(certResult.validity?.notBefore),
    notAfter: formatDate(certResult.validity?.notAfter),
    publicKeyAlgorithm: certResult.subjectPublicKeyInfo?.algorithm || certResult.subjectPublicKeyInfo?.algorithmOid,
    publicKeyCurve: certResult.subjectPublicKeyInfo?.curve,
    keyLengthBits: certResult.subjectPublicKeyInfo?.keyLengthBits || 0,
    extensions: certResult.extensions,
    pemLabel: label,
  }

  return summary
}

export {
  parseCertificate,
  certificateToSummary,
  formatDate,
}
