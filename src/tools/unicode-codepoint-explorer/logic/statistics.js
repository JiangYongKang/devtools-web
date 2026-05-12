import { isSurrogate } from './parser.js'

const GENERAL_CATEGORY_MAP = {
  'Lu': 'Letter, Uppercase',
  'Ll': 'Letter, Lowercase',
  'Lt': 'Letter, Titlecase',
  'Lm': 'Letter, Modifier',
  'Lo': 'Letter, Other',
  'Mn': 'Mark, Nonspacing',
  'Mc': 'Mark, Spacing Combining',
  'Me': 'Mark, Enclosing',
  'Nd': 'Number, Decimal Digit',
  'Nl': 'Number, Letter',
  'No': 'Number, Other',
  'Pc': 'Punctuation, Connector',
  'Pd': 'Punctuation, Dash',
  'Ps': 'Punctuation, Open',
  'Pe': 'Punctuation, Close',
  'Pi': 'Punctuation, Initial quote',
  'Pf': 'Punctuation, Final quote',
  'Po': 'Punctuation, Other',
  'Sm': 'Symbol, Math',
  'Sc': 'Symbol, Currency',
  'Sk': 'Symbol, Modifier',
  'So': 'Symbol, Other',
  'Zs': 'Separator, Space',
  'Zl': 'Separator, Line',
  'Zp': 'Separator, Paragraph',
  'Cc': 'Other, Control',
  'Cf': 'Other, Format',
  'Cs': 'Other, Surrogate',
  'Co': 'Other, Private Use',
  'Cn': 'Other, Not Assigned',
}

const BIDI_CLASS_MAP = {
  'L': 'Left-to-Right',
  'R': 'Right-to-Left',
  'AL': 'Arabic Letter',
  'AN': 'Arabic Number',
  'EN': 'European Number',
  'ES': 'European Number Separator',
  'ET': 'European Number Terminator',
  'CS': 'Common Number Separator',
  'NSM': 'Nonspacing Mark',
  'BN': 'Boundary Neutral',
  'B': 'Paragraph Separator',
  'S': 'Segment Separator',
  'WS': 'Whitespace',
  'ON': 'Other Neutrals',
  'LRE': 'Left-to-Right Embedding',
  'LRO': 'Left-to-Right Override',
  'RLE': 'Right-to-Left Embedding',
  'RLO': 'Right-to-Left Override',
  'PDF': 'Pop Directional Format',
  'LRI': 'Left-to-Right Isolate',
  'RLI': 'Right-to-Left Isolate',
  'FSI': 'First Strong Isolate',
  'PDI': 'Pop Directional Isolate',
}

function isAscii(codePoint) {
  return codePoint >= 0x00 && codePoint <= 0x7F
}

function isPrintableAscii(codePoint) {
  return codePoint >= 0x20 && codePoint <= 0x7E
}

function getCategoryDescription(category) {
  return GENERAL_CATEGORY_MAP[category] || category || 'Unknown'
}

function getBidiClassDescription(bidiClass) {
  return BIDI_CLASS_MAP[bidiClass] || bidiClass || 'Unknown'
}

function calculateStatistics(scalars, codePoints) {
  const totalCount = codePoints.length
  let asciiCount = 0
  let nonAsciiCount = 0
  let bmpCount = 0
  let supplementaryCount = 0
  let surrogateCount = 0
  let printableCount = 0
  let controlCount = 0
  
  const categoryCounts = {}
  const blockCounts = {}
  
  codePoints.forEach((codePoint, index) => {
    if (isAscii(codePoint)) {
      asciiCount++
      if (isPrintableAscii(codePoint)) {
        printableCount++
      } else if (codePoint < 0x20 || codePoint === 0x7F) {
        controlCount++
      }
    } else {
      nonAsciiCount++
    }
    
    if (codePoint <= 0xFFFF) {
      bmpCount++
      if (isSurrogate(codePoint)) {
        surrogateCount++
      }
    } else {
      supplementaryCount++
    }
    
    const scalar = scalars[index]
    if (scalar) {
      if (scalar.category) {
        categoryCounts[scalar.category] = (categoryCounts[scalar.category] || 0) + 1
      }
      if (scalar.block) {
        blockCounts[scalar.block] = (blockCounts[scalar.block] || 0) + 1
      }
    }
  })
  
  const segments = []
  let currentSegment = null
  
  codePoints.forEach((codePoint, index) => {
    const isAsciiChar = isAscii(codePoint)
    if (!currentSegment || currentSegment.isAscii !== isAsciiChar) {
      if (currentSegment) {
        segments.push(currentSegment)
      }
      currentSegment = {
        startIndex: index,
        endIndex: index,
        isAscii: isAsciiChar,
        length: 1,
      }
    } else {
      currentSegment.endIndex = index
      currentSegment.length++
    }
  })
  
  if (currentSegment) {
    segments.push(currentSegment)
  }
  
  const topCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count, description: getCategoryDescription(category) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
  const topBlocks = Object.entries(blockCounts)
    .map(([block, count]) => ({ block, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  
  return {
    totalCount,
    asciiCount,
    nonAsciiCount,
    bmpCount,
    supplementaryCount,
    surrogateCount,
    printableCount,
    controlCount,
    asciiPercentage: totalCount > 0 ? (asciiCount / totalCount * 100).toFixed(1) : '0.0',
    nonAsciiPercentage: totalCount > 0 ? (nonAsciiCount / totalCount * 100).toFixed(1) : '0.0',
    segments,
    topCategories,
    topBlocks,
  }
}

export {
  GENERAL_CATEGORY_MAP,
  BIDI_CLASS_MAP,
  isAscii,
  isPrintableAscii,
  getCategoryDescription,
  getBidiClassDescription,
  calculateStatistics,
}
