import { ISSUE_CODES, SEVERITY } from './constants.js'

function createIssue(code, severity, message, hint = '', details = {}) {
  return {
    code,
    severity,
    message,
    hint,
    details,
  }
}

function createErrorIssue(code, message, hint = '', details = {}) {
  return createIssue(code, SEVERITY.ERROR, message, hint, details)
}

function createWarningIssue(code, message, hint = '', details = {}) {
  return createIssue(code, SEVERITY.WARNING, message, hint, details)
}

function createInfoIssue(code, message, hint = '', details = {}) {
  return createIssue(code, SEVERITY.INFO, message, hint, details)
}

const ISSUE_FACTORIES = {
  emptyFile: () => createErrorIssue(
    ISSUE_CODES.EMPTY_FILE,
    '文件为空',
    '请选择有内容的文件，或修改配置允许空文件'
  ),

  fileSizeWarning: (actual, limit) => createWarningIssue(
    ISSUE_CODES.FILE_SIZE_WARNING,
    `文件大小 (${formatSize(actual)}) 超过建议阈值 (${formatSize(limit)})`,
    '考虑压缩文件或选择更小的文件',
    { actualSize: actual, limitSize: limit }
  ),

  fileSizeReject: (actual, limit) => createErrorIssue(
    ISSUE_CODES.FILE_SIZE_REJECT,
    `文件大小 (${formatSize(actual)}) 超过最大限制 (${formatSize(limit)})`,
    '请选择更小的文件',
    { actualSize: actual, limitSize: limit }
  ),

  mimeMismatch: (declaredMime, detectedMime, extension) => createErrorIssue(
    ISSUE_CODES.MIME_MISMATCH,
    `声明的文件类型与实际内容不匹配：声明为 ${declaredMime || 'unknown'} (${extension || '无扩展名'})，实际检测为 ${detectedMime || 'unknown'}`,
    '文件可能被篡改或扩展名被修改，请确认文件来源',
    { declaredMime, detectedMime, extension }
  ),

  octetStreamMismatch: (detectedMime) => createWarningIssue(
    ISSUE_CODES.OCTET_STREAM_MISMATCH,
    `文件声明为通用二进制流 (application/octet-stream)，但实际内容检测为 ${detectedMime}`,
    '建议检查文件扩展名是否正确',
    { detectedMime }
  ),

  unknownExtension: (extension) => createWarningIssue(
    ISSUE_CODES.UNKNOWN_EXTENSION,
    `扩展名 .${extension} 不在已知类型列表中`,
    '文件类型将仅通过内容检测',
    { extension }
  ),

  directoryDetected: () => createErrorIssue(
    ISSUE_CODES.DIRECTORY_DETECTED,
    '检测到目录，不支持上传目录',
    '请选择单个文件或压缩后上传'
  ),

  zipContainerWarning: () => createInfoIssue(
    ISSUE_CODES.ZIP_CONTAINER_WARNING,
    '检测到 ZIP 容器格式，仅检查文件头，未解压扫描内部内容',
    '请确保压缩包内的文件是安全的',
    { note: '为防止 Zip Bomb 攻击，未进行深度解压扫描' }
  ),

  executableRisk: (mime, description) => createWarningIssue(
    ISSUE_CODES.EXECUTABLE_RISK,
    `检测到可执行文件类型：${description || mime}`,
    '可执行文件可能包含恶意代码，请确保来源可信',
    { mime, description }
  ),

  readError: (errorMessage) => createErrorIssue(
    ISSUE_CODES.READ_ERROR,
    `读取文件失败：${errorMessage || '未知错误'}`,
    '文件可能已损坏或被锁定，请重试'
  ),

  cancelled: () => createInfoIssue(
    ISSUE_CODES.CANCELLED,
    '文件校验已取消',
    '可以重新添加文件进行校验'
  ),
}

function formatSize(bytes) {
  if (bytes === 0) return '0 B'
  if (bytes == null) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}

function createValidationResult(ok = true, issues = [], detectedMime = null, declaredMime = null, extra = {}) {
  return {
    ok,
    issues,
    detectedMime,
    declaredMime,
    ...extra,
  }
}

export {
  createIssue,
  createErrorIssue,
  createWarningIssue,
  createInfoIssue,
  ISSUE_FACTORIES,
  createValidationResult,
  formatSize,
}
