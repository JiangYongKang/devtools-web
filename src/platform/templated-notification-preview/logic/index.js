import { tokenize } from './tokenizer'
import { parse } from './parser'
import { render, escapeHtml } from './renderer'
import { FILTER_REGISTRY, SAMPLE_SCENARIOS, WARNING_TYPES, ERROR_TYPES } from './constants'
import { TemplateError } from './errors'

export function compileTemplate(template, context, customFilters = {}) {
  try {
    const tokens = tokenize(template)
    const ast = parse(tokens)
    const result = render(ast, context, customFilters)

    return {
      success: true,
      output: result.output,
      warnings: result.warnings,
      tokens,
      ast,
    }
  } catch (error) {
    if (error instanceof TemplateError) {
      return {
        success: false,
        error: {
          message: error.message,
          type: error.type,
          line: error.line,
          column: error.column,
          source: error.source,
        },
      }
    }
    return {
      success: false,
      error: {
        message: error.message,
        type: 'UNKNOWN_ERROR',
        line: 1,
        column: 1,
      },
    }
  }
}

export function benchmarkTemplate(template, context, iterations = 100) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const start = performance.now()

      for (let i = 0; i < iterations; i++) {
        try {
          const tokens = tokenize(template)
          const ast = parse(tokens)
          render(ast, context)
        } catch (e) {
        }
      }

      const end = performance.now()
      const totalTime = end - start
      const avgTime = totalTime / iterations
      const templateSize = new Blob([template]).size

      resolve({
        iterations,
        totalTime: totalTime.toFixed(2),
        avgTime: avgTime.toFixed(4),
        templateSize,
        opsPerSecond: Math.round(1000 / avgTime),
      })
    }, 0)
  })
}

export function flattenContext(context, prefix = '') {
  const result = {}

  function traverse(obj, currentPrefix) {
    for (const [key, value] of Object.entries(obj)) {
      const fullPath = currentPrefix ? `${currentPrefix}.${key}` : key
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        traverse(value, fullPath)
      } else {
        result[fullPath] = value
      }
    }
  }

  traverse(context, prefix)
  return result
}

export function unflattenContext(flat) {
  const result = {}

  for (const [path, value] of Object.entries(flat)) {
    const parts = path.split('.')
    let current = result

    for (let i = 0; i < parts.length - 1; i++) {
      if (!(parts[i] in current)) {
        current[parts[i]] = {}
      }
      current = current[parts[i]]
    }

    current[parts[parts.length - 1]] = value
  }

  return result
}

export {
  tokenize,
  parse,
  render,
  escapeHtml,
  FILTER_REGISTRY,
  SAMPLE_SCENARIOS,
  WARNING_TYPES,
  ERROR_TYPES,
  TemplateError,
}
