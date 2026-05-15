const ERROR_CODES = {
  INVALID_INPUT: 'InvalidInput',
  INVALID_CURRENCY: 'InvalidCurrency',
  AMBIGUOUS_DATE: 'AmbiguousDate',
  INVALID_RATIO: 'InvalidRatio',
  SCIENTIFIC_NOTATION_REJECTED: 'ScientificNotationRejected',
  PARSING_FAILED: 'ParsingFailed',
  OUT_OF_RANGE: 'OutOfRange',
}

const WARNING_CODES = {
  CURRENCY_GUESSED: 'CurrencyGuessed',
  FRACTION_APPROXIMATED: 'FractionApproximated',
  DATE_AMBIGUITY_RESOLVED: 'DateAmbiguityResolved',
  NEGATIVE_BRACKET_NOTATION: 'NegativeBracketNotation',
  THOUSAND_SEPARATOR_DETECTED: 'ThousandSeparatorDetected',
  DST_BOUNDARY: 'DstBoundary',
}

const CURRENCY_MINOR_UNITS = {
  USD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  CNY: 2,
  KRW: 0,
  INR: 2,
}

const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CNY', 'KRW', 'INR']

const CURRENCY_SYMBOLS = {
  '$': 'USD',
  '€': 'EUR',
  '£': 'GBP',
  '¥': 'JPY',
  '￥': 'CNY',
  '₩': 'KRW',
  '₹': 'INR',
}

const DATE_PARSING_STRATEGIES = {
  DAY_FIRST: 'dayFirst',
  MONTH_FIRST: 'monthFirst',
  ASK_USER: 'askUser',
}

const ROUNDING_MODES = {
  BANKERS: 'bankers',
  HALF_UP: 'halfUp',
}

const RATIO_SYMBOLS = {
  '%': 0.01,
  '‰': 0.001,
}

const SCHEMA_VERSION = '1.0.0'

export {
  ERROR_CODES,
  WARNING_CODES,
  CURRENCY_MINOR_UNITS,
  COMMON_CURRENCIES,
  CURRENCY_SYMBOLS,
  DATE_PARSING_STRATEGIES,
  ROUNDING_MODES,
  RATIO_SYMBOLS,
  SCHEMA_VERSION,
}
