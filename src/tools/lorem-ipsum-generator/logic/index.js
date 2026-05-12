import {
  GENERATION_MODES,
  PARAGRAPH_SEPARATION,
  COUNT_MODES,
  SEED_MODES,
  MIN_PARAGRAPHS,
  MAX_PARAGRAPHS,
  MIN_WORDS_PER_PARAGRAPH,
  MAX_WORDS_PER_PARAGRAPH,
  MIN_TOTAL_WORDS,
  MAX_TOTAL_WORDS,
  MAX_PRODUCT,
  EXAMPLES,
} from './constants.js'
import {
  ERROR_CODES,
  createError,
} from './errors.js'
import {
  createRandom,
  countWords,
  countCharacters,
  generateParagraph,
  generateTitle,
  joinParagraphs,
  buildWordCountStats,
  buildCharacterCountStats,
} from './generator.js'

function validateParams(params) {
  const errors = []

  if (!params.mode || !Object.values(GENERATION_MODES).includes(params.mode)) {
    errors.push({
      code: ERROR_CODES.INVALID_GENERATION_MODE,
      error: createError(ERROR_CODES.INVALID_GENERATION_MODE),
    })
  }

  if (!Object.values(PARAGRAPH_SEPARATION).includes(params.paragraphSeparation)) {
    errors.push({
      code: ERROR_CODES.INVALID_SEPARATION_MODE,
      error: createError(ERROR_CODES.INVALID_SEPARATION_MODE),
    })
  }

  if (params.mode === GENERATION_MODES.BY_PARAGRAPHS) {
    const paragraphCount = Number(params.paragraphCount)
    const wordsPerParagraph = Number(params.wordsPerParagraph)

    if (isNaN(paragraphCount) || paragraphCount < MIN_PARAGRAPHS || paragraphCount > MAX_PARAGRAPHS) {
      errors.push({
        code: ERROR_CODES.PARAGRAPH_COUNT_OUT_OF_RANGE,
        error: createError(ERROR_CODES.PARAGRAPH_COUNT_OUT_OF_RANGE, {
          min: MIN_PARAGRAPHS,
          max: MAX_PARAGRAPHS,
          actual: params.paragraphCount,
        }),
      })
    }

    if (isNaN(wordsPerParagraph) || wordsPerParagraph < MIN_WORDS_PER_PARAGRAPH || wordsPerParagraph > MAX_WORDS_PER_PARAGRAPH) {
      errors.push({
        code: ERROR_CODES.WORDS_PER_PARAGRAPH_OUT_OF_RANGE,
        error: createError(ERROR_CODES.WORDS_PER_PARAGRAPH_OUT_OF_RANGE, {
          min: MIN_WORDS_PER_PARAGRAPH,
          max: MAX_WORDS_PER_PARAGRAPH,
          actual: params.wordsPerParagraph,
        }),
      })
    }

    if (errors.length === 0 && paragraphCount * wordsPerParagraph > MAX_PRODUCT) {
      errors.push({
        code: ERROR_CODES.PRODUCT_EXCEEDS_LIMIT,
        error: createError(ERROR_CODES.PRODUCT_EXCEEDS_LIMIT, {
          max: MAX_PRODUCT,
          product: paragraphCount * wordsPerParagraph,
        }),
      })
    }
  } else if (params.mode === GENERATION_MODES.BY_WORD_COUNT) {
    const totalWords = Number(params.totalWords)

    if (isNaN(totalWords) || totalWords < MIN_TOTAL_WORDS || totalWords > MAX_TOTAL_WORDS) {
      errors.push({
        code: ERROR_CODES.TOTAL_WORDS_OUT_OF_RANGE,
        error: createError(ERROR_CODES.TOTAL_WORDS_OUT_OF_RANGE, {
          min: MIN_TOTAL_WORDS,
          max: MAX_TOTAL_WORDS,
          actual: params.totalWords,
        }),
      })
    }
  }

  if (params.seedMode === SEED_MODES.FIXED && params.seed !== undefined) {
    const seed = Number(params.seed)
    if (isNaN(seed) || !isFinite(seed)) {
      errors.push({
        code: ERROR_CODES.INVALID_SEED,
        error: createError(ERROR_CODES.INVALID_SEED, { actual: params.seed }),
      })
    }
  }

  return errors
}

function buildParams(params) {
  return {
    mode: params.mode ?? GENERATION_MODES.BY_PARAGRAPHS,
    paragraphCount: params.paragraphCount ?? 3,
    wordsPerParagraph: params.wordsPerParagraph ?? 50,
    totalWords: params.totalWords ?? 200,
    includeTitle: params.includeTitle ?? false,
    paragraphSeparation: params.paragraphSeparation ?? PARAGRAPH_SEPARATION.DOUBLE_NEWLINE,
    countMode: params.countMode ?? COUNT_MODES.EXCLUDE_SPACES,
    seedMode: params.seedMode ?? SEED_MODES.RANDOM,
    seed: params.seed ?? 42,
  }
}

function generateByParagraphs(params) {
  const paragraphCount = Number(params.paragraphCount)
  const wordsPerParagraph = Number(params.wordsPerParagraph)
  const includeTitle = !!params.includeTitle
  const paragraphSeparation = params.paragraphSeparation
  const countMode = params.countMode
  const seedMode = params.seedMode
  const seed = Number(params.seed)

  const isRandom = seedMode === SEED_MODES.RANDOM
  const rng = createRandom(isRandom, seed)

  const paragraphs = []
  for (let i = 0; i < paragraphCount; i++) {
    const isFirst = i === 0
    const paragraph = generateParagraph(rng, wordsPerParagraph, isFirst)
    paragraphs.push(paragraph)
  }

  const title = includeTitle ? generateTitle(rng) : ''

  const text = joinParagraphs(paragraphs, paragraphSeparation, includeTitle, title)
  const wordStats = buildWordCountStats(text, paragraphs, includeTitle, title, paragraphSeparation)
  const charStats = buildCharacterCountStats(text, countMode)

  return {
    text,
    paragraphs,
    title,
    wordStats,
    charStats,
    seed: isRandom ? null : seed,
  }
}

function generateByWordCount(params) {
  const totalWords = Number(params.totalWords)
  const includeTitle = !!params.includeTitle
  const paragraphSeparation = params.paragraphSeparation
  const countMode = params.countMode
  const seedMode = params.seedMode
  const seed = Number(params.seed)

  const isRandom = seedMode === SEED_MODES.RANDOM
  const rng = createRandom(isRandom, seed)

  const title = includeTitle ? generateTitle(rng) : ''
  const titleWordCount = includeTitle ? countWords(title) : 0

  const remainingWords = totalWords - titleWordCount
  if (remainingWords <= 0) {
    const text = joinParagraphs([], paragraphSeparation, includeTitle, title)
    const wordStats = buildWordCountStats(text, [], includeTitle, title, paragraphSeparation)
    const charStats = buildCharacterCountStats(text, countMode)
    return {
      text,
      paragraphs: [],
      title,
      wordStats,
      charStats,
      seed: isRandom ? null : seed,
    }
  }

  const avgWordsPerParagraph = Math.max(20, Math.min(150, Math.floor(remainingWords / 5)))
  const paragraphCount = Math.max(1, Math.ceil(remainingWords / avgWordsPerParagraph))

  const paragraphs = []
  let wordsGenerated = 0

  for (let i = 0; i < paragraphCount; i++) {
    const isLast = i === paragraphCount - 1
    let targetWords

    if (isLast) {
      targetWords = remainingWords - wordsGenerated
    } else {
      const remainingParagraphs = paragraphCount - i
      const remaining = remainingWords - wordsGenerated
      targetWords = Math.floor(remaining / remainingParagraphs)
    }

    const isFirst = i === 0
    const paragraph = generateParagraph(rng, Math.max(1, targetWords), isFirst && !includeTitle)
    paragraphs.push(paragraph)
    wordsGenerated += countWords(paragraph)
  }

  const text = joinParagraphs(paragraphs, paragraphSeparation, includeTitle, title)
  const wordStats = buildWordCountStats(text, paragraphs, includeTitle, title, paragraphSeparation)
  const charStats = buildCharacterCountStats(text, countMode)

  return {
    text,
    paragraphs,
    title,
    wordStats,
    charStats,
    seed: isRandom ? null : seed,
  }
}

function generateLoremIpsum(rawParams) {
  const params = buildParams(rawParams)

  const validationErrors = validateParams(params)
  if (validationErrors.length > 0) {
    const firstError = validationErrors[0]
    return {
      errorCode: firstError.code,
      error: firstError.error,
      result: null,
    }
  }

  let result
  if (params.mode === GENERATION_MODES.BY_PARAGRAPHS) {
    result = generateByParagraphs(params)
  } else {
    result = generateByWordCount(params)
  }

  return {
    errorCode: null,
    error: null,
    result,
  }
}

function getSuggestionForError(errorCode, currentParams) {
  switch (errorCode) {
    case ERROR_CODES.PRODUCT_EXCEEDS_LIMIT: {
      const paragraphs = Number(currentParams.paragraphCount) || 1
      const wordsPerPara = Number(currentParams.wordsPerParagraph) || 1

      const suggestedMaxParagraphs = Math.floor(MAX_PRODUCT / wordsPerPara)
      const suggestedMaxWords = Math.floor(MAX_PRODUCT / paragraphs)

      return {
        reduceParagraphs: suggestedMaxParagraphs < paragraphs ? suggestedMaxParagraphs : null,
        reduceWordsPerParagraph: suggestedMaxWords < wordsPerPara ? suggestedMaxWords : null,
        maxProduct: MAX_PRODUCT,
      }
    }
    case ERROR_CODES.PARAGRAPH_COUNT_OUT_OF_RANGE:
      return {
        min: MIN_PARAGRAPHS,
        max: MAX_PARAGRAPHS,
      }
    case ERROR_CODES.WORDS_PER_PARAGRAPH_OUT_OF_RANGE:
      return {
        min: MIN_WORDS_PER_PARAGRAPH,
        max: MAX_WORDS_PER_PARAGRAPH,
      }
    case ERROR_CODES.TOTAL_WORDS_OUT_OF_RANGE:
      return {
        min: MIN_TOTAL_WORDS,
        max: MAX_TOTAL_WORDS,
      }
    default:
      return null
  }
}

export {
  buildParams,
  validateParams,
  generateByParagraphs,
  generateByWordCount,
  generateLoremIpsum,
  getSuggestionForError,
  countWords,
  countCharacters,
  EXAMPLES,
  GENERATION_MODES,
  PARAGRAPH_SEPARATION,
  COUNT_MODES,
  SEED_MODES,
  MIN_PARAGRAPHS,
  MAX_PARAGRAPHS,
  MIN_WORDS_PER_PARAGRAPH,
  MAX_WORDS_PER_PARAGRAPH,
  MIN_TOTAL_WORDS,
  MAX_TOTAL_WORDS,
  MAX_PRODUCT,
  ERROR_CODES,
}
