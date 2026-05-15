import { getPath } from './pathParser.js'
import { setPathImmutable } from './setPath.js'
import { VALIDATION_RULES } from './constants.js'
import { ValidationError } from './errors.js'

/**
 * 将嵌套对象扁平化为 { path: value } 的结构（用于表单 name 属性映射）
 * @param {Object} obj - 嵌套对象
 * @param {string} prefix - 路径前缀（用于递归）
 * @returns {Object} 扁平化对象，键为路径字符串
 */
function flattenObject(obj, prefix = '') {
  const result = {}

  function flatten(current, currentPrefix) {
    if (Array.isArray(current)) {
      current.forEach((item, index) => {
        flatten(item, `${currentPrefix}[${index}]`)
      })
    } else if (current !== null && typeof current === 'object') {
      for (const [key, value] of Object.entries(current)) {
        const newPrefix = currentPrefix ? `${currentPrefix}.${key}` : key
        if (
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value) &&
          Object.keys(value).length > 0 &&
          typeof Object.values(value)[0] !== 'object'
        ) {
          result[newPrefix] = value
        } else if (value !== null && typeof value === 'object' || Array.isArray(value)) {
          flatten(value, newPrefix)
        } else {
          result[newPrefix] = value
        }
      }
    } else if (currentPrefix) {
      result[currentPrefix] = current
    }
  }

  flatten(obj, prefix)
  return result
}

/**
 * 将扁平对象还原为嵌套结构（与 flattenObject 互逆）
 * @param {Object} flatObj - 扁平化对象，键为路径字符串
 * @returns {Object} 还原后的嵌套对象
 */
function unflattenObject(flatObj) {
  let result = {}

  for (const [path, value] of Object.entries(flatObj)) {
    result = setPathImmutable(result, path, value)
  }

  return result
}

/**
 * 根据 name 属性获取表单值（getPath 的别名）
 * @param {Object} formData - 表单数据对象
 * @param {string} name - 表单 name 属性值
 * @returns {*} 字段值
 */
function getFormValue(formData, name) {
  return getPath(formData, name)
}

/**
 * 根据 name 属性设置表单值（setPathImmutable 的别名）
 * @param {Object} formData - 表单数据对象
 * @param {string} name - 表单 name 属性值
 * @param {*} value - 要设置的值
 * @returns {Object} 更新后的表单对象
 */
function setFormValue(formData, name, value) {
  return setPathImmutable(formData, name, value)
}

/**
 * 根据规则验证单个字段的值
 * @param {*} value - 字段值
 * @param {Object} rules - 验证规则 { required, type, min, max, minLength, maxLength, pattern }
 * @param {string} fieldName - 字段名（用于错误消息）
 * @returns {Array} 错误列表，每项包含 rule 和 message
 */
function validateField(value, rules, fieldName) {
  const errors = []

  if (rules.required && (value === null || value === undefined || value === '')) {
    errors.push({
      rule: VALIDATION_RULES.REQUIRED,
      message: `${fieldName} is required`,
    })
  }

  if (value !== null && value !== undefined && value !== '') {
    if (rules.type) {
      const typeValid =
        (rules.type === 'string' && typeof value === 'string') ||
        (rules.type === 'number' && typeof value === 'number') ||
        (rules.type === 'boolean' && typeof value === 'boolean') ||
        (rules.type === 'array' && Array.isArray(value)) ||
        (rules.type === 'object' && typeof value === 'object' && !Array.isArray(value))

      if (!typeValid) {
        errors.push({
          rule: VALIDATION_RULES.TYPE,
          message: `${fieldName} must be of type ${rules.type}`,
        })
      }
    }

    if (rules.type === 'number' || typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push({
          rule: VALIDATION_RULES.MIN,
          message: `${fieldName} must be at least ${rules.min}`,
        })
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push({
          rule: VALIDATION_RULES.MAX,
          message: `${fieldName} must be at most ${rules.max}`,
        })
      }
    }

    if (typeof value === 'string') {
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push({
          rule: VALIDATION_RULES.MIN_LENGTH,
          message: `${fieldName} must be at least ${rules.minLength} characters`,
        })
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push({
          rule: VALIDATION_RULES.MAX_LENGTH,
          message: `${fieldName} must be at most ${rules.maxLength} characters`,
        })
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push({
          rule: VALIDATION_RULES.PATTERN,
          message: `${fieldName} format is invalid`,
        })
      }
    }
  }

  return errors
}

/**
 * 根据 Schema 验证整个表单
 * @param {Object} formData - 表单数据对象
 * @param {Object} schema - 验证规则 Schema，键为路径字符串（支持 [] 通配符）
 * @returns {Object} 验证结果 { valid: true, fieldErrors: {} }
 * @throws {ValidationError} 当有字段验证失败时抛出，包含 fieldErrors 对象
 */
function validateForm(formData, schema) {
  const fieldErrors = {}
  let hasErrors = false

  for (const [path, rules] of Object.entries(schema)) {
    if (path.includes('[]')) {
      const arrayPath = path.replace('[]', '')
      const arrayData = getPath(formData, arrayPath)

      if (Array.isArray(arrayData)) {
        const wildcardPath = path.replace('[]', '[*]')
        const allValues = getPath(formData, wildcardPath)

        if (Array.isArray(allValues)) {
          allValues.forEach((value, index) => {
            const fieldPath = path.replace('[]', `[${index}]`)
            const errors = validateField(value, rules, fieldPath)
            if (errors.length > 0) {
              fieldErrors[fieldPath] = errors
              hasErrors = true
            }
          })
        }
      }
    } else {
      const value = getPath(formData, path)
      const errors = validateField(value, rules, path)
      if (errors.length > 0) {
        fieldErrors[path] = errors
        hasErrors = true
      }
    }
  }

  if (hasErrors) {
    throw new ValidationError('Form validation failed', fieldErrors)
  }

  return { valid: true, fieldErrors: {} }
}

/**
 * 根据路径验证单个字段
 * @param {Object} formData - 表单数据对象
 * @param {string} path - 字段路径
 * @param {Object} rules - 验证规则
 * @returns {Object} 验证结果 { valid: boolean, errors: Array }
 */
function validateFieldByPath(formData, path, rules) {
  const value = getPath(formData, path)
  const errors = validateField(value, rules, path)
  return {
    valid: errors.length === 0,
    errors,
  }
}

export {
  flattenObject,
  unflattenObject,
  getFormValue,
  setFormValue,
  validateForm,
  validateFieldByPath,
  validateField,
}
