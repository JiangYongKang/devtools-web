import { NODE_TYPES } from './parser'
import { FILTER_REGISTRY, WARNING_TYPES } from './constants'

export function resolvePath(context, path) {
  if (!path) return undefined
  const parts = path.split('.')
  let value = context

  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined
    }
    value = value[part]
  }

  return value
}

export function isFalsy(value) {
  return (
    value === false ||
    value === 0 ||
    value === '' ||
    value === null ||
    value === undefined
  )
}

export function applyFilters(value, filters, filterRegistry, warnings) {
  let result = value

  for (const filter of filters) {
    const filterFn = filterRegistry[filter.name]
    if (!filterFn) {
      warnings.push({
        type: WARNING_TYPES.UNKNOWN_FILTER,
        message: `未知的过滤器: ${filter.name}`,
        filterName: filter.name,
      })
      continue
    }
    try {
      result = filterFn(result, ...filter.args)
    } catch (e) {
      warnings.push({
        type: WARNING_TYPES.UNKNOWN_FILTER,
        message: `过滤器执行失败: ${filter.name} - ${e.message}`,
        filterName: filter.name,
      })
    }
  }

  return result
}

export function renderNode(node, context, filterRegistry, warnings, usedPaths = new Set()) {
  switch (node.type) {
    case NODE_TYPES.TEXT:
      return node.value

    case NODE_TYPES.VARIABLE: {
      const rawValue = resolvePath(context, node.path)
      usedPaths.add(node.path)

      if (rawValue === undefined) {
        warnings.push({
          type: WARNING_TYPES.MISSING_VARIABLE,
          message: `缺失的变量: ${node.path}`,
          path: node.path,
          line: node.line,
          column: node.column,
        })
      }

      const filteredValue = applyFilters(rawValue, node.filters, filterRegistry, warnings)
      return String(filteredValue ?? '')
    }

    case NODE_TYPES.IF_BLOCK: {
      const conditionValue = resolvePath(context, node.condition)
      usedPaths.add(node.condition)

      if (conditionValue === undefined) {
        warnings.push({
          type: WARNING_TYPES.MISSING_VARIABLE,
          message: `缺失的条件变量: ${node.condition}`,
          path: node.condition,
          line: node.line,
          column: node.column,
        })
      }

      if (!isFalsy(conditionValue)) {
        return renderNodes(node.children, context, filterRegistry, warnings, usedPaths)
      }
      return ''
    }

    case NODE_TYPES.EACH_BLOCK: {
      const list = resolvePath(context, node.listPath)
      usedPaths.add(node.listPath)

      if (list === undefined) {
        warnings.push({
          type: WARNING_TYPES.MISSING_VARIABLE,
          message: `缺失的列表变量: ${node.listPath}`,
          path: node.listPath,
          line: node.line,
          column: node.column,
        })
        return ''
      }

      if (!Array.isArray(list)) {
        warnings.push({
          type: WARNING_TYPES.TYPE_MISMATCH,
          message: `期望数组类型: ${node.listPath}`,
          path: node.listPath,
          expectedType: 'array',
          actualType: typeof list,
          line: node.line,
          column: node.column,
        })
        return ''
      }

      let result = ''
      for (let i = 0; i < list.length; i++) {
        const itemContext = {
          ...context,
          this: list[i],
          '@index': i,
          '@first': i === 0,
          '@last': i === list.length - 1,
        }
        result += renderNodes(node.children, itemContext, filterRegistry, warnings, usedPaths)
      }
      return result
    }

    default:
      return ''
  }
}

export function renderNodes(nodes, context, filterRegistry, warnings, usedPaths = new Set()) {
  let result = ''
  for (const node of nodes) {
    result += renderNode(node, context, filterRegistry, warnings, usedPaths)
  }
  return result
}

export function render(ast, context, customFilters = {}) {
  const warnings = []
  const usedPaths = new Set()
  const filterRegistry = { ...FILTER_REGISTRY, ...customFilters }

  const output = renderNodes(ast.children, context, filterRegistry, warnings, usedPaths)

  const allPaths = collectAllPaths(ast)
  for (const path of allPaths) {
    if (!usedPaths.has(path)) {
      warnings.push({
        type: WARNING_TYPES.UNUSED_VARIABLE,
        message: `未使用的变量: ${path}`,
        path,
      })
    }
  }

  detectTypeMismatches(ast, context, warnings)

  return {
    output,
    warnings,
  }
}

function collectAllPaths(ast) {
  const paths = new Set()

  function traverse(nodes) {
    for (const node of nodes) {
      if (node.type === NODE_TYPES.VARIABLE) {
        paths.add(node.path)
      } else if (node.type === NODE_TYPES.IF_BLOCK) {
        paths.add(node.condition)
        traverse(node.children)
      } else if (node.type === NODE_TYPES.EACH_BLOCK) {
        paths.add(node.listPath)
        traverse(node.children)
      }
    }
  }

  traverse(ast.children)
  return paths
}

function detectTypeMismatches(ast, context, warnings) {
  function traverse(nodes) {
    for (const node of nodes) {
      if (node.type === NODE_TYPES.VARIABLE) {
        const value = resolvePath(context, node.path)
        if (typeof value === 'boolean' && node.filters.length === 0) {
          warnings.push({
            type: WARNING_TYPES.TYPE_MISMATCH,
            message: `布尔值直接作为字符串拼接: ${node.path}`,
            path: node.path,
            line: node.line,
            column: node.column,
          })
        }
      } else if (node.type === NODE_TYPES.IF_BLOCK) {
        traverse(node.children)
      } else if (node.type === NODE_TYPES.EACH_BLOCK) {
        traverse(node.children)
      }
    }
  }

  traverse(ast.children)
}

export function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

export function sanitizeHtml(html, whitelist) {
  return escapeHtml(html)
}
