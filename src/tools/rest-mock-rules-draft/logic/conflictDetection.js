import { ERROR_CODES, PATH_MATCH_TYPES } from './constants.js'
import { createError } from './errors.js'

export function pathsOverlap(path1, path1Type, path2, path2Type) {
  if (path1Type === PATH_MATCH_TYPES.EXACT && path2Type === PATH_MATCH_TYPES.EXACT) {
    return path1 === path2
  }

  if (path1Type === PATH_MATCH_TYPES.PREFIX && path2Type === PATH_MATCH_TYPES.PREFIX) {
    return path1.startsWith(path2) || path2.startsWith(path1)
  }

  if (path1Type === PATH_MATCH_TYPES.EXACT && path2Type === PATH_MATCH_TYPES.PREFIX) {
    return path1.startsWith(path2)
  }

  if (path1Type === PATH_MATCH_TYPES.PREFIX && path2Type === PATH_MATCH_TYPES.EXACT) {
    return path2.startsWith(path1)
  }

  if (path1Type === PATH_MATCH_TYPES.REGEX || path2Type === PATH_MATCH_TYPES.REGEX) {
    try {
      const regex1 = path1Type === PATH_MATCH_TYPES.REGEX ? new RegExp(path1) : null
      const regex2 = path2Type === PATH_MATCH_TYPES.REGEX ? new RegExp(path2) : null

      if (regex1 && regex2) {
        const testPaths = [
          '/api/test',
          '/api/users/123',
          '/api/users/123/details',
          '/v1/resource',
          path1,
          path2,
        ]
        for (const testPath of testPaths) {
          try {
            if (regex1.test(testPath) && regex2.test(testPath)) {
              return true
            }
          } catch {
            continue
          }
        }
        return false
      }

      if (regex1 && path2Type === PATH_MATCH_TYPES.EXACT) {
        try {
          return regex1.test(path2)
        } catch {
          return false
        }
      }

      if (regex2 && path1Type === PATH_MATCH_TYPES.EXACT) {
        try {
          return regex2.test(path1)
        } catch {
          return false
        }
      }

      if (regex1 && path2Type === PATH_MATCH_TYPES.PREFIX) {
        try {
          return regex1.test(path2) || path2.length > 0 && regex1.test(path2 + '/test')
        } catch {
          return false
        }
      }

      if (regex2 && path1Type === PATH_MATCH_TYPES.PREFIX) {
        try {
          return regex2.test(path1) || path1.length > 0 && regex2.test(path1 + '/test')
        } catch {
          return false
        }
      }

      return false
    } catch {
      return false
    }
  }

  return false
}

export function methodsOverlap(methods1, methods2) {
  const set1 = new Set(methods1.map((m) => m.toUpperCase()))
  const set2 = new Set(methods2.map((m) => m.toUpperCase()))

  for (const method of set1) {
    if (set2.has(method)) {
      return true
    }
  }
  return false
}

export function rulesConflict(rule1, rule2) {
  const pathOverlap = pathsOverlap(
    rule1.path,
    rule1.pathMatchType,
    rule2.path,
    rule2.pathMatchType
  )

  if (!pathOverlap) {
    return null
  }

  const methodOverlap = methodsOverlap(rule1.methods, rule2.methods)

  if (!methodOverlap) {
    return null
  }

  const overlappingMethods = rule1.methods.filter((m) =>
    rule2.methods.map((x) => x.toUpperCase()).includes(m.toUpperCase())
  )

  return {
    type: ERROR_CODES.CONFLICT_PATH_METHOD,
    ruleIds: [rule1.id, rule2.id],
    ruleNames: [rule1.name || rule1.path, rule2.name || rule2.path],
    overlappingMethods,
    paths: [rule1.path, rule2.path],
    pathMatchTypes: [rule1.pathMatchType, rule2.pathMatchType],
  }
}

export function detectConflicts(rules) {
  const conflicts = []

  if (!Array.isArray(rules) || rules.length < 2) {
    return { hasConflicts: false, conflicts: [] }
  }

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const conflict = rulesConflict(rules[i], rules[j])
      if (conflict) {
        conflicts.push(conflict)
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts: conflicts.map((c) => ({
      ...c,
      error: createError(
        ERROR_CODES.CONFLICT_PATH_METHOD,
        `规则 "${c.ruleNames[0] || c.paths[0]}" 与 "${c.ruleNames[1] || c.paths[1]}" 在路径和方法上存在重叠`,
        {
          ruleIds: c.ruleIds,
          overlappingMethods: c.overlappingMethods,
        }
      ),
    })),
  }
}

export function getRuleConflicts(ruleId, rules) {
  const allConflicts = detectConflicts(rules)
  return allConflicts.conflicts.filter((c) => c.ruleIds.includes(ruleId))
}

export function groupConflictsByRule(conflicts) {
  const grouped = new Map()

  for (const conflict of conflicts) {
    for (const ruleId of conflict.ruleIds) {
      if (!grouped.has(ruleId)) {
        grouped.set(ruleId, [])
      }
      grouped.get(ruleId).push(conflict)
    }
  }

  return grouped
}
