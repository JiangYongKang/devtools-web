import { STORAGE_KEY, DEFAULT_PRESET, MODE, QUERY_HASH_POLICY } from './constants.js'

const BUILTIN_PRESETS = [
  {
    id: 'default',
    name: '默认配置',
    mode: MODE.AUTO_DETECT,
    resolveDotDot: true,
    collapseRepeated: true,
    preserveTrailingSlash: false,
    forceAbsoluteRoot: false,
    stripDefaultPort: true,
    normalizePercentEncoding: true,
    queryHashPolicy: QUERY_HASH_POLICY.PRESERVE,
    rejectTraversal: true,
    rejectDangerousSchemes: true,
    allowFileScheme: false,
    rejectWindowsReserved: true,
    diagnosticMode: false,
  },
  {
    id: 'strict-security',
    name: '严格安全模式',
    mode: MODE.AUTO_DETECT,
    resolveDotDot: true,
    collapseRepeated: true,
    preserveTrailingSlash: false,
    forceAbsoluteRoot: true,
    stripDefaultPort: true,
    normalizePercentEncoding: true,
    queryHashPolicy: QUERY_HASH_POLICY.STRIP,
    rejectTraversal: true,
    rejectDangerousSchemes: true,
    allowFileScheme: false,
    rejectWindowsReserved: true,
    diagnosticMode: true,
  },
  {
    id: 'url-only',
    name: '仅 URL 模式',
    mode: MODE.URL_ONLY,
    resolveDotDot: true,
    collapseRepeated: true,
    preserveTrailingSlash: false,
    forceAbsoluteRoot: false,
    stripDefaultPort: true,
    normalizePercentEncoding: true,
    queryHashPolicy: QUERY_HASH_POLICY.PRESERVE,
    rejectTraversal: true,
    rejectDangerousSchemes: true,
    allowFileScheme: false,
    rejectWindowsReserved: false,
    diagnosticMode: false,
  },
  {
    id: 'posix-compatible',
    name: 'POSIX 兼容',
    mode: MODE.POSIX_ONLY,
    resolveDotDot: true,
    collapseRepeated: true,
    preserveTrailingSlash: false,
    forceAbsoluteRoot: false,
    stripDefaultPort: false,
    normalizePercentEncoding: false,
    queryHashPolicy: QUERY_HASH_POLICY.STRIP,
    rejectTraversal: true,
    rejectDangerousSchemes: false,
    allowFileScheme: false,
    rejectWindowsReserved: false,
    diagnosticMode: false,
  },
  {
    id: 'windows-compatible',
    name: 'Windows 兼容',
    mode: MODE.WINDOWS_ONLY,
    resolveDotDot: true,
    collapseRepeated: true,
    preserveTrailingSlash: false,
    forceAbsoluteRoot: false,
    stripDefaultPort: false,
    normalizePercentEncoding: false,
    queryHashPolicy: QUERY_HASH_POLICY.STRIP,
    rejectTraversal: true,
    rejectDangerousSchemes: false,
    allowFileScheme: false,
    rejectWindowsReserved: true,
    diagnosticMode: false,
  },
]

function isBrowser() {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function loadPresets() {
  const builtin = [...BUILTIN_PRESETS]
  
  if (!isBrowser()) {
    return builtin
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return builtin
    }

    const userPresets = JSON.parse(stored)
    if (Array.isArray(userPresets)) {
      return [...builtin, ...userPresets]
    }
  } catch (err) {
    console.warn('Failed to load presets from localStorage:', err)
  }

  return builtin
}

function saveUserPresets(userPresets) {
  if (!isBrowser()) {
    return false
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userPresets))
    return true
  } catch (err) {
    console.warn('Failed to save presets to localStorage:', err)
    return false
  }
}

function savePreset(preset) {
  const allPresets = loadPresets()
  const builtin = BUILTIN_PRESETS
  let userPresets = allPresets.filter(p => !builtin.some(b => b.id === p.id))

  if (preset.id) {
    const existingIndex = userPresets.findIndex(p => p.id === preset.id)
    if (existingIndex >= 0) {
      userPresets[existingIndex] = { ...preset }
    } else {
      userPresets.push({ ...preset })
    }
  } else {
    const newId = 'user-' + Date.now()
    userPresets.push({ ...preset, id: newId })
  }

  return saveUserPresets(userPresets)
}

function deletePreset(id) {
  const allPresets = loadPresets()
  const builtin = BUILTIN_PRESETS
  const userPresets = allPresets.filter(p => !builtin.some(b => b.id === p.id))
  
  const filtered = userPresets.filter(p => p.id !== id)
  return saveUserPresets(filtered)
}

function getPresetById(id) {
  const presets = loadPresets()
  return presets.find(p => p.id === id)
}

function validatePreset(preset) {
  const errors = []

  if (!preset.name || !preset.name.trim()) {
    errors.push('预设名称不能为空')
  }

  if (!Object.values(MODE).includes(preset.mode)) {
    errors.push('无效的模式选择')
  }

  if (!Object.values(QUERY_HASH_POLICY).includes(preset.queryHashPolicy)) {
    errors.push('无效的 query/hash 策略')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

export {
  BUILTIN_PRESETS,
  loadPresets,
  savePreset,
  deletePreset,
  getPresetById,
  validatePreset,
  DEFAULT_PRESET,
}
