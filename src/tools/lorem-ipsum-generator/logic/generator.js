import {
  STANDARD_WORD_POOL,
  STANDARD_SENTENCE_POOL,
  PARAGRAPH_SEPARATION,
} from './constants.js'

class SeededRandom {
  constructor(seed) {
    this.seed = Math.abs(Math.floor(seed))
  }

  next() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0
    return (this.seed >>> 0) / 0xFFFFFFFF
  }

  nextInt(min, max) {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  pickFromArray(arr) {
    return arr[this.nextInt(0, arr.length - 1)]
  }
}

function createRandom(isRandom, seed) {
  if (isRandom) {
    return {
      nextInt: (min, max) => {
        min = Math.ceil(min)
        max = Math.floor(max)
        return Math.floor(Math.random() * (max - min + 1)) + min
      },
      pickFromArray: (arr) => arr[Math.floor(Math.random() * arr.length)],
    }
  }
  const seeded = new SeededRandom(seed)
  return {
    nextInt: (min, max) => seeded.nextInt(min, max),
    pickFromArray: (arr) => seeded.pickFromArray(arr),
  }
}

function countWords(text) {
  if (!text) return 0
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function countCharacters(text, includeSpaces = false) {
  if (!text) return 0
  if (includeSpaces) {
    return text.length
  }
  return text.replace(/\s+/g, '').length
}

function capitalizeWord(word) {
  if (!word) return word
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function generateSentence(rng, minWords = 5, maxWords = 15, startWithLorem = false) {
  const wordCount = rng.nextInt(minWords, maxWords)
  const words = []

  for (let i = 0; i < wordCount; i++) {
    let word = rng.pickFromArray(STANDARD_WORD_POOL)
    if (i === 0) {
      word = capitalizeWord(word)
    }
    words.push(word)
  }

  if (startWithLorem && wordCount >= 2) {
    words[0] = 'Lorem'
    words[1] = 'ipsum'
  }

  let sentence = words.join(' ')

  const endings = ['.', '.', '.', '!', '?']
  sentence += rng.pickFromArray(endings)

  return sentence
}

function generateParagraph(rng, targetWordCount, firstParagraph = false) {
  if (targetWordCount <= 0) return ''

  const sentences = []
  let currentWordCount = 0
  let isFirstSentence = true

  while (currentWordCount < targetWordCount) {
    const remaining = targetWordCount - currentWordCount
    const minWords = Math.max(3, Math.min(5, remaining))
    const maxWords = Math.min(remaining, 15)
    const startWithLorem = firstParagraph && isFirstSentence

    const sentence = generateSentence(rng, minWords, maxWords, startWithLorem)
    const sentenceWordCount = countWords(sentence)

    if (currentWordCount + sentenceWordCount > targetWordCount) {
      const neededWords = targetWordCount - currentWordCount
      const trimmedSentence = trimSentenceToWordCount(sentence, neededWords)
      sentences.push(trimmedSentence)
      currentWordCount = targetWordCount
    } else {
      sentences.push(sentence)
      currentWordCount += sentenceWordCount
    }

    isFirstSentence = false
  }

  return sentences.join(' ')
}

function trimSentenceToWordCount(sentence, targetWordCount) {
  const parts = sentence.match(/[\w']+|[.,!?;]/g) || []
  const words = parts.filter(p => /[a-zA-Z]/.test(p))

  if (words.length <= targetWordCount) {
    return sentence
  }

  const keptWords = words.slice(0, targetWordCount)
  let result = keptWords.join(' ')

  const punctuationMatch = sentence.match(/[.,!?;]$/)
  if (!punctuationMatch) {
    result += '.'
  } else {
    result += punctuationMatch[0]
  }

  return result
}

function generateTitle(rng) {
  const wordCount = rng.nextInt(2, 5)
  const words = []
  for (let i = 0; i < wordCount; i++) {
    let word = rng.pickFromArray(STANDARD_WORD_POOL)
    word = capitalizeWord(word)
    words.push(word)
  }
  return words.join(' ')
}

function joinParagraphs(paragraphs, separationMode, includeTitle = false, title = '') {
  const contentParagraphs = includeTitle ? [title, ...paragraphs] : paragraphs

  switch (separationMode) {
    case PARAGRAPH_SEPARATION.SINGLE_NEWLINE:
      return contentParagraphs.join('\n')
    case PARAGRAPH_SEPARATION.DOUBLE_NEWLINE:
      return contentParagraphs.join('\n\n')
    case PARAGRAPH_SEPARATION.HTML_PARAGRAPH:
      if (includeTitle) {
        const titlePart = `<h1>${title}</h1>`
        const paragraphsPart = paragraphs.map(p => `<p>${p}</p>`).join('\n')
        return [titlePart, paragraphsPart].join('\n')
      }
      return paragraphs.map(p => `<p>${p}</p>`).join('\n')
    default:
      return contentParagraphs.join('\n\n')
  }
}

function buildWordCountStats(text, paragraphs, includeTitle, title, paragraphSeparation) {
  const totalWords = countWords(text)

  const statsParagraphs = includeTitle ? [title, ...paragraphs] : paragraphs
  const wordsPerParagraph = statsParagraphs.map(p => countWords(p))

  return {
    totalWords,
    wordsPerParagraph,
  }
}

function buildCharacterCountStats(text, countMode) {
  const includeSpaces = countMode === 'include-spaces'

  const lines = text.split('\n')
  const charsPerLine = lines.map(line => countCharacters(line, includeSpaces))

  return {
    totalCharacters: countCharacters(text, includeSpaces),
    charactersPerLine: charsPerLine,
    countMode,
  }
}

export {
  SeededRandom,
  createRandom,
  countWords,
  countCharacters,
  capitalizeWord,
  generateSentence,
  generateParagraph,
  trimSentenceToWordCount,
  generateTitle,
  joinParagraphs,
  buildWordCountStats,
  buildCharacterCountStats,
}
