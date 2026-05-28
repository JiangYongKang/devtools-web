/**
 * 高精度小数运算模块
 * 基于字符串实现，支持 ≥34 位有效数字可配置
 */

export const ROUNDING_MODES = {
  ROUND_HALF_UP: 'ROUND_HALF_UP',
  ROUND_HALF_DOWN: 'ROUND_HALF_DOWN',
  ROUND_HALF_EVEN: 'ROUND_HALF_EVEN',
  ROUND_UP: 'ROUND_UP',
  ROUND_DOWN: 'ROUND_DOWN',
  ROUND_CEILING: 'ROUND_CEILING',
  ROUND_FLOOR: 'ROUND_FLOOR',
}

let DEFAULT_CONFIG = {
  precision: 40,
  scale: 34,
  roundingMode: ROUNDING_MODES.ROUND_HALF_UP,
}

export function setDefaultConfig(config) {
  DEFAULT_CONFIG = { ...DEFAULT_CONFIG, ...config }
}

export function getDefaultConfig() {
  return { ...DEFAULT_CONFIG }
}

export class Decimal {
  constructor(value, config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }

    if (value instanceof Decimal) {
      this.significand = value.significand
      this.exponent = value.exponent
      this.isNegative = value.isNegative
      this.isZero = value.isZero
      this.isNaN = value.isNaN
      this.isInfinity = value.isInfinity
      return
    }

    if (typeof value === 'number') {
      if (isNaN(value)) {
        this.isNaN = true
        return
      }
      if (!isFinite(value)) {
        this.isInfinity = true
        this.isNegative = value < 0
        return
      }
      this._fromString(value.toString())
      return
    }

    if (typeof value === 'string') {
      this._fromString(value)
      return
    }

    if (typeof value === 'bigint') {
      this._fromString(value.toString())
      return
    }

    throw new Error(`无法解析 Decimal: ${value}`)
  }

  _fromString(str) {
    str = str.trim().toLowerCase()

    if (str === 'nan') {
      this.isNaN = true
      return
    }
    if (str === 'infinity' || str === '+infinity') {
      this.isInfinity = true
      this.isNegative = false
      return
    }
    if (str === '-infinity') {
      this.isInfinity = true
      this.isNegative = true
      return
    }

    this.isNegative = str.startsWith('-')
    if (this.isNegative || str.startsWith('+')) {
      str = str.slice(1)
    }

    let exponentPart = '0'
    const eIndex = str.indexOf('e')
    if (eIndex !== -1) {
      exponentPart = str.slice(eIndex + 1)
      str = str.slice(0, eIndex)
    }

    let integerPart = str
    let fractionalPart = ''
    const dotIndex = str.indexOf('.')
    if (dotIndex !== -1) {
      integerPart = str.slice(0, dotIndex)
      fractionalPart = str.slice(dotIndex + 1)
    }

    integerPart = integerPart.replace(/^0+/, '') || '0'
    fractionalPart = fractionalPart.replace(/0+$/, '')

    const significandStr = integerPart + fractionalPart
    this.isZero = significandStr === '0' || significandStr === ''

    if (this.isZero) {
      this.significand = '0'
      this.exponent = 0
      this.isNegative = false
      return
    }

    const leadingZeros = significandStr.search(/[^0]/)
    const normalizedSignificand = significandStr.slice(leadingZeros)

    this.significand = normalizedSignificand.slice(0, this.config.precision)
    this.exponent =
      parseInt(exponentPart, 10) + integerPart.length - leadingZeros - 1
  }

  toString() {
    if (this.isNaN) return 'NaN'
    if (this.isInfinity) return this.isNegative ? '-Infinity' : 'Infinity'
    if (this.isZero) return '0'

    let result = this.isNegative ? '-' : ''
    const sig = this.significand

    if (this.exponent >= 0) {
      if (this.exponent < sig.length - 1) {
        result += sig.slice(0, this.exponent + 1) + '.' + sig.slice(this.exponent + 1)
      } else {
        result += sig + '0'.repeat(this.exponent - sig.length + 1)
      }
    } else {
      result += '0.' + '0'.repeat(-this.exponent - 1) + sig
    }

    return result
  }

  toExponential(digits) {
    if (this.isNaN) return 'NaN'
    if (this.isInfinity) return this.isNegative ? '-Infinity' : 'Infinity'
    if (this.isZero) return '0e+0'

    const sig = digits ? this.significand.slice(0, digits) : this.significand
    let result = this.isNegative ? '-' : ''

    if (sig.length > 1) {
      result += sig[0] + '.' + sig.slice(1)
    } else {
      result += sig[0]
    }

    const expSign = this.exponent >= 0 ? '+' : ''
    result += 'e' + expSign + this.exponent

    return result
  }

  toNumber() {
    if (this.isNaN) return NaN
    if (this.isInfinity) return this.isNegative ? -Infinity : Infinity
    return parseFloat(this.toString())
  }

  _clone() {
    const d = new Decimal(0)
    d.config = { ...this.config }
    d.significand = this.significand
    d.exponent = this.exponent
    d.isNegative = this.isNegative
    d.isZero = this.isZero
    d.isNaN = this.isNaN
    d.isInfinity = this.isInfinity
    return d
  }

  negate() {
    const result = this._clone()
    if (!result.isZero && !result.isNaN) {
      result.isNegative = !result.isNegative
    }
    return result
  }

  abs() {
    const result = this._clone()
    result.isNegative = false
    return result
  }

  add(other) {
    const b = new Decimal(other, this.config)

    if (this.isNaN || b.isNaN) return new Decimal(NaN)
    if (this.isInfinity || b.isInfinity) {
      if (this.isInfinity && b.isInfinity && this.isNegative !== b.isNegative) {
        return new Decimal(NaN)
      }
      if (this.isInfinity) return this._clone()
      return b
    }

    if (this.isZero) return b._clone()
    if (b.isZero) return this._clone()

    const aScale = this.exponent - this.significand.length + 1
    const bScale = b.exponent - b.significand.length + 1
    const minScale = Math.min(aScale, bScale)

    const aShift = aScale - minScale
    const bShift = bScale - minScale

    const aAligned = this.significand + '0'.repeat(aShift)
    const bAligned = b.significand + '0'.repeat(bShift)

    const maxLen = Math.max(aAligned.length, bAligned.length)
    const aPadded = aAligned.padStart(maxLen, '0')
    const bPadded = bAligned.padStart(maxLen, '0')

    let resultSig
    let resultNegative

    if (this.isNegative === b.isNegative) {
      resultSig = this._addStrings(aPadded, bPadded)
      resultNegative = this.isNegative
    } else {
      const cmp = this._compareAbsStrings(aPadded, bPadded)
      if (cmp === 0) return new Decimal(0)
      if (cmp > 0) {
        resultSig = this._subStrings(aPadded, bPadded)
        resultNegative = this.isNegative
      } else {
        resultSig = this._subStrings(bPadded, aPadded)
        resultNegative = b.isNegative
      }
    }

    resultSig = resultSig.replace(/^0+/, '') || '0'

    const result = new Decimal(0)
    result.config = { ...this.config }

    if (resultSig === '0') {
      result.significand = '0'
      result.exponent = 0
      result.isZero = true
      result.isNegative = false
    } else {
      result.significand = resultSig
      result.exponent = minScale + resultSig.length - 1
      result.isZero = false
      result.isNegative = resultNegative
    }

    return result._round()
  }

  sub(other) {
    const b = new Decimal(other, this.config)
    return this.add(b.negate())
  }

  mul(other) {
    const b = new Decimal(other, this.config)

    if (this.isNaN || b.isNaN) return new Decimal(NaN)
    if (this.isInfinity || b.isInfinity) {
      if (this.isZero || b.isZero) return new Decimal(NaN)
      const result = new Decimal(Infinity)
      result.isNegative = this.isNegative !== b.isNegative
      return result
    }

    if (this.isZero || b.isZero) return new Decimal(0)

    const product = this._mulStrings(this.significand, b.significand)
    const resultNegative = this.isNegative !== b.isNegative

    const result = new Decimal(0)
    result.config = { ...this.config }

    const productStr = product.replace(/^0+/, '') || '0'
    if (productStr === '0') {
      result.significand = '0'
      result.exponent = 0
      result.isZero = true
      result.isNegative = false
    } else {
      result.significand = productStr
      result.exponent = this.exponent + b.exponent - this.significand.length - b.significand.length + productStr.length + 1
      result.isZero = false
      result.isNegative = resultNegative
    }

    return result._round()
  }

  div(other, scale = this.config.scale) {
    const b = new Decimal(other, this.config)

    if (this.isNaN || b.isNaN) return new Decimal(NaN)
    if (b.isZero) {
      if (this.isZero) return new Decimal(NaN)
      const result = new Decimal(Infinity)
      result.isNegative = this.isNegative !== b.isNegative
      return result
    }
    if (b.isInfinity) {
      if (this.isInfinity) return new Decimal(NaN)
      return new Decimal(0)
    }
    if (this.isInfinity) {
      const result = new Decimal(Infinity)
      result.isNegative = this.isNegative !== b.isNegative
      return result
    }

    if (this.isZero) return new Decimal(0)

    const precision = Math.max(scale + this.config.precision, this.config.precision)
    const padding = precision + 10

    const needsAdjust = this._compareAbsStrings(this.significand, b.significand) < 0
    const extraZero = needsAdjust ? 1 : 0
    const totalPadding = padding + extraZero

    const dividendStr = this.significand + '0'.repeat(extraZero) + '0'.repeat(padding)
    const quotient = this._divStrings(dividendStr, b.significand, totalPadding + this.significand.length)
    const quotientStr = quotient.replace(/^0+/, '') || '0'

    const resultNegative = this.isNegative !== b.isNegative

    const result = new Decimal(0)
    result.config = { ...this.config, scale }

    if (quotientStr === '0') {
      result.significand = '0'
      result.exponent = 0
      result.isZero = true
      result.isNegative = false
    } else {
      result.significand = quotientStr
      result.exponent = (this.exponent - this.significand.length + 1) - (b.exponent - b.significand.length + 1) - totalPadding + quotientStr.length - 1
      result.isZero = false
      result.isNegative = resultNegative
    }

    return result._roundToScale(scale)
  }

  sqrt() {
    if (this.isNaN) return new Decimal(NaN)
    if (this.isNegative) return new Decimal(NaN)
    if (this.isZero) return new Decimal(0)
    if (this.isInfinity) return new Decimal(Infinity)

    const scale = this.config.scale
    const precision = Math.max(scale + this.config.precision, this.config.precision) + 10

    const two = new Decimal(2, { ...this.config, precision, scale })

    let x = this
    for (let i = 0; i < 80; i++) {
      const next = x.add(this.div(x, precision)).div(two, precision)
      const diff = next.sub(x).abs()
      if (diff._isVerySmall()) break
      x = next
    }

    return x._round()._roundToScale(scale)
  }

  compare(other) {
    const b = new Decimal(other, this.config)

    if (this.isNaN || b.isNaN) return NaN
    if (this.isInfinity) return b.isInfinity ? 0 : (this.isNegative ? -1 : 1)
    if (b.isInfinity) return b.isNegative ? 1 : -1
    if (this.isZero && b.isZero) return 0
    if (this.isNegative !== b.isNegative) return this.isNegative ? -1 : 1

    const cmp = this._compareAbs(b)
    return this.isNegative ? -cmp : cmp
  }

  equals(other) {
    return this.compare(other) === 0
  }

  lessThan(other) {
    return this.compare(other) < 0
  }

  greaterThan(other) {
    return this.compare(other) > 0
  }

  _alignExponent(targetExp) {
    const diff = targetExp - this.exponent
    if (diff === 0) return this.significand
    if (diff > 0) return this.significand + '0'.repeat(diff)
    return this.significand.slice(0, diff) || '0'
  }

  _fromSignificandExponent(sig, exp, isNegative) {
    sig = sig.replace(/^0+/, '') || '0'
    this.isZero = sig === '0'

    if (this.isZero) {
      this.significand = '0'
      this.exponent = 0
      this.isNegative = false
      return
    }

    this.significand = sig
    this.exponent = exp + sig.length - 1
    this.isNegative = isNegative
  }

  _addStrings(a, b) {
    let result = ''
    let carry = 0
    let i = a.length - 1
    let j = b.length - 1

    while (i >= 0 || j >= 0 || carry > 0) {
      const sum = carry + (i >= 0 ? parseInt(a[i--], 10) : 0) + (j >= 0 ? parseInt(b[j--], 10) : 0)
      result = (sum % 10) + result
      carry = Math.floor(sum / 10)
    }

    return result
  }

  _subStrings(a, b) {
    let result = ''
    let borrow = 0
    let i = a.length - 1
    let j = b.length - 1

    while (i >= 0 || j >= 0) {
      let digitA = (i >= 0 ? parseInt(a[i--], 10) : 0) - borrow
      const digitB = j >= 0 ? parseInt(b[j--], 10) : 0
      borrow = 0

      if (digitA < digitB) {
        digitA += 10
        borrow = 1
      }

      result = (digitA - digitB) + result
    }

    return result.replace(/^0+/, '') || '0'
  }

  _mulStrings(a, b) {
    const result = Array(a.length + b.length).fill(0)

    for (let i = a.length - 1; i >= 0; i--) {
      for (let j = b.length - 1; j >= 0; j--) {
        const product = parseInt(a[i], 10) * parseInt(b[j], 10)
        const sum = product + result[i + j + 1]
        result[i + j + 1] = sum % 10
        result[i + j] += Math.floor(sum / 10)
      }
    }

    return result.join('').replace(/^0+/, '') || '0'
  }

  _divStrings(a, b, precision) {
    if (b === '0') throw new Error('除零')

    let result = ''
    let remainder = ''
    let i = 0

    while (i < a.length || (remainder !== '0' && result.length < precision)) {
      if (i < a.length) {
        remainder += a[i++]
      } else {
        remainder += '0'
      }

      remainder = remainder.replace(/^0+/, '') || '0'

      let q = 0
      while (this._compareAbsStrings(remainder, b) >= 0) {
        remainder = this._subStrings(remainder, b)
        q++
      }

      result += q
    }

    return result.replace(/^0+/, '') || '0'
  }

  _compareAbsStrings(a, b) {
    a = a.replace(/^0+/, '') || '0'
    b = b.replace(/^0+/, '') || '0'
    if (a.length !== b.length) return a.length - b.length
    for (let i = 0; i < a.length; i++) {
      const diff = parseInt(a[i], 10) - parseInt(b[i], 10)
      if (diff !== 0) return diff
    }
    return 0
  }

  _compareAbs(other) {
    if (this.exponent !== other.exponent) return this.exponent - other.exponent
    const maxLen = Math.max(this.significand.length, other.significand.length)
    const aSig = this.significand.padEnd(maxLen, '0')
    const bSig = other.significand.padEnd(maxLen, '0')
    return this._compareAbsStrings(aSig, bSig)
  }

  _isVerySmall() {
    return this.exponent < -this.config.precision
  }

  _round() {
    if (this.significand.length <= this.config.precision) return this

    const roundDigit = parseInt(this.significand[this.config.precision], 10)
    const hasMore = this.significand.length > this.config.precision + 1 ||
      this.significand.slice(this.config.precision + 1) !== ''

    this.significand = this.significand.slice(0, this.config.precision)

    if (this._shouldRoundUp(roundDigit, hasMore)) {
      this._incrementSignificand()
    }

    return this
  }

  _roundToScale(scale) {
    const str = this.toString()
    const dotIndex = str.indexOf('.')

    if (dotIndex === -1) return this

    const originalNegative = this.isNegative
    const absStr = originalNegative ? str.slice(1) : str
    const absDotIndex = absStr.indexOf('.')

    const integerPart = absStr.slice(0, absDotIndex)
    const decimalPart = absStr.slice(absDotIndex + 1)

    if (decimalPart.length <= scale) return this

    const keepDecimal = decimalPart.slice(0, scale)
    const roundDigit = scale < decimalPart.length
      ? parseInt(decimalPart[scale], 10)
      : 0
    const hasMore = scale + 1 < decimalPart.length && decimalPart.slice(scale + 1) !== '0'.repeat(decimalPart.length - scale - 1)

    let newAbsStr = integerPart
    if (scale > 0) {
      newAbsStr += '.' + keepDecimal
    }

    const temp = new Decimal(originalNegative ? '-' + newAbsStr : newAbsStr, this.config)

    this.significand = temp.significand
    this.exponent = temp.exponent
    this.isNegative = temp.isNegative
    this.isZero = temp.isZero

    const lastKeptDigit = scale > 0
      ? parseInt(keepDecimal[keepDecimal.length - 1], 10)
      : parseInt(integerPart[integerPart.length - 1], 10)

    this.isNegative = originalNegative

    if (this._shouldRoundUp(roundDigit, hasMore, lastKeptDigit)) {
      const incStr = scale > 0
        ? (originalNegative ? '-' : '') + '0.' + '0'.repeat(scale - 1) + '1'
        : (originalNegative ? '-' : '') + '1'
      const increment = new Decimal(incStr, this.config)
      if (originalNegative) {
        const rounded = this.sub(increment.abs())
        this.significand = rounded.significand
        this.exponent = rounded.exponent
        this.isNegative = rounded.isNegative
        this.isZero = rounded.isZero
      } else {
        const rounded = this.add(increment)
        this.significand = rounded.significand
        this.exponent = rounded.exponent
        this.isNegative = rounded.isNegative
        this.isZero = rounded.isZero
      }
    }

    if (this.isZero) this.isNegative = false

    return this
  }

  _shouldRoundUp(roundDigit, hasMore, lastKeptDigit) {
    const mode = this.config.roundingMode

    switch (mode) {
      case ROUNDING_MODES.ROUND_UP:
        return roundDigit > 0 || hasMore
      case ROUNDING_MODES.ROUND_DOWN:
        return false
      case ROUNDING_MODES.ROUND_CEILING:
        return !this.isNegative && (roundDigit > 0 || hasMore)
      case ROUNDING_MODES.ROUND_FLOOR:
        return this.isNegative && (roundDigit > 0 || hasMore)
      case ROUNDING_MODES.ROUND_HALF_DOWN:
        return roundDigit > 5 || (roundDigit === 5 && hasMore)
      case ROUNDING_MODES.ROUND_HALF_EVEN:
        if (roundDigit > 5) return true
        if (roundDigit < 5) return false
        if (hasMore) return true
        const digit = lastKeptDigit !== undefined
          ? lastKeptDigit
          : parseInt(this.significand[this.significand.length - 1], 10)
        return digit % 2 === 1
      case ROUNDING_MODES.ROUND_HALF_UP:
      default:
        return roundDigit >= 5
    }
  }

  _incrementSignificand() {
    const digits = this.significand.split('').map(Number)
    let carry = 1
    for (let i = digits.length - 1; i >= 0 && carry; i--) {
      digits[i] += carry
      if (digits[i] === 10) {
        digits[i] = 0
        carry = 1
      } else {
        carry = 0
      }
    }
    if (carry) {
      digits.unshift(1)
      this.exponent++
    }
    this.significand = digits.join('')
  }
}

export function createDecimal(value, config) {
  return new Decimal(value, config)
}

export function decimalAdd(a, b, config) {
  return new Decimal(a, config).add(b)
}

export function decimalSub(a, b, config) {
  return new Decimal(a, config).sub(b)
}

export function decimalMul(a, b, config) {
  return new Decimal(a, config).mul(b)
}

export function decimalDiv(a, b, scale, config) {
  return new Decimal(a, config).div(b, scale)
}

export function decimalSqrt(a, config) {
  return new Decimal(a, config).sqrt()
}

export function decimalCompare(a, b) {
  return new Decimal(a).compare(b)
}

export function decimalAbs(a, config) {
  return new Decimal(a, config).abs()
}

export function decimalMin(...args) {
  if (args.length === 0) throw new Error('min 需要至少一个参数')
  return args.map(v => new Decimal(v)).reduce((a, b) => (a.lessThan(b) ? a : b))
}

export function decimalMax(...args) {
  if (args.length === 0) throw new Error('max 需要至少一个参数')
  return args.map(v => new Decimal(v)).reduce((a, b) => (a.greaterThan(b) ? a : b))
}
