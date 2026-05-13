import {
    COMMIT_EXTRACT_RULES,
    DATE_FORMATS,
    ISSUE_LINK_TEMPLATES,
    ITEM_TYPES,
    MISSING_PLACEHOLDER_STRATEGIES,
    PLACEHOLDER_DOCS,
    TEMPLATES,
    TYPE_ORDER,
} from './constants.js'
import {
    ERROR_CODES,
    MAX_SAFE_ITEMS,
    MAX_SAFE_OUTPUT_SIZE,
    createError,
} from './errors.js'
import {
    addPrefixToItems,
    addPrefixToSelection,
    bumpVersion,
    checkCircularReferences,
    createEmptyItem,
    extractCommitFromText,
    findPlaceholders,
    formatDate,
    generateId,
    groupItemsByType,
    renderItem,
    renderItemsFlat,
    renderSection,
    renderSections,
    renderTemplate,
    reorderItems,
    validateSemVer,
    validateTemplate,
} from './parser.js'

function buildRenderVariables(options = {}) {
  const {
    version = '',
    date = '',
    items = [],
    format = 'simple',
    groupByType = true,
    numbered = false,
    includeEnglish = false,
    issueLinkTemplate = null,
  } = options

  const variables = {
    version,
    date,
  }

  if (groupByType) {
    variables.sections = renderSections(items, {
      format,
      numbered,
      includeEnglish,
      issueLinkTemplate,
    })
    variables.items = renderItemsFlat(items, {
      format,
      numbered,
      includeEnglish,
      issueLinkTemplate,
    })
  } else {
    variables.items = renderItemsFlat(items, {
      format,
      numbered,
      includeEnglish,
      issueLinkTemplate,
    })
    variables.sections = variables.items
  }

  return variables
}

function generateChangelogDraft(options = {}) {
  const {
    template,
    version,
    date,
    items,
    format = 'simple',
    groupByType = true,
    numbered = false,
    includeEnglish = false,
    issueLinkTemplate = null,
    missingPlaceholderStrategy = 'empty',
  } = options

  if (items.length > MAX_SAFE_ITEMS) {
    return {
      valid: false,
      errorCode: ERROR_CODES.TOO_MANY_ITEMS,
      error: createError(ERROR_CODES.TOO_MANY_ITEMS, { actual: items.length, max: MAX_SAFE_ITEMS }),
      output: null,
      previewOnly: false,
    }
  }

  const variables = buildRenderVariables({
    version,
    date,
    items,
    format,
    groupByType,
    numbered,
    includeEnglish,
    issueLinkTemplate,
  })

  const result = renderTemplate(template, variables, {
    missingPlaceholderStrategy,
  })

  return {
    ...result,
    previewOnly: false,
  }
}

function validateInput(options = {}) {
  const {
    template,
    version,
    items,
  } = options

  const errors = []

  const templateResult = validateTemplate(template)
  if (!templateResult.valid) {
    errors.push(templateResult)
  }

  if (version && !validateSemVer(version)) {
    errors.push({
      errorCode: ERROR_CODES.INVALID_VERSION,
      error: createError(ERROR_CODES.INVALID_VERSION),
    })
  }

  if (items.length > MAX_SAFE_ITEMS) {
    errors.push({
      errorCode: ERROR_CODES.TOO_MANY_ITEMS,
      error: createError(ERROR_CODES.TOO_MANY_ITEMS, { actual: items.length, max: MAX_SAFE_ITEMS }),
    })
  }

  const totalSize = items.reduce((sum, item) => {
    return sum + (item.content?.length || 0) + (item.contentEn?.length || 0)
  }, 0)

  if (totalSize > MAX_SAFE_OUTPUT_SIZE) {
    errors.push({
      errorCode: ERROR_CODES.INPUT_TOO_LARGE,
      error: createError(ERROR_CODES.INPUT_TOO_LARGE, { actual: totalSize, max: MAX_SAFE_OUTPUT_SIZE }),
    })
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function getTypeInfo(typeId) {
  return ITEM_TYPES.find(t => t.id === typeId) || ITEM_TYPES[ITEM_TYPES.length - 1]
}

function getDefaultTemplate(templateId = 'keepachangelog') {
  return TEMPLATES[templateId] || TEMPLATES.keepachangelog
}

function getDateFormat(formatId = 'local') {
  return DATE_FORMATS.find(f => f.id === formatId) || DATE_FORMATS[0]
}

function getMissingPlaceholderStrategy(strategyId = 'empty') {
  return MISSING_PLACEHOLDER_STRATEGIES.find(s => s.id === strategyId) || MISSING_PLACEHOLDER_STRATEGIES[0]
}

export {
    COMMIT_EXTRACT_RULES, DATE_FORMATS, ERROR_CODES, ISSUE_LINK_TEMPLATES, ITEM_TYPES, MAX_SAFE_ITEMS,
    MAX_SAFE_OUTPUT_SIZE, MISSING_PLACEHOLDER_STRATEGIES, PLACEHOLDER_DOCS, TEMPLATES, TYPE_ORDER, addPrefixToItems,
    addPrefixToSelection,
    buildRenderVariables, bumpVersion, checkCircularReferences, createEmptyItem, extractCommitFromText, findPlaceholders, formatDate, generateChangelogDraft, generateId, getDateFormat, getDefaultTemplate, getMissingPlaceholderStrategy, getTypeInfo, groupItemsByType,
    renderItem, renderItemsFlat, renderSection,
    renderSections, renderTemplate, reorderItems, validateInput, validateSemVer, validateTemplate
}

