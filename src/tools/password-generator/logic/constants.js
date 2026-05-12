const UPPERCASE_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE_LETTERS = 'abcdefghijklmnopqrstuvwxyz'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?'

const CONFUSING_CHARACTERS = '0O1lI'
const HOMOGLYPHS = {
  '0': ['O', 'o'],
  'O': ['0', 'o'],
  'o': ['0', 'O'],
  '1': ['l', 'I'],
  'l': ['1', 'I'],
  'I': ['1', 'l'],
  '2': ['Z', 'z'],
  'Z': ['2', 'z'],
  'z': ['2', 'Z'],
  '5': ['S', 's'],
  'S': ['5', 's'],
  's': ['5', 'S'],
  '8': ['B'],
  'B': ['8'],
}

const MIN_PASSWORD_LENGTH = 4
const MAX_PASSWORD_LENGTH = 128
const MIN_BATCH_COUNT = 1
const MAX_BATCH_COUNT = 50
const MAX_TOTAL_OUTPUT_LENGTH = 2048

const CHARACTER_CLASSES = {
  UPPERCASE: 'uppercase',
  LOWERCASE: 'lowercase',
  DIGITS: 'digits',
  SYMBOLS: 'symbols',
}

const CHARACTER_CLASS_LABELS = {
  [CHARACTER_CLASSES.UPPERCASE]: '大写字母',
  [CHARACTER_CLASSES.LOWERCASE]: '小写字母',
  [CHARACTER_CLASSES.DIGITS]: '数字',
  [CHARACTER_CLASSES.SYMBOLS]: '符号',
}

const CHARACTER_CLASS_CHARS = {
  [CHARACTER_CLASSES.UPPERCASE]: UPPERCASE_LETTERS,
  [CHARACTER_CLASSES.LOWERCASE]: LOWERCASE_LETTERS,
  [CHARACTER_CLASSES.DIGITS]: DIGITS,
  [CHARACTER_CLASSES.SYMBOLS]: SYMBOLS,
}

const PRESET_RULES = {
  STRONG: {
    name: '强口令（推荐）',
    description: '16-20位，包含大小写字母、数字和符号',
    minLength: 16,
    maxLength: 20,
    requiredClasses: [
      CHARACTER_CLASSES.UPPERCASE,
      CHARACTER_CLASSES.LOWERCASE,
      CHARACTER_CLASSES.DIGITS,
      CHARACTER_CLASSES.SYMBOLS,
    ],
    optionalClasses: [],
    excludeConfusing: true,
    customExclusions: [],
  },
  MEDIUM: {
    name: '中等强度',
    description: '12-16位，包含大小写字母和数字',
    minLength: 12,
    maxLength: 16,
    requiredClasses: [
      CHARACTER_CLASSES.UPPERCASE,
      CHARACTER_CLASSES.LOWERCASE,
      CHARACTER_CLASSES.DIGITS,
    ],
    optionalClasses: [],
    excludeConfusing: true,
    customExclusions: [],
  },
  SIMPLE: {
    name: '简单易记',
    description: '8-12位，仅包含大小写字母和数字',
    minLength: 8,
    maxLength: 12,
    requiredClasses: [
      CHARACTER_CLASSES.LOWERCASE,
    ],
    optionalClasses: [
      CHARACTER_CLASSES.UPPERCASE,
      CHARACTER_CLASSES.DIGITS,
    ],
    excludeConfusing: true,
    customExclusions: [],
  },
  PIN: {
    name: '纯数字 PIN',
    description: '6-8位纯数字',
    minLength: 6,
    maxLength: 8,
    requiredClasses: [
      CHARACTER_CLASSES.DIGITS,
    ],
    optionalClasses: [],
    excludeConfusing: false,
    customExclusions: [],
  },
  ALPHANUMERIC: {
    name: '字母数字混合',
    description: '10-14位，仅包含字母和数字',
    minLength: 10,
    maxLength: 14,
    requiredClasses: [
      CHARACTER_CLASSES.UPPERCASE,
      CHARACTER_CLASSES.LOWERCASE,
      CHARACTER_CLASSES.DIGITS,
    ],
    optionalClasses: [],
    excludeConfusing: true,
    customExclusions: [],
  },
}

const STRENGTH_LABELS = {
  VERY_WEAK: '极弱',
  WEAK: '弱',
  MEDIUM: '中等',
  STRONG: '强',
  VERY_STRONG: '极强',
}

export {
  UPPERCASE_LETTERS,
  LOWERCASE_LETTERS,
  DIGITS,
  SYMBOLS,
  CONFUSING_CHARACTERS,
  HOMOGLYPHS,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  MIN_BATCH_COUNT,
  MAX_BATCH_COUNT,
  MAX_TOTAL_OUTPUT_LENGTH,
  CHARACTER_CLASSES,
  CHARACTER_CLASS_LABELS,
  CHARACTER_CLASS_CHARS,
  PRESET_RULES,
  STRENGTH_LABELS,
}
