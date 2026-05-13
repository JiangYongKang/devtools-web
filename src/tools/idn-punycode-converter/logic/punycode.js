const MAX_INT = 2147483647
const BASE = 36
const T_MIN = 1
const T_MAX = 26
const SKEW = 38
const DAMP = 700
const INITIAL_BIAS = 72
const INITIAL_N = 128
const DELIMITER = 0x2D

function basicToDigit(codePoint) {
  if (codePoint - 48 < 10) {
    return codePoint - 22
  }
  if (codePoint - 65 < 26) {
    return codePoint - 65
  }
  if (codePoint - 97 < 26) {
    return codePoint - 97
  }
  return BASE
}

function digitToBasic(digit, flag) {
  return digit + 22 + 75 * (digit < 26) -
    ((flag !== 0) && (digit < 26) ? 1 : 0) * 32
}

function adapt(delta, numPoints, firstTime) {
  let k = 0
  delta = firstTime ? Math.floor(delta / DAMP) : delta >> 1
  delta += Math.floor(delta / numPoints)
  while (delta > ((BASE - T_MIN) * T_MAX) >> 1) {
    delta = Math.floor(delta / (BASE - T_MIN))
    k += BASE
  }
  return k + Math.floor(((BASE - T_MIN + 1) * delta) / (delta + SKEW))
}

function encode(input) {
  const output = []
  const inputLength = input.length
  let n = INITIAL_N
  let delta = 0
  let bias = INITIAL_BIAS
  let h = 0
  let b = 0
  let j, m, q, k, t, currentValue
  
  const codePoints = []
  for (let i = 0; i < inputLength; i++) {
    const cp = input.codePointAt(i)
    codePoints.push(cp)
    if (cp > 0xFFFF) {
      i++
    }
  }
  
  const inputCodePointsLength = codePoints.length
  
  for (j = 0; j < inputCodePointsLength; j++) {
    currentValue = codePoints[j]
    if (currentValue < 0x80) {
      output.push(String.fromCharCode(currentValue))
      h++
      b++
    }
  }
  
  if (b > 0) {
    output.push(String.fromCharCode(DELIMITER))
  }
  
  while (h < inputCodePointsLength) {
    m = MAX_INT
    for (j = 0; j < inputCodePointsLength; j++) {
      currentValue = codePoints[j]
      if (currentValue >= n && currentValue < m) {
        m = currentValue
      }
    }
    
    if (m - n > Math.floor((MAX_INT - delta) / (h + 1))) {
      throw new Error('Overflow')
    }
    
    delta += (m - n) * (h + 1)
    n = m
    
    for (j = 0; j < inputCodePointsLength; j++) {
      currentValue = codePoints[j]
      
      if (currentValue < n) {
        delta++
        if (delta === 0) {
          throw new Error('Overflow')
        }
      }
      
      if (currentValue === n) {
        q = delta
        for (k = BASE; ; k += BASE) {
          t = k <= bias ? T_MIN : (k >= bias + T_MAX ? T_MAX : k - bias)
          if (q < t) {
            break
          }
          output.push(
            String.fromCharCode(digitToBasic(t + ((q - t) % (BASE - t)), 0))
          )
          q = Math.floor((q - t) / (BASE - t))
        }
        
        output.push(String.fromCharCode(digitToBasic(q, 0)))
        bias = adapt(delta, h + 1, h === b)
        delta = 0
        h++
      }
    }
    
    delta++
    n++
  }
  
  return output.join('')
}

function decode(input) {
  const output = []
  const inputLength = input.length
  let i = 0
  let n = INITIAL_N
  let bias = INITIAL_BIAS
  let j, oldi, w, k, digit, t
  
  let basic = input.lastIndexOf('-')
  if (basic < 0) {
    basic = 0
  }
  
  for (j = 0; j < basic; j++) {
    if (input.charCodeAt(j) >= 0x80) {
      throw new Error('Invalid input')
    }
    output.push(input.charCodeAt(j))
  }
  
  let index = basic > 0 ? basic + 1 : 0
  while (index < inputLength) {
    oldi = i
    w = 1
    for (k = BASE; ; k += BASE) {
      if (index >= inputLength) {
        throw new Error('Invalid input')
      }
      digit = basicToDigit(input.charCodeAt(index++))
      if (digit >= BASE) {
        throw new Error('Invalid input')
      }
      if (digit > Math.floor((MAX_INT - i) / w)) {
        throw new Error('Overflow')
      }
      i += digit * w
      t = k <= bias ? T_MIN : (k >= bias + T_MAX ? T_MAX : k - bias)
      if (digit < t) {
        break
      }
      if (w > Math.floor(MAX_INT / (BASE - t))) {
        throw new Error('Overflow')
      }
      w *= BASE - t
    }
    
    const out = output.length + 1
    bias = adapt(i - oldi, out, oldi === 0)
    
    if (Math.floor(i / out) > MAX_INT - n) {
      throw new Error('Overflow')
    }
    
    n += Math.floor(i / out)
    i %= out
    
    output.splice(i, 0, n)
    i++
  }
  
  return String.fromCodePoint.apply(null, output)
}

export {
  encode,
  decode,
  BASE,
  T_MIN,
  T_MAX,
  SKEW,
  DAMP,
  INITIAL_BIAS,
  INITIAL_N,
  DELIMITER,
}
