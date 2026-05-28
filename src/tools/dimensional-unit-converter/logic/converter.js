import { parseUnit, areDimensionsCompatible, vectorsEqual, formatVector, isDimensionless } from './parser.js'
import { findUnit, toSI, fromSI } from './units.js'
import { DIM_NAMES, createZeroVector } from './dimensions.js'

/**
 * 舍入模式
 */
export const RoundingMode = {
  HALF_UP: 'half-up',
  BANKERS: 'bankers',
}

/**
 * 舍入数值
 * @param {number} value - 原始值
 * @param {number} [significantDigits] - 有效数字位数，undefined 表示不做舍入
 * @param {string} [mode] - 舍入模式
 * @returns {number} 舍入后的值
 */
export function roundValue(value, significantDigits, mode = RoundingMode.HALF_UP) {
  if (significantDigits == null) return value
  if (!isFinite(value)) return value
  if (value === 0) return 0

  const absValue = Math.abs(value)
  const sign = value >= 0 ? 1 : -1

  if (absValue < 1 && significantDigits <= 1) {
    const intValue = Math.floor(absValue)
    const frac = absValue - intValue
    const diff = frac - 0.5

    if (Math.abs(diff) < 1e-12) {
      if (mode === RoundingMode.BANKERS) {
        return sign * (intValue % 2 === 0 ? intValue : intValue + 1)
      } else {
        return sign * (intValue + 1)
      }
    }
  }

  const digits = Math.floor(Math.log10(absValue)) + 1
  const factor = Math.pow(10, significantDigits - digits)
  const scaled = value * factor

  let rounded
  if (mode === RoundingMode.BANKERS) {
    const floor = Math.floor(scaled)
    const diff = scaled - floor
    if (Math.abs(diff - 0.5) < 1e-12) {
      rounded = floor % 2 === 0 ? floor : floor + 1
    } else {
      rounded = Math.round(scaled)
    }
  } else {
    rounded = Math.round(scaled)
  }

  return rounded / factor
}

/**
 * 冲突检测结果
 * @typedef {Object} ConflictResult
 * @property {boolean} hasConflict - 是否有冲突
 * @property {string[]} errors - 错误信息
 * @property {string[]} warnings - 警告信息
 */

/**
 * 检查单位运算的量纲冲突
 * @param {string} unitStr1 - 单位 1
 * @param {string} unitStr2 - 单位 2
 * @param {string} operation - 运算类型: 'add' | 'subtract' | 'multiply' | 'divide' | 'convert'
 * @returns {ConflictResult}
 */
export function checkDimensionConflict(unitStr1, unitStr2, operation = 'convert') {
  const r1 = parseUnit(unitStr1)
  const r2 = parseUnit(unitStr2)

  const errors = []
  const warnings = []

  if (!r1.ok) {
    errors.push(`源单位解析失败: ${r1.error.message}`)
  }
  if (!r2.ok) {
    errors.push(`目标单位解析失败: ${r2.error.message}`)
  }
  if (errors.length > 0) {
    return { hasConflict: true, errors, warnings }
  }

  const dim1 = r1.result.dimension
  const dim2 = r2.result.dimension
  const isTemp1 = r1.result.isTemperature
  const isTemp2 = r2.result.isTemperature

  if (operation === 'add' || operation === 'subtract' || operation === 'convert') {
    if (!vectorsEqual(dim1, dim2)) {
      errors.push(
        `量纲不兼容：${unitStr1} [${formatVector(dim1)}] 与 ${unitStr2} [${formatVector(dim2)}] 无法进行${operation === 'convert' ? '换算' : '加减'}`,
      )
    }

    if (isTemp1 !== isTemp2) {
      warnings.push(
        `温度混淆提示：${unitStr1}${isTemp1 ? ' 是' : ' 不是'}温度单位，${unitStr2}${isTemp2 ? ' 是' : ' 不是'}温度单位，请注意仿射变换`,
      )
    }
  }

  if (operation === 'convert' && (isTemp1 || isTemp2)) {
    const hasNonTempDimension = dim1.some((v, i) => i !== 4 && v !== 0)
    if (hasNonTempDimension) {
      warnings.push(
        `复合温度单位换算提示：${unitStr1} 或 ${unitStr2} 是包含温度的复合单位，仅纯温度单位支持仿射变换`,
      )
    }
  }

  return {
    hasConflict: errors.length > 0,
    errors,
    warnings,
  }
}

/**
 * 换算步骤
 * @typedef {Object} ConversionStep
 * @property {string} description - 步骤描述
 * @property {number} value - 当前值
 * @property {string} unit - 当前单位
 * @property {string} formula - 使用的公式
 */

/**
 * 换算结果
 * @typedef {Object} ConversionResult
 * @property {boolean} ok - 是否成功
 * @property {number} [result] - 换算结果
 * @property {number} [resultRounded] - 舍入后的结果
 * @property {ConversionStep[]} [steps] - 换算步骤链
 * @property {ConflictResult} [conflict] - 冲突检测结果
 * @property {string} [auditLog] - 审计日志（Markdown）
 * @property {Object} [error] - 错误信息
 */

/**
 * 执行单位换算
 * @param {number} value - 数值
 * @param {string} fromUnit - 源单位
 * @param {string} toUnit - 目标单位
 * @param {Object} [options] - 选项
 * @param {number} [options.significantDigits] - 有效数字位数
 * @param {string} [options.roundingMode] - 舍入模式
 * @param {boolean} [options.includeSteps] - 是否包含换算步骤
 * @param {boolean} [options.includeAuditLog] - 是否包含审计日志
 * @returns {ConversionResult}
 */
export function convertUnit(value, fromUnit, toUnit, options = {}) {
  const {
    significantDigits,
    roundingMode = RoundingMode.HALF_UP,
    includeSteps = false,
    includeAuditLog = false,
  } = options

  const conflict = checkDimensionConflict(fromUnit, toUnit, 'convert')
  if (conflict.hasConflict) {
    return {
      ok: false,
      conflict,
      error: { message: conflict.errors[0] },
    }
  }

  const r1 = parseUnit(fromUnit)
  const r2 = parseUnit(toUnit)

  const def1 = findUnit(fromUnit)
  const def2 = findUnit(toUnit)

  const isPureTemperature =
    r1.result.isTemperature &&
    r2.result.isTemperature &&
    def1 &&
    def2 &&
    def1.isTemperature &&
    def2.isTemperature &&
    fromUnit === def1.symbol &&
    toUnit === def2.symbol

  let result
  const steps = []

  if (isPureTemperature) {
    if (includeSteps) {
      steps.push({
        description: `识别为纯温度换算：${def1.name} → ${def2.name}`,
        value,
        unit: fromUnit,
        formula: `T[K] = T[${fromUnit}] × ${def1.scale} + ${def1.offset}`,
      })
    }

    const kelvin = toSI(value, def1)
    if (includeSteps) {
      steps.push({
        description: `转换到开尔文 (K)`,
        value: kelvin,
        unit: 'K',
        formula: `T[K] = ${value} × ${def1.scale} + ${def1.offset} = ${kelvin}`,
      })
    }

    result = fromSI(kelvin, def2)
    if (includeSteps) {
      steps.push({
        description: `从开尔文转换到 ${def2.name}`,
        value: result,
        unit: toUnit,
        formula: `T[${toUnit}] = (${kelvin} - ${def2.offset}) / ${def2.scale} = ${result}`,
      })
    }
  } else {
    const scale1 = r1.result.scale
    const scale2 = r2.result.scale
    const siValue = value * scale1

    if (includeSteps) {
      steps.push({
        description: `解析源单位 ${fromUnit}`,
        value,
        unit: fromUnit,
        formula: `缩放因子 = ${scale1}，量纲 = ${formatVector(r1.result.dimension)}`,
      })
      steps.push({
        description: `转换到 SI 基值`,
        value: siValue,
        unit: 'SI',
        formula: `${value} × ${scale1} = ${siValue}`,
      })
      steps.push({
        description: `解析目标单位 ${toUnit}`,
        value: siValue,
        unit: 'SI',
        formula: `缩放因子 = ${scale2}，量纲 = ${formatVector(r2.result.dimension)}`,
      })
    }

    result = siValue / scale2
    if (includeSteps) {
      steps.push({
        description: `从 SI 基值转换到目标单位`,
        value: result,
        unit: toUnit,
        formula: `${siValue} / ${scale2} = ${result}`,
      })
    }
  }

  const resultRounded = roundValue(result, significantDigits, roundingMode)

  let auditLog = null
  if (includeAuditLog) {
    auditLog = generateAuditLog({
      value,
      fromUnit,
      toUnit,
      result,
      resultRounded,
      significantDigits,
      roundingMode,
      steps,
      conflict,
      fromParse: r1,
      toParse: r2,
    })
  }

  return {
    ok: true,
    result,
    resultRounded,
    steps: includeSteps ? steps : undefined,
    conflict: conflict.warnings.length > 0 ? conflict : undefined,
    auditLog,
  }
}

/**
 * 生成 Markdown 格式的审计日志
 * @param {Object} params
 * @returns {string}
 */
export function generateAuditLog(params) {
  const {
    value,
    fromUnit,
    toUnit,
    result,
    resultRounded,
    significantDigits,
    roundingMode,
    steps,
    conflict,
    fromParse,
    toParse,
  } = params

  const lines = []
  lines.push('# 单位换算审计日志')
  lines.push('')
  lines.push(`**生成时间**: ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push('## 换算参数')
  lines.push('')
  lines.push(`| 项目 | 值 |`)
  lines.push(`|------|----|`)
  lines.push(`| 输入值 | \`${value}\` |`)
  lines.push(`| 源单位 | \`${fromUnit}\` |`)
  lines.push(`| 目标单位 | \`${toUnit}\` |`)
  lines.push(`| 有效数字 | ${significantDigits != null ? significantDigits : '不限制'} |`)
  lines.push(`| 舍入模式 | ${roundingMode === 'bankers' ? '银行家舍入' : '四舍五入'} |`)
  lines.push('')

  if (fromParse?.ok && toParse?.ok) {
    lines.push('## 量纲分析')
    lines.push('')
    lines.push(`### 源单位: \`${fromUnit}\``)
    lines.push(`- **全称**: ${findUnit(fromUnit)?.name || fromParse.result.humanReadable}`)
    lines.push(`- **量纲向量**: \`[${fromParse.result.dimension.join(', ')}]\``)
    lines.push(`- **量纲表示**: ${formatVector(fromParse.result.dimension)}`)
    lines.push(`- **缩放因子**: \`${fromParse.result.scale}\``)
    lines.push(`- **温度单位**: ${fromParse.result.isTemperature ? '是' : '否'}`)
    lines.push('')
    lines.push(`### 目标单位: \`${toUnit}\``)
    lines.push(`- **全称**: ${findUnit(toUnit)?.name || toParse.result.humanReadable}`)
    lines.push(`- **量纲向量**: \`[${toParse.result.dimension.join(', ')}]\``)
    lines.push(`- **量纲表示**: ${formatVector(toParse.result.dimension)}`)
    lines.push(`- **缩放因子**: \`${toParse.result.scale}\``)
    lines.push(`- **温度单位**: ${toParse.result.isTemperature ? '是' : '否'}`)
    lines.push('')
    lines.push('### 量纲相容性检查')
    lines.push(`- **量纲匹配**: ${vectorsEqual(fromParse.result.dimension, toParse.result.dimension) ? '✓ 匹配' : '✗ 不匹配'} |`)
    lines.push(`- **量纲**: ${formatVector(fromParse.result.dimension)} ${vectorsEqual(fromParse.result.dimension, toParse.result.dimension) ? '=' : '≠'} ${formatVector(toParse.result.dimension)}`)
    lines.push('')
  }

  if (conflict && (conflict.errors.length > 0 || conflict.warnings.length > 0)) {
    lines.push('## 冲突检测')
    lines.push('')
    if (conflict.errors.length > 0) {
      lines.push('### 错误')
      lines.push('')
      conflict.errors.forEach((e) => lines.push(`- ❌ ${e}`))
      lines.push('')
    }
    if (conflict.warnings.length > 0) {
      lines.push('### 警告')
      lines.push('')
      conflict.warnings.forEach((w) => lines.push(`- ⚠️ ${w}`))
      lines.push('')
    }
  }

  if (steps && steps.length > 0) {
    lines.push('## 换算步骤链')
    lines.push('')
    steps.forEach((step, i) => {
      lines.push(`### 步骤 ${i + 1}: ${step.description}`)
      lines.push('')
      lines.push(`- **当前值**: \`${step.value}\` ${step.unit}`)
      lines.push(`- **公式**: \`${step.formula}\``)
      lines.push('')
    })
  }

  lines.push('## 换算结果')
  lines.push('')
  lines.push(`- **原始结果**: \`${result}\``)
  if (resultRounded !== undefined && resultRounded !== result) {
    lines.push(`- **舍入结果**: \`${resultRounded}\``)
    lines.push(`  - 有效数字: ${significantDigits}`)
    lines.push(`  - 舍入模式: ${roundingMode === 'bankers' ? '银行家舍入 (Round half to even)' : '四舍五入 (Half up)'}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(`> **最终结果**: \`${value}\` \`${fromUnit}\` = \`${resultRounded ?? result}\` \`${toUnit}\``)

  return lines.join('\n')
}

/**
 * 导出当前会话的所有换算记录为 Markdown
 * @param {Array<Object>} records - 换算记录数组
 * @returns {string}
 */
export function exportAllAuditLogs(records) {
  if (!records || records.length === 0) {
    return '# 单位换算审计日志\n\n*暂无换算记录*'
  }

  const lines = []
  lines.push('# 单位换算审计日志汇总')
  lines.push('')
  lines.push(`**导出时间**: ${new Date().toLocaleString()}`)
  lines.push(`**记录数量**: ${records.length}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  records.forEach((record, index) => {
    lines.push(`## 记录 ${index + 1}`)
    lines.push('')
    lines.push(`\`${record.value}\` \`${record.fromUnit}\` → \`${record.result}\` \`${record.toUnit}\``)
    lines.push('')
    if (record.auditLog) {
      lines.push('<details>')
      lines.push('<summary>查看详细审计日志</summary>')
      lines.push('')
      lines.push(record.auditLog)
      lines.push('')
      lines.push('</details>')
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  })

  return lines.join('\n')
}
