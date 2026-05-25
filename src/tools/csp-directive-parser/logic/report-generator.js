import { extractReportingEndpoints } from './directive-parser.js'

function generateSampleViolationReport(options = {}) {
  const {
    documentUri = 'https://example.com/page',
    referrer = 'https://referrer.com/',
    violatedDirective = 'script-src',
    effectiveDirective = 'script-src',
    blockedUri = 'https://malicious.com/script.js',
    lineNumber = 10,
    columnNumber = 5,
    sourceFile = 'https://example.com/page',
    statusCode = 200,
    scriptSample = '',
    disposition = 'enforce',
  } = options

  return {
    'csp-report': {
      'document-uri': documentUri,
      'referrer': referrer,
      'violated-directive': violatedDirective,
      'effective-directive': effectiveDirective,
      'original-policy': '',
      'disposition': disposition,
      'blocked-uri': blockedUri,
      'line-number': lineNumber,
      'column-number': columnNumber,
      'source-file': sourceFile,
      'status-code': statusCode,
      'script-sample': scriptSample,
    },
  }
}

function getReportingApiVsLegacyComparison() {
  return {
    reportUri: {
      name: 'report-uri (Legacy)',
      description: 'CSP Level 2 的遗留报告机制',
      format: 'application/csp-report',
      method: 'POST',
      browserSupport: '所有现代浏览器 + IE 11+',
      deprecated: true,
    },
    reportTo: {
      name: 'report-to (Reporting API)',
      description: 'W3C Reporting API 标准',
      format: 'application/reports+json',
      method: 'POST',
      browserSupport: 'Chrome 69+, Edge 79+, Safari 16.4+',
      deprecated: false,
    },
    differences: [
      'report-uri 发送的是单个报告对象，report-to 发送的是报告数组',
      'report-uri 使用 Content-Type: application/csp-report',
      'report-to 使用 Content-Type: application/reports+json',
      'report-to 支持报告分组和排队批量发送',
      'report-to 需要配合 Report-To 响应头使用',
      'report-uri 将被废弃但为了兼容性建议同时提供',
    ],
  }
}

function getReportingConfig(parsedPolicy) {
  const endpoints = extractReportingEndpoints(parsedPolicy)

  return {
    ...endpoints,
    hasReportUri: endpoints.reportUri.length > 0,
    hasReportTo: endpoints.reportTo.length > 0,
    recommendation: !endpoints.reportUri.length
      ? '建议添加 report-uri 以兼容旧浏览器'
      : !endpoints.reportTo.length
        ? '建议添加 report-to 使用新标准 Reporting API'
        : '报告配置完整，同时支持新旧标准',
  }
}

function prettyPrintJson(obj, indent = 2) {
  return JSON.stringify(obj, null, indent)
}

export {
  generateSampleViolationReport,
  getReportingApiVsLegacyComparison,
  getReportingConfig,
  prettyPrintJson,
}
