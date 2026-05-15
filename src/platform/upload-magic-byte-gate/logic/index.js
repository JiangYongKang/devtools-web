export * from './constants.js'
export * from './errors.js'
export * from './magicNumbers.js'
export * from './mimeData.js'
export * from './validation.js'
export * from './fileHandling.js'

import { registerMagicRule, unregisterMagicRule, clearCustomRules } from './magicNumbers.js'
import { processSingleFile, processMultipleFiles, readFileHeader } from './fileHandling.js'
import { bytesToHexString, hexToAscii } from './magicNumbers.js'

const MagicGate = {
  registerMagicRule,
  unregisterMagicRule,
  clearCustomRules,
  processSingleFile,
  processMultipleFiles,
  readFileHeader,
  bytesToHexString,
  hexToAscii,
}

export { MagicGate }
