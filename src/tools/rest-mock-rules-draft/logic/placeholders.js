import { PLACEHOLDERS, PLACEHOLDER_DESCRIPTIONS } from './constants.js'

export function expandPlaceholders(text) {
  if (typeof text !== 'string') return text

  let result = text

  if (result.includes(PLACEHOLDERS.NOW)) {
    result = result.replaceAll(PLACEHOLDERS.NOW, new Date().toISOString())
  }

  if (result.includes(PLACEHOLDERS.UUID)) {
    result = result.replaceAll(PLACEHOLDERS.UUID, generateUUID())
  }

  return result
}

export function detectPlaceholders(text) {
  if (typeof text !== 'string') return []

  const found = []

  if (text.includes(PLACEHOLDERS.NOW)) {
    found.push({
      placeholder: PLACEHOLDERS.NOW,
      description: PLACEHOLDER_DESCRIPTIONS[PLACEHOLDERS.NOW],
      example: new Date().toISOString(),
    })
  }

  if (text.includes(PLACEHOLDERS.UUID)) {
    found.push({
      placeholder: PLACEHOLDERS.UUID,
      description: PLACEHOLDER_DESCRIPTIONS[PLACEHOLDERS.UUID],
      example: generateUUID(),
    })
  }

  return found
}

export function getAllPlaceholderInfo() {
  return [
    {
      placeholder: PLACEHOLDERS.NOW,
      description: PLACEHOLDER_DESCRIPTIONS[PLACEHOLDERS.NOW],
      example: new Date().toISOString(),
    },
    {
      placeholder: PLACEHOLDERS.UUID,
      description: PLACEHOLDER_DESCRIPTIONS[PLACEHOLDERS.UUID],
      example: generateUUID(),
    },
  ]
}

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function getPlaceholderPreview(text) {
  const placeholders = detectPlaceholders(text)
  if (placeholders.length === 0) {
    return { hasPlaceholders: false, placeholders: [], preview: text }
  }

  const preview = expandPlaceholders(text)

  return {
    hasPlaceholders: true,
    placeholders,
    preview,
  }
}
