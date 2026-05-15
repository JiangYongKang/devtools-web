import { SemVerError, errorMessages } from './errors.js'

/**
 * 解析语义化版本号字符串
 * 支持带 v 前缀、带预发布版本的版本号
 * @param {string} version - 语义化版本号字符串
 * @returns {Object} 解析后的版本对象，包含 major、minor、patch、prerelease
 * @throws {SemVerError} 当版本号格式无效时抛出
 */
export function parseSemVer(version) {
  if (typeof version !== 'string') {
    throw new SemVerError(errorMessages.INVALID_SEMVER)
  }
  
  const cleanVersion = version.replace(/^v/, '')
  const prereleaseIndex = cleanVersion.indexOf('-')
  const buildIndex = cleanVersion.indexOf('+')
  
  let mainVersion = cleanVersion
  let prerelease = null
  
  if (prereleaseIndex !== -1) {
    mainVersion = cleanVersion.substring(0, prereleaseIndex)
    const buildStartIndex = buildIndex > prereleaseIndex ? buildIndex : cleanVersion.length
    prerelease = cleanVersion.substring(prereleaseIndex, buildStartIndex)
  }
  
  const parts = mainVersion.split('.')
  
  if (parts.length < 3) {
    throw new SemVerError(errorMessages.INVALID_SEMVER)
  }
  
  const major = parseInt(parts[0], 10)
  const minor = parseInt(parts[1], 10)
  const patchMatch = parts[2].match(/^(\d+)/)
  
  if (isNaN(major) || isNaN(minor) || !patchMatch) {
    throw new SemVerError(errorMessages.INVALID_SEMVER)
  }
  
  const patch = parseInt(patchMatch[1], 10)
  
  return { major, minor, patch, prerelease }
}

/**
 * 比较两个语义化版本号
 * 返回值含义: 负数表示 a < b, 0 表示相等, 正数表示 a > b
 * @param {string} v1 - 第一个版本号
 * @param {string} v2 - 第二个版本号
 * @returns {number} 比较结果
 */
export function compareSemVer(v1, v2) {
  const semVer1 = parseSemVer(v1)
  const semVer2 = parseSemVer(v2)
  
  if (semVer1.major !== semVer2.major) {
    return semVer1.major - semVer2.major
  }
  
  if (semVer1.minor !== semVer2.minor) {
    return semVer1.minor - semVer2.minor
  }
  
  if (semVer1.patch !== semVer2.patch) {
    return semVer1.patch - semVer2.patch
  }
  
  if (semVer1.prerelease && !semVer2.prerelease) return -1
  if (!semVer1.prerelease && semVer2.prerelease) return 1
  if (semVer1.prerelease && semVer2.prerelease) {
    return semVer1.prerelease.localeCompare(semVer2.prerelease)
  }
  
  return 0
}

/**
 * 验证版本号是否为有效的语义化版本
 * @param {string} version - 待验证的版本号
 * @returns {boolean} 是否为有效版本号
 */
export function isValidSemVer(version) {
  try {
    parseSemVer(version)
    return true
  } catch {
    return false
  }
}

/**
 * 判断版本 v1 是否大于版本 v2
 * @param {string} v1 - 第一个版本号
 * @param {string} v2 - 第二个版本号
 * @returns {boolean} v1 是否大于 v2
 */
export function isGreater(v1, v2) {
  return compareSemVer(v1, v2) > 0
}

/**
 * 判断版本 v1 是否小于版本 v2
 * @param {string} v1 - 第一个版本号
 * @param {string} v2 - 第二个版本号
 * @returns {boolean} v1 是否小于 v2
 */
export function isLess(v1, v2) {
  return compareSemVer(v1, v2) < 0
}

/**
 * 判断两个版本号是否相等
 * @param {string} v1 - 第一个版本号
 * @param {string} v2 - 第二个版本号
 * @returns {boolean} 两个版本号是否相等
 */
export function isEqual(v1, v2) {
  return compareSemVer(v1, v2) === 0
}
