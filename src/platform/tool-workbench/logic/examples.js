import { EXAMPLE_SIZES, OUTPUT_THRESHOLDS } from './constants.js'
import { ERROR_CODES, createError } from './errors.js'

const SMALL_EXAMPLE_TEXT = `{
  "name": "John Doe",
  "age": 30,
  "email": "john@example.com"
}`

const MEDIUM_EXAMPLE_TEXT = `[
  {
    "id": 1,
    "name": "Product A",
    "price": 29.99,
    "category": "electronics",
    "inStock": true,
    "tags": ["tech", "gadget"]
  },
  {
    "id": 2,
    "name": "Product B",
    "price": 15.50,
    "category": "books",
    "inStock": false,
    "tags": ["reading", "education"]
  },
  {
    "id": 3,
    "name": "Product C",
    "price": 99.99,
    "category": "electronics",
    "inStock": true,
    "tags": ["tech", "premium"]
  }
]`

function generateLargeExampleText(targetSizeBytes = 1024 * 100) {
  const baseLine = '{"index": %d, "value": "lorem ipsum dolor sit amet, consectetur adipiscing elit"},\n'
  const lineSize = baseLine.length
  const lineCount = Math.ceil(targetSizeBytes / lineSize)
  
  let result = '[\n'
  for (let i = 0; i < lineCount; i++) {
    result += baseLine.replace('%d', String(i))
  }
  result = result.slice(0, -2)
  result += '\n]'
  
  return result
}

function getExampleBySize(size) {
  switch (size) {
    case EXAMPLE_SIZES.SMALL:
      return SMALL_EXAMPLE_TEXT
    case EXAMPLE_SIZES.MEDIUM:
      return MEDIUM_EXAMPLE_TEXT
    case EXAMPLE_SIZES.LARGE:
      return generateLargeExampleText()
    default:
      throw createError(ERROR_CODES.INVALID_EXAMPLE_SIZE)
  }
}

function getValidationErrorExample() {
  return `{
  "name": "Invalid JSON",
  "data": {
    "key": "value"
  },
  "broken": [1, 2, 3,
}`
}

function getAllExamples() {
  return {
    [EXAMPLE_SIZES.SMALL]: {
      label: '小文本示例',
      size: '~100 bytes',
      content: SMALL_EXAMPLE_TEXT,
    },
    [EXAMPLE_SIZES.MEDIUM]: {
      label: '中文本示例',
      size: '~500 bytes',
      content: MEDIUM_EXAMPLE_TEXT,
    },
    [EXAMPLE_SIZES.LARGE]: {
      label: '大文本示例',
      size: '~100KB',
      content: generateLargeExampleText(),
    },
  }
}

function getValidationErrorExampleMetadata() {
  return {
    label: '校验错误示例',
    description: '包含故意的 JSON 语法错误，用于测试错误处理',
  }
}

export {
  SMALL_EXAMPLE_TEXT,
  MEDIUM_EXAMPLE_TEXT,
  generateLargeExampleText,
  getExampleBySize,
  getValidationErrorExample,
  getAllExamples,
  getValidationErrorExampleMetadata,
}
