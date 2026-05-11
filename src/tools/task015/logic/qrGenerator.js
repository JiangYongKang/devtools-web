import { ERROR_CODES, createQRError } from './qrErrors.js'
import {
  getMimeType,
  MAX_PIXEL_SIZE,
  MAX_SAFE_OUTPUT_BYTES,
} from './qrParams.js'

function arrayBufferToHex(buffer) {
  const bytes = new Uint8Array(buffer)
  const hexChars = []
  for (let i = 0; i < bytes.length; i++) {
    hexChars.push(bytes[i].toString(16).padStart(2, '0'))
  }
  return hexChars.join('')
}

async function computeSHA256(text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  if (crypto?.subtle) {
    const buffer = await crypto.subtle.digest('SHA-256', data)
    return arrayBufferToHex(buffer)
  }
  return null
}

async function buildMetadata({
  content,
  errorLevel,
  margin,
  moduleSize,
  pixelSize,
  outputFormat,
  outputBytes,
}) {
  const digest = await computeSHA256(content)
  return {
    contentDigest: digest,
    errorLevel,
    margin,
    moduleSize,
    pixelWidth: pixelSize,
    pixelHeight: pixelSize,
    mimeType: getMimeType(outputFormat),
    outputBytes,
  }
}

function validateOutputSize(pixelSize) {
  if (pixelSize > MAX_PIXEL_SIZE) {
    throw createQRError(ERROR_CODES.OUTPUT_TOO_LARGE)
  }
}

function validateOutputBytes(bytes) {
  if (bytes > MAX_SAFE_OUTPUT_BYTES) {
    throw createQRError(ERROR_CODES.OUTPUT_TOO_LARGE)
  }
}

const GF_EXP = new Array(512)
const GF_LOG = new Array(256)

function initGF() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 256) x ^= 0x11d
  }
  for (let i = 255; i < 512; i++) {
    GF_EXP[i] = GF_EXP[i - 255]
  }
}
initGF()

function gfMul(a, b) {
  if (a === 0 || b === 0) return 0
  return GF_EXP[GF_LOG[a] + GF_LOG[b]]
}

function gfPolyMul(p1, p2) {
  const result = new Array(p1.length + p2.length - 1).fill(0)
  for (let i = 0; i < p1.length; i++) {
    for (let j = 0; j < p2.length; j++) {
      result[i + j] ^= gfMul(p1[i], p2[j])
    }
  }
  return result
}

function gfPolyMod(data, generator) {
  const result = data.slice()
  for (let i = 0; i < data.length - generator.length + 1; i++) {
    const coeff = result[i]
    if (coeff !== 0) {
      for (let j = 0; j < generator.length; j++) {
        result[i + j] ^= gfMul(generator[j], coeff)
      }
    }
  }
  return result.slice(-(generator.length - 1))
}

function createGeneratorPoly(degree) {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    poly = gfPolyMul(poly, [1, GF_EXP[i]])
  }
  return poly
}

const CAPACITY_TABLE = {
  L: [19, 34, 55, 80, 108, 136, 156, 194, 232, 274, 324, 370, 428, 461, 523, 589, 647, 721, 795, 861, 932, 1006, 1094, 1174, 1276, 1370, 1468, 1531, 1631, 1735, 1843, 1955, 2071, 2191, 2306, 2434, 2566, 2702, 2812, 2956],
  M: [16, 28, 44, 64, 86, 108, 124, 154, 182, 216, 254, 290, 334, 365, 415, 453, 507, 563, 627, 669, 714, 782, 860, 914, 1000, 1062, 1128, 1193, 1267, 1373, 1455, 1541, 1631, 1725, 1812, 1914, 1992, 2102, 2216, 2334],
  Q: [13, 22, 34, 48, 62, 76, 88, 110, 132, 154, 180, 206, 244, 261, 295, 325, 367, 397, 445, 485, 512, 568, 614, 664, 718, 754, 808, 871, 911, 985, 1033, 1115, 1171, 1231, 1286, 1354, 1426, 1502, 1582, 1666],
  H: [9, 16, 26, 36, 46, 60, 66, 86, 100, 122, 140, 158, 180, 197, 223, 253, 283, 313, 341, 385, 406, 442, 464, 514, 538, 596, 628, 661, 701, 745, 793, 845, 901, 961, 986, 1054, 1096, 1142, 1222, 1276],
}

const EC_CODEWORDS = {
  L: [7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  M: [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  Q: [13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  H: [17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 28, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
}

const EC_BLOCKS = {
  L: [1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 4, 2, 4, 3, 5, 3, 5, 4, 5, 4, 6, 5, 6, 6, 8, 5, 8, 8, 8, 11, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19],
  M: [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  Q: [1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  H: [1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
}

function estimateVersion(content, errorLevel) {
  const byteCount = new TextEncoder().encode(content).length
  const capacities = CAPACITY_TABLE[errorLevel]
  for (let v = 1; v <= 40; v++) {
    if (capacities[v - 1] >= byteCount + 3) {
      return v
    }
  }
  return 40
}

function getTotalCodewords(version) {
  if (version <= 9) return 19 + version * 8
  if (version <= 26) return 35 + version * 6
  return 67 + version * 4
}

function encodeByteMode(data) {
  const bytes = new TextEncoder().encode(data)
  const result = []
  for (const b of bytes) {
    result.push(b)
  }
  return result
}

function padCodewords(data, totalDataCodewords) {
  const padded = data.slice()
  const padBytes = [0xEC, 0x11]
  let padIndex = 0
  while (padded.length < totalDataCodewords) {
    padded.push(padBytes[padIndex % 2])
    padIndex++
  }
  return padded
}

function splitIntoBlocks(codewords, version, errorLevel) {
  const numBlocks = EC_BLOCKS[errorLevel][version - 1]
  const ecPerBlock = EC_CODEWORDS[errorLevel][version - 1]
  const totalCodewords = getTotalCodewords(version)
  const totalDataCodewords = totalCodewords - numBlocks * ecPerBlock

  const shortBlockSize = Math.floor(totalDataCodewords / numBlocks)
  const numLongBlocks = totalDataCodewords % numBlocks

  const blocks = []
  let pos = 0

  for (let i = 0; i < numBlocks; i++) {
    const blockSize = shortBlockSize + (i < numLongBlocks ? 1 : 0)
    blocks.push({
      data: codewords.slice(pos, pos + blockSize),
      ecPerBlock,
    })
    pos += blockSize
  }

  return blocks
}

function computeECBlocks(blocks) {
  return blocks.map(block => {
    const generator = createGeneratorPoly(block.ecPerBlock)
    const ec = gfPolyMod(block.data, generator)
    return {
      ...block,
      ec,
    }
  })
}

function interleaveBlocks(ecBlocks) {
  const dataResult = []
  const ecResult = []

  const maxDataLen = Math.max(...ecBlocks.map(b => b.data.length))
  const ecLen = ecBlocks[0].ec.length

  for (let i = 0; i < maxDataLen; i++) {
    for (const block of ecBlocks) {
      if (i < block.data.length) {
        dataResult.push(block.data[i])
      }
    }
  }

  for (let i = 0; i < ecLen; i++) {
    for (const block of ecBlocks) {
      ecResult.push(block.ec[i])
    }
  }

  return [...dataResult, ...ecResult]
}

function codewordsToBits(codewords) {
  let bits = ''
  for (const cw of codewords) {
    bits += cw.toString(2).padStart(8, '0')
  }
  return bits
}

function createEmptyMatrix(version) {
  const size = (version - 1) * 4 + 21
  const matrix = Array(size).fill(null).map(() => Array(size).fill(null))
  return matrix
}

function placeFinderPatterns(matrix) {
  const size = matrix.length
  const positions = [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ]

  for (const [startX, startY] of positions) {
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        const isOuter = y === 0 || y === 6 || x === 0 || x === 6
        const isInner = (y >= 2 && y <= 4 && x >= 2 && x <= 4)
        matrix[startY + y][startX + x] = isOuter || isInner ? 1 : 0
      }
    }
    if (startX === 0) {
      for (let i = 0; i < 8; i++) {
        if (startY + 7 < size) matrix[startY + 7][i] = 0
      }
    }
    if (startY === 0) {
      for (let i = 0; i < 8; i++) {
        if (startX + 7 < size) matrix[i][startX + 7] = 0
      }
    }
    if (startX + 7 < size && startY + 7 < size) {
      matrix[startY + 7][startX + 7] = 0
    }
  }
}

function placeAlignmentPatterns(matrix, version) {
  if (version < 2) return

  const alignPatternPositions = [
    [], [],
    [6, 18],
    [6, 22],
    [6, 26],
    [6, 30],
    [6, 34],
    [6, 22, 38],
    [6, 24, 42],
    [6, 26, 46],
    [6, 28, 50],
    [6, 30, 54],
    [6, 32, 58],
    [6, 34, 62],
    [6, 26, 46, 66],
    [6, 26, 48, 70],
    [6, 26, 50, 74],
    [6, 30, 54, 78],
    [6, 30, 56, 82],
    [6, 30, 58, 86],
    [6, 34, 62, 90],
    [6, 28, 50, 72, 94],
    [6, 26, 50, 74, 98],
    [6, 30, 54, 78, 102],
    [6, 28, 54, 80, 106],
    [6, 32, 58, 84, 110],
    [6, 30, 58, 86, 114],
    [6, 34, 62, 90, 118],
    [6, 26, 50, 74, 98, 122],
    [6, 30, 54, 78, 102, 126],
    [6, 26, 52, 78, 104, 130],
    [6, 30, 56, 82, 108, 134],
    [6, 34, 60, 86, 112, 138],
    [6, 30, 58, 86, 114, 142],
    [6, 34, 62, 90, 118, 146],
    [6, 30, 54, 78, 102, 126, 150],
    [6, 24, 50, 76, 102, 128, 154],
    [6, 28, 54, 80, 106, 132, 158],
    [6, 32, 58, 84, 110, 136, 162],
    [6, 26, 54, 82, 110, 138, 166],
  ]

  const positions = alignPatternPositions[version] || []

  for (const row of positions) {
    for (const col of positions) {
      if (matrix[row][col] !== null) continue
      if (row <= 6 && col <= 6) continue
      if (row <= 6 && col >= matrix.length - 7) continue
      if (row >= matrix.length - 7 && col <= 6) continue

      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const isOuter = Math.abs(dy) === 2 || Math.abs(dx) === 2
          const isCenter = dy === 0 && dx === 0
          matrix[row + dy][col + dx] = isOuter || isCenter ? 1 : 0
        }
      }
    }
  }
}

function placeTimingPatterns(matrix) {
  const size = matrix.length
  for (let i = 8; i < size - 8; i++) {
    if (matrix[6][i] === null) {
      matrix[6][i] = i % 2 === 0 ? 1 : 0
    }
    if (matrix[i][6] === null) {
      matrix[i][6] = i % 2 === 0 ? 1 : 0
    }
  }
}

function placeFormatInfo(matrix, errorLevel, maskPattern) {
  const size = matrix.length
  const ecLevelBits = { L: '01', M: '00', Q: '11', H: '10' }
  const formatBits = ecLevelBits[errorLevel] + maskPattern.toString(2).padStart(3, '0')

  let g = 0x537
  let poly = 0
  for (let i = 0; i < 5; i++) {
    poly = (poly << 1) | parseInt(formatBits[i], 2)
  }
  poly <<= 10

  for (let i = 4; i >= 0; i--) {
    if ((poly >> (i + 10)) & 1) {
      poly ^= g << i
    }
  }

  let finalBits = ((parseInt(formatBits, 2) << 10) | poly) ^ 0x5412

  const bitString = finalBits.toString(2).padStart(15, '0')

  for (let i = 0; i < 15; i++) {
    const bit = bitString[14 - i] === '1' ? 1 : 0
    if (i < 6) matrix[i][8] = bit
    else if (i < 8) matrix[i + 1][8] = bit
    else matrix[8][size - 15 + i] = bit

    if (i < 8) matrix[8][size - 1 - i] = bit
    else if (i === 8) matrix[8][7] = bit
    else matrix[size - 15 + i][8] = bit
  }

  matrix[size - 8][8] = 1
}

function placeVersionInfo(matrix, version) {
  if (version < 7) return
  const size = matrix.length

  const g = 0x1f25
  let poly = version
  poly <<= 12

  for (let i = 5; i >= 0; i--) {
    if ((poly >> (i + 12)) & 1) {
      poly ^= g << i
    }
  }

  const versionBits = (version << 12) | poly
  const bitString = versionBits.toString(2).padStart(18, '0')

  for (let i = 0; i < 18; i++) {
    const bit = bitString[17 - i] === '1' ? 1 : 0
    const row = Math.floor(i / 3)
    const col = i % 3
    matrix[row][size - 11 + col] = bit
    matrix[size - 11 + col][row] = bit
  }
}

function placeData(matrix, bits) {
  const size = matrix.length
  let bitIndex = 0
  let goingUp = true

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--

    for (let row = 0; row < size; row++) {
      const actualRow = goingUp ? size - 1 - row : row

      for (let c = 0; c < 2; c++) {
        const x = col - c
        if (matrix[actualRow][x] === null) {
          if (bitIndex < bits.length) {
            matrix[actualRow][x] = bits[bitIndex] === '1' ? 1 : 0
          } else {
            matrix[actualRow][x] = 0
          }
          bitIndex++
        }
      }
    }
    goingUp = !goingUp
  }
}

function applyMask(matrix, maskPattern) {
  const size = matrix.length
  const masked = matrix.map(row => [...row])

  const maskFunctions = [
    (i, j) => (i + j) % 2 === 0,
    (i) => i % 2 === 0,
    (i, j) => j % 3 === 0,
    (i, j) => (i + j) % 3 === 0,
    (i, j) => (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0,
    (i, j) => (i * j) % 2 + (i * j) % 3 === 0,
    (i, j) => ((i * j) % 2 + (i * j) % 3) % 2 === 0,
    (i, j) => ((i + j) % 2 + (i * j) % 3) % 2 === 0,
  ]

  const isFixedModule = (row, col) => {
    if (row < 9 && col < 9) return true
    if (row < 9 && col >= size - 8) return true
    if (row >= size - 8 && col < 9) return true
    if (row === 6 || col === 6) return true
    return false
  }

  const maskFn = maskFunctions[maskPattern] || maskFunctions[0]

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!isFixedModule(row, col) && maskFn(row, col)) {
        masked[row][col] = masked[row][col] ^ 1
      }
    }
  }

  return masked
}

function calculatePenalty(matrix) {
  let penalty = 0
  const size = matrix.length

  for (let row = 0; row < size; row++) {
    let runLength = 1
    for (let col = 1; col < size; col++) {
      if (matrix[row][col] === matrix[row][col - 1]) {
        runLength++
      } else {
        if (runLength >= 5) penalty += runLength - 2
        runLength = 1
      }
    }
    if (runLength >= 5) penalty += runLength - 2
  }

  for (let col = 0; col < size; col++) {
    let runLength = 1
    for (let row = 1; row < size; row++) {
      if (matrix[row][col] === matrix[row - 1][col]) {
        runLength++
      } else {
        if (runLength >= 5) penalty += runLength - 2
        runLength = 1
      }
    }
    if (runLength >= 5) penalty += runLength - 2
  }

  const darkCount = matrix.flat().filter(v => v === 1).length
  const percentage = (darkCount / (size * size)) * 100
  const mod = Math.abs(percentage - 50) / 5
  penalty += Math.floor(mod) * 10

  return penalty
}

function generateQRMatrix(content, errorLevel) {
  const version = estimateVersion(content, errorLevel)
  const encoded = encodeByteMode(content)

  const charCount = encoded.length
  const charCountBits = version <= 9 ? 8 : 16

  const totalDataCodewords = getTotalCodewords(version) -
    EC_BLOCKS[errorLevel][version - 1] * EC_CODEWORDS[errorLevel][version - 1]

  let headerBits = '0100'
  headerBits += charCount.toString(2).padStart(charCountBits, '0')

  for (const b of encoded) {
    headerBits += b.toString(2).padStart(8, '0')
  }

  let bitCapacity = totalDataCodewords * 8

  if (headerBits.length + 4 <= bitCapacity) {
    headerBits += '0000'
  } else {
    while (headerBits.length < bitCapacity && headerBits.length < bitCapacity) {
      headerBits += '0'
    }
  }

  while (headerBits.length % 8 !== 0) {
    headerBits += '0'
  }

  const codewords = []
  for (let i = 0; i < headerBits.length; i += 8) {
    codewords.push(parseInt(headerBits.slice(i, i + 8), 2))
  }

  const padded = padCodewords(codewords, totalDataCodewords)
  const blocks = splitIntoBlocks(padded, version, errorLevel)
  const ecBlocks = computeECBlocks(blocks)
  const finalCodewords = interleaveBlocks(ecBlocks)
  const dataBits = codewordsToBits(finalCodewords)

  const matrix = createEmptyMatrix(version)
  placeFinderPatterns(matrix)
  placeAlignmentPatterns(matrix, version)
  placeTimingPatterns(matrix)
  placeVersionInfo(matrix, version)
  placeData(matrix, dataBits)

  let bestMatrix = null
  let bestPenalty = Infinity
  let bestMask = 0

  for (let mask = 0; mask < 8; mask++) {
    const testMatrix = createEmptyMatrix(version)
    placeFinderPatterns(testMatrix)
    placeAlignmentPatterns(testMatrix, version)
    placeTimingPatterns(testMatrix)
    placeVersionInfo(testMatrix, version)
    placeData(testMatrix, dataBits)
    placeFormatInfo(testMatrix, errorLevel, mask)

    const masked = applyMask(testMatrix, mask)
    const penalty = calculatePenalty(masked)

    if (penalty < bestPenalty) {
      bestPenalty = penalty
      bestMatrix = masked
      bestMask = mask
    }
  }

  return { matrix: bestMatrix, version, mask: bestMask }
}

function renderToCanvas(matrix, moduleSize, margin, scale = 1) {
  const matrixSize = matrix.length
  const fullSize = (matrixSize + margin * 2) * moduleSize * scale
  const canvas = document.createElement('canvas')
  canvas.width = fullSize
  canvas.height = fullSize
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, fullSize, fullSize)

  ctx.fillStyle = '#000000'
  const pixelSize = moduleSize * scale
  const offset = margin * moduleSize * scale

  for (let y = 0; y < matrixSize; y++) {
    for (let x = 0; x < matrixSize; x++) {
      if (matrix[y][x] === 1) {
        ctx.fillRect(
          offset + x * pixelSize,
          offset + y * pixelSize,
          pixelSize,
          pixelSize
        )
      }
    }
  }

  return canvas
}

function renderToSVG(matrix, moduleSize, margin) {
  const matrixSize = matrix.length
  const fullSize = (matrixSize + margin * 2) * moduleSize

  let svg = `<?xml version="1.0" encoding="UTF-8"?>`
  svg += `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fullSize} ${fullSize}" width="${fullSize}" height="${fullSize}">`
  svg += `<rect width="${fullSize}" height="${fullSize}" fill="#ffffff"/>`

  const pixelSize = moduleSize
  const offset = margin * moduleSize
  const paths = []

  for (let y = 0; y < matrixSize; y++) {
    for (let x = 0; x < matrixSize; x++) {
      if (matrix[y][x] === 1) {
        const px = offset + x * pixelSize
        const py = offset + y * pixelSize
        paths.push(`M${px},${py}h${pixelSize}v${pixelSize}h-${pixelSize}z`)
      }
    }
  }

  if (paths.length > 0) {
    svg += `<path d="${paths.join('')}" fill="#000000"/>`
  }

  svg += '</svg>'
  return svg
}

export {
  buildMetadata,
  validateOutputSize,
  validateOutputBytes,
  generateQRMatrix,
  renderToCanvas,
  renderToSVG,
  estimateVersion,
}
