const flattenObject = (obj, prefix = '') => {
  const result = {}

  Object.keys(obj).forEach((key) => {
    const prefixedKey = prefix ? `${prefix}.${key}` : key
    const value = obj[key]

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, prefixedKey))
    } else {
      result[prefixedKey] = value
    }
  })

  return result
}

const unflattenObject = (flattened) => {
  const result = {}

  Object.keys(flattened).forEach((key) => {
    const keys = key.split('.')
    let current = result

    keys.forEach((k, index) => {
      if (index === keys.length - 1) {
        current[k] = flattened[key]
      } else {
        current[k] = current[k] || {}
        current = current[k]
      }
    })
  })

  return result
}

const computeFieldDiff = (local, remote, base) => {
  const localFlat = flattenObject(local)
  const remoteFlat = flattenObject(remote)
  const baseFlat = flattenObject(base || {})

  const allKeys = new Set([
    ...Object.keys(localFlat),
    ...Object.keys(remoteFlat),
    ...Object.keys(baseFlat),
  ])

  const changes = []
  const conflicts = []

  allKeys.forEach((key) => {
    const localValue = localFlat[key]
    const remoteValue = remoteFlat[key]
    const baseValue = baseFlat[key]

    const localChanged = JSON.stringify(localValue) !== JSON.stringify(baseValue)
    const remoteChanged = JSON.stringify(remoteValue) !== JSON.stringify(baseValue)

    if (localChanged && !remoteChanged) {
      changes.push({
        key,
        type: 'local_only',
        local: localValue,
        remote: remoteValue,
        base: baseValue,
      })
    } else if (!localChanged && remoteChanged) {
      changes.push({
        key,
        type: 'remote_only',
        local: localValue,
        remote: remoteValue,
        base: baseValue,
      })
    } else if (localChanged && remoteChanged) {
      const localEqualsRemote = JSON.stringify(localValue) === JSON.stringify(remoteValue)
      if (!localEqualsRemote) {
        conflicts.push({
          key,
          type: 'conflict',
          local: localValue,
          remote: remoteValue,
          base: baseValue,
        })
      }
    }
  })

  return {
    changes,
    conflicts,
    hasConflicts: conflicts.length > 0,
  }
}

const mergeFields = (local, remote, diffResult, resolution = {}) => {
  const localFlat = flattenObject(local)
  const remoteFlat = flattenObject(remote)
  const merged = {}

  const allKeys = new Set([...Object.keys(localFlat), ...Object.keys(remoteFlat)])

  allKeys.forEach((key) => {
    if (resolution[key] === 'local') {
      merged[key] = localFlat[key]
    } else if (resolution[key] === 'remote') {
      merged[key] = remoteFlat[key]
    } else {
      const localValue = localFlat[key]
      const remoteValue = remoteFlat[key]

      if (localValue === undefined) {
        merged[key] = remoteValue
      } else if (remoteValue === undefined) {
        merged[key] = localValue
      } else if (JSON.stringify(localValue) === JSON.stringify(remoteValue)) {
        merged[key] = localValue
      } else {
        merged[key] = localValue
      }
    }
  })

  return unflattenObject(merged)
}

const lcs = (a, b) => {
  const m = a.length
  const n = b.length
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  const result = []
  let i = m
  let j = n

  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1])
      i--
      j--
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--
    } else {
      j--
    }
  }

  return result
}

const computeStringDiff = (oldStr, newStr) => {
  if (oldStr === newStr) return []

  const oldChars = oldStr.split('')
  const newChars = newStr.split('')

  const commonSequence = lcs(oldChars, newChars)

  const operations = []
  let oldIndex = 0
  let newIndex = 0
  let commonIndex = 0

  while (oldIndex < oldChars.length || newIndex < newChars.length) {
    if (
      commonIndex < commonSequence.length &&
      oldChars[oldIndex] === commonSequence[commonIndex] &&
      newChars[newIndex] === commonSequence[commonIndex]
    ) {
      operations.push({ type: 'equal', value: commonSequence[commonIndex] })
      oldIndex++
      newIndex++
      commonIndex++
    } else if (
      commonIndex < commonSequence.length &&
      oldChars[oldIndex] === commonSequence[commonIndex]
    ) {
      operations.push({ type: 'insert', value: newChars[newIndex] })
      newIndex++
    } else if (
      commonIndex < commonSequence.length &&
      newChars[newIndex] === commonSequence[commonIndex]
    ) {
      operations.push({ type: 'delete', value: oldChars[oldIndex] })
      oldIndex++
    } else {
      if (oldIndex < oldChars.length) {
        operations.push({ type: 'delete', value: oldChars[oldIndex] })
        oldIndex++
      }
      if (newIndex < newChars.length) {
        operations.push({ type: 'insert', value: newChars[newIndex] })
        newIndex++
      }
    }
  }

  return operations
}

const formatStringDiff = (operations, highlightConflicts = false) => {
  let result = ''

  operations.forEach((op) => {
    switch (op.type) {
      case 'equal':
        result += op.value
        break
      case 'insert':
        result += highlightConflicts
          ? `<span class="diff-insert">${op.value}</span>`
          : op.value
        break
      case 'delete':
        result += highlightConflicts
          ? `<span class="diff-delete">${op.value}</span>`
          : ''
        break
    }
  })

  return result
}

const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(deepClone)
  const cloned = {}
  Object.keys(obj).forEach((key) => {
    cloned[key] = deepClone(obj[key])
  })
  return cloned
}

const isEqual = (a, b) => {
  return JSON.stringify(a) === JSON.stringify(b)
}

export {
  flattenObject,
  unflattenObject,
  computeFieldDiff,
  mergeFields,
  lcs,
  computeStringDiff,
  formatStringDiff,
  deepClone,
  isEqual,
}
