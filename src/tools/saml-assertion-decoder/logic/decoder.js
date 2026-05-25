import pako from 'pako'
import {
  ERROR_CODES,
  createError,
  createErrorWithLocation,
} from './errors.js'

const SAML2_NS = 'urn:oasis:names:tc:SAML:2.0:assertion'
const SAML2P_NS = 'urn:oasis:names:tc:SAML:2.0:protocol'
const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#'

function detectEncoding(input) {
  const trimmed = input.trim()
  if (trimmed.startsWith('<')) {
    return 'xml'
  }
  return 'base64'
}

function decodeBase64(base64Str) {
  try {
    const cleaned = base64Str.replace(/\s/g, '')
    const decoded = atob(cleaned)
    const bytes = new Uint8Array(decoded.length)
    for (let i = 0; i < decoded.length; i++) {
      bytes[i] = decoded.charCodeAt(i)
    }
    return bytes
  } catch (e) {
    throw createError(ERROR_CODES.INVALID_BASE64, `Base64 解码失败: ${e.message}`)
  }
}

function tryDecodeBase64(base64Str) {
  try {
    const bytes = decodeBase64(base64Str)
    let xmlStr
    try {
      const inflated = pako.inflateRaw(bytes)
      xmlStr = new TextDecoder('utf-8').decode(inflated)
      return { xml: xmlStr, encoding: 'deflate' }
    } catch (e) {
      try {
        const inflated = pako.inflate(bytes)
        xmlStr = new TextDecoder('utf-8').decode(inflated)
        return { xml: xmlStr, encoding: 'deflate' }
      } catch (e2) {
        xmlStr = new TextDecoder('utf-8').decode(bytes)
        return { xml: xmlStr, encoding: 'base64' }
      }
    }
  } catch (e) {
    if (e.errorCode) throw e
    throw createError(ERROR_CODES.INVALID_BASE64, `Base64 解码失败: ${e.message}`)
  }
}

function validateXmlSyntax(xmlStr) {
  const parser = new DOMParser()
  const doc = parser.parseFromString(xmlStr, 'text/xml')
  const parseError = doc.querySelector('parsererror')
  if (parseError) {
    const errorText = parseError.textContent || 'XML 解析错误'
    const location = parseErrorLocation(xmlStr, parseError)
    throw createErrorWithLocation(ERROR_CODES.XML_PARSE_ERROR, location, errorText)
  }
  return doc
}

function parseErrorLocation(xmlStr, parseError) {
  const errorText = parseError.textContent || ''
  const lineMatch = errorText.match(/line\D*(\d+)/i)
  const colMatch = errorText.match(/column\D*(\d+)/i)
  const line = lineMatch ? parseInt(lineMatch[1], 10) : null
  const column = colMatch ? parseInt(colMatch[1], 10) : null
  return { line, column }
}

function buildXmlTree(node, depth = 0) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.trim()
    if (text) {
      return { type: 'text', content: text }
    }
    return null
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null
  }
  const element = {
    type: 'element',
    name: node.nodeName,
    namespace: node.namespaceURI,
    attributes: {},
    children: [],
  }
  for (const attr of node.attributes) {
    element.attributes[attr.name] = attr.value
  }
  for (const child of node.childNodes) {
    const childTree = buildXmlTree(child, depth + 1)
    if (childTree) {
      element.children.push(childTree)
    }
  }
  return element
}

function getElementByLocalName(parent, localName) {
  if (!parent || !parent.getElementsByTagNameNS) return null
  const elements = parent.getElementsByTagNameNS('*', localName)
  return elements.length > 0 ? elements[0] : null
}

function getElementsByLocalName(parent, localName) {
  if (!parent || !parent.getElementsByTagNameNS) return []
  return Array.from(parent.getElementsByTagNameNS('*', localName))
}

function getTextContent(element) {
  return element ? element.textContent.trim() : null
}

function findAssertion(doc) {
  const response = doc.getElementsByTagNameNS(SAML2P_NS, 'Response')[0] ||
                   doc.getElementsByTagNameNS('*', 'Response')[0]
  if (response) {
    const assertion = response.getElementsByTagNameNS(SAML2_NS, 'Assertion')[0] ||
                      response.getElementsByTagNameNS('*', 'Assertion')[0]
    if (assertion) {
      return { assertion, wrapper: 'response' }
    }
  }
  const assertion = doc.getElementsByTagNameNS(SAML2_NS, 'Assertion')[0] ||
                    doc.getElementsByTagNameNS('*', 'Assertion')[0]
  if (assertion) {
    return { assertion, wrapper: 'assertion' }
  }
  return null
}

function hasSignature(doc) {
  const signatures = doc.getElementsByTagNameNS(DSIG_NS, 'Signature') ||
                     doc.getElementsByTagNameNS('*', 'Signature')
  return signatures && signatures.length > 0
}

function parseSamlTimestamp(timestampStr) {
  if (!timestampStr) return null
  try {
    const date = new Date(timestampStr)
    if (isNaN(date.getTime())) {
      throw createError(ERROR_CODES.INVALID_TIMESTAMP, `无效的时间格式: ${timestampStr}`)
    }
    return date
  } catch (e) {
    if (e.errorCode) throw e
    throw createError(ERROR_CODES.INVALID_TIMESTAMP, `时间解析失败: ${e.message}`)
  }
}

function formatSamlTimestamp(date) {
  if (!date) return null
  return date.toISOString()
}

function extractIssuer(assertion) {
  const issuer = getElementByLocalName(assertion, 'Issuer')
  return getTextContent(issuer)
}

function extractNameID(assertion) {
  const subject = getElementByLocalName(assertion, 'Subject')
  if (!subject) return null
  const nameID = getElementByLocalName(subject, 'NameID')
  if (!nameID) return null
  return {
    value: getTextContent(nameID),
    format: nameID.getAttribute('Format') || null,
    nameQualifier: nameID.getAttribute('NameQualifier') || null,
    spNameQualifier: nameID.getAttribute('SPNameQualifier') || null,
  }
}

function extractConditions(assertion) {
  const conditions = getElementByLocalName(assertion, 'Conditions')
  if (!conditions) return null
  const notBefore = conditions.getAttribute('NotBefore')
  const notOnOrAfter = conditions.getAttribute('NotOnOrAfter')
  const audienceRestrictions = getElementsByLocalName(conditions, 'AudienceRestriction')
  const audiences = []
  for (const ar of audienceRestrictions) {
    const audienceEls = getElementsByLocalName(ar, 'Audience')
    for (const aud of audienceEls) {
      const text = getTextContent(aud)
      if (text) audiences.push(text)
    }
  }
  return {
    notBefore: notBefore ? parseSamlTimestamp(notBefore) : null,
    notBeforeRaw: notBefore,
    notOnOrAfter: notOnOrAfter ? parseSamlTimestamp(notOnOrAfter) : null,
    notOnOrAfterRaw: notOnOrAfter,
    audiences,
  }
}

function extractAuthnStatement(assertion) {
  const authnStatement = getElementByLocalName(assertion, 'AuthnStatement')
  if (!authnStatement) return null
  const sessionIndex = authnStatement.getAttribute('SessionIndex')
  const authnInstant = authnStatement.getAttribute('AuthnInstant')
  const authnContext = getElementByLocalName(authnStatement, 'AuthnContext')
  const authnContextClassRef = authnContext
    ? getTextContent(getElementByLocalName(authnContext, 'AuthnContextClassRef'))
    : null
  return {
    sessionIndex,
    authnInstant: authnInstant ? parseSamlTimestamp(authnInstant) : null,
    authnInstantRaw: authnInstant,
    authnContextClassRef,
  }
}

function extractSamlFields(doc) {
  const assertionInfo = findAssertion(doc)
  if (!assertionInfo) {
    throw createError(ERROR_CODES.MISSING_ASSERTION)
  }
  const { assertion, wrapper } = assertionInfo
  const issuer = extractIssuer(assertion)
  const nameID = extractNameID(assertion)
  const conditions = extractConditions(assertion)
  const authnStatement = extractAuthnStatement(assertion)
  const hasSig = hasSignature(doc)
  return {
    wrapper,
    issuer,
    nameID,
    conditions,
    authnStatement,
    hasSignature: hasSig,
    assertionId: assertion.getAttribute('ID') || assertion.getAttribute('AssertionID') || null,
    issueInstant: assertion.getAttribute('IssueInstant')
      ? parseSamlTimestamp(assertion.getAttribute('IssueInstant'))
      : null,
    issueInstantRaw: assertion.getAttribute('IssueInstant') || null,
    version: assertion.getAttribute('Version') || null,
  }
}

function validateTiming(conditions, currentTime = new Date()) {
  if (!conditions) {
    return { status: 'noConditions', message: '无时间限制条件' }
  }
  const now = currentTime.getTime()
  const { notBefore, notOnOrAfter } = conditions
  if (notBefore && now < notBefore.getTime()) {
    return {
      status: 'notYetValid',
      message: '断言尚未生效',
      notBefore: formatSamlTimestamp(notBefore),
      currentTime: formatSamlTimestamp(currentTime),
    }
  }
  if (notOnOrAfter && now >= notOnOrAfter.getTime()) {
    return {
      status: 'expired',
      message: '断言已过期',
      notOnOrAfter: formatSamlTimestamp(notOnOrAfter),
      currentTime: formatSamlTimestamp(currentTime),
    }
  }
  return {
    status: 'valid',
    message: '时间有效性验证通过',
    notBefore: notBefore ? formatSamlTimestamp(notBefore) : null,
    notOnOrAfter: notOnOrAfter ? formatSamlTimestamp(notOnOrAfter) : null,
    currentTime: formatSamlTimestamp(currentTime),
  }
}

function validateAudience(conditions, expectedSpEntityId) {
  if (!conditions || !conditions.audiences || conditions.audiences.length === 0) {
    return { status: 'noAudience', message: '无受众限制' }
  }
  if (!expectedSpEntityId) {
    return {
      status: 'noExpected',
      message: '未设置期望的 SP Entity ID',
      audiences: conditions.audiences,
    }
  }
  const matched = conditions.audiences.some(
    (aud) => aud.trim() === expectedSpEntityId.trim()
  )
  if (matched) {
    return {
      status: 'valid',
      message: '受众验证通过',
      expected: expectedSpEntityId,
      audiences: conditions.audiences,
    }
  }
  return {
    status: 'mismatch',
    message: '受众不匹配',
    expected: expectedSpEntityId,
    audiences: conditions.audiences,
  }
}

function decodeSamlAssertion(input) {
  if (input == null) {
    throw createError(ERROR_CODES.NULL_INPUT)
  }
  const trimmed = String(input).trim()
  if (trimmed === '') {
    throw createError(ERROR_CODES.EMPTY_INPUT)
  }
  const encoding = detectEncoding(trimmed)
  let xmlStr
  let actualEncoding = encoding
  if (encoding === 'base64') {
    const result = tryDecodeBase64(trimmed)
    xmlStr = result.xml
    actualEncoding = result.encoding
  } else {
    xmlStr = trimmed
  }
  const doc = validateXmlSyntax(xmlStr)
  const xmlTree = buildXmlTree(doc.documentElement)
  const fields = extractSamlFields(doc)
  return {
    xml: xmlStr,
    encoding: actualEncoding,
    xmlTree,
    fields,
  }
}

export {
  detectEncoding,
  decodeBase64,
  tryDecodeBase64,
  validateXmlSyntax,
  buildXmlTree,
  findAssertion,
  hasSignature,
  parseSamlTimestamp,
  formatSamlTimestamp,
  extractIssuer,
  extractNameID,
  extractConditions,
  extractAuthnStatement,
  extractSamlFields,
  validateTiming,
  validateAudience,
  decodeSamlAssertion,
}
