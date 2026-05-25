import { STANDARD_DIRECTIVES } from './constants.js'
import { parseSource, validateSourceSyntax } from './source-matcher.js'

function tokenizePolicy(policyString) {
  if (!policyString || typeof policyString !== 'string') {
    return []
  }

  const cleaned = policyString
    .replace(/^\s*Content-Security-Policy(-Report-Only)?\s*:\s*/i, '')
    .replace(/^<meta[^>]*http-equiv=["']?Content-Security-Policy(-Report-Only)?["']?[^>]*content=["']/i, '')
    .replace(/["']\s*\/?>$/i, '')
    .trim()

  if (!cleaned) {
    return []
  }

  const directiveStrings = cleaned.split(/\s*;\s*/).filter(d => d.trim())

  return directiveStrings.map(directiveStr => {
    const parts = directiveStr.trim().split(/\s+/)
    const directiveName = parts[0].toLowerCase()
    const sources = parts.slice(1)

    return {
      directive: directiveName,
      sources,
      raw: directiveStr,
    }
  })
}

function parseDirectives(policyString) {
  const tokens = tokenizePolicy(policyString)
  const directives = {}
  const errors = []
  const warnings = []

  for (const token of tokens) {
    const { directive, sources, raw } = token

    if (!STANDARD_DIRECTIVES[directive]) {
      warnings.push({
        type: 'unknown-directive',
        directive,
        message: `未知的 CSP 指令: ${directive}`,
      })
    }

    const parsedSources = sources.map(source => {
      const parsed = parseSource(source)
      const validation = validateSourceSyntax(source)

      return {
        raw: source,
        parsed,
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
      }
    })

    if (!directives[directive]) {
      directives[directive] = {
        directive,
        sources: parsedSources,
        count: 1,
        rawDirectives: [raw],
      }
    } else {
      directives[directive].sources = [
        ...directives[directive].sources,
        ...parsedSources,
      ]
      directives[directive].count += 1
      directives[directive].rawDirectives.push(raw)

      warnings.push({
        type: 'duplicate-directive',
        directive,
        message: `指令 ${directive} 重复出现，已合并源列表`,
      })
    }
  }

  return {
    directives,
    errors,
    warnings,
    tokenCount: tokens.length,
    directiveCount: Object.keys(directives).length,
  }
}

function comparePolicies(policyA, policyB) {
  const parsedA = parseDirectives(policyA)
  const parsedB = parseDirectives(policyB)

  const allDirectives = new Set([
    ...Object.keys(parsedA.directives),
    ...Object.keys(parsedB.directives),
  ])

  const comparison = {}

  for (const directive of allDirectives) {
    const dirA = parsedA.directives[directive]
    const dirB = parsedB.directives[directive]

    comparison[directive] = {
      directive,
      inA: !!dirA,
      inB: !!dirB,
      sourcesA: dirA?.sources.map(s => s.raw) || [],
      sourcesB: dirB?.sources.map(s => s.raw) || [],
    }
  }

  return {
    parsedA,
    parsedB,
    comparison,
    onlyInA: Object.keys(parsedA.directives).filter(d => !parsedB.directives[d]),
    onlyInB: Object.keys(parsedB.directives).filter(d => !parsedA.directives[d]),
    common: Object.keys(parsedA.directives).filter(d => parsedB.directives[d]),
  }
}

function getEffectiveDirectiveForType(parsedPolicy, resourceType) {
  const typeMap = {
    script: ['script-src', 'default-src'],
    style: ['style-src', 'default-src'],
    image: ['img-src', 'default-src'],
    font: ['font-src', 'default-src'],
    media: ['media-src', 'default-src'],
    frame: ['frame-src', 'child-src', 'default-src'],
    worker: ['worker-src', 'child-src', 'default-src'],
    connect: ['connect-src', 'default-src'],
    object: ['object-src', 'default-src'],
    manifest: ['manifest-src', 'default-src'],
    prefetch: ['prefetch-src', 'default-src'],
  }

  const fallbackChain = typeMap[resourceType] || ['default-src']

  for (const directive of fallbackChain) {
    if (parsedPolicy.directives[directive]) {
      return {
        directive,
        sources: parsedPolicy.directives[directive].sources.map(s => s.raw),
        fromFallback: directive !== fallbackChain[0],
      }
    }
  }

  return {
    directive: 'default-src',
    sources: ["'none'"],
    fromFallback: true,
    implicit: true,
  }
}

function extractReportingEndpoints(parsedPolicy) {
  const endpoints = {
    reportUri: [],
    reportTo: [],
  }

  if (parsedPolicy.directives['report-uri']) {
    endpoints.reportUri = parsedPolicy.directives['report-uri'].sources
      .map(s => s.raw)
  }

  if (parsedPolicy.directives['report-to']) {
    endpoints.reportTo = parsedPolicy.directives['report-to'].sources
      .map(s => s.raw)
  }

  return endpoints
}

export {
  tokenizePolicy,
  parseDirectives,
  comparePolicies,
  getEffectiveDirectiveForType,
  extractReportingEndpoints,
}
