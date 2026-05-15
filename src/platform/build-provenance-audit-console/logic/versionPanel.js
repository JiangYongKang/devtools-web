/**
 * 获取构建信息对象
 * 从 import.meta.env 或 __APP_BUILD__ 全局变量中读取构建信息
 * @returns {Object} 构建信息对象，包含版本号、commit、构建时间等
 */
export function getBuildInfo() {
  const envMeta = typeof import.meta !== 'undefined' ? import.meta.env || {} : {}
  
  return {
    packageVersion: typeof __APP_BUILD__ !== 'undefined' 
      ? __APP_BUILD__.packageVersion 
      : (envMeta.PACKAGE_VERSION || '0.0.0'),
    gitCommit: envMeta.GIT_COMMIT || (typeof __APP_BUILD__ !== 'undefined' 
      ? __APP_BUILD__.gitCommit 
      : 'unknown'),
    buildTime: envMeta.BUILD_TIME || (typeof __APP_BUILD__ !== 'undefined' 
      ? __APP_BUILD__.buildTime 
      : new Date().toISOString()),
    environment: envMeta.MODE || 'development'
  }
}

/**
 * 格式化 ISO 时间戳为用户友好的本地时间
 * @param {string} isoString - ISO 8601 格式的时间戳
 * @returns {string} 格式化后的本地时间字符串
 */
export function formatBuildTime(isoString) {
  const date = new Date(isoString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

/**
 * 缩短 Git Commit 哈希为短格式（7位）
 * @param {string} hash - Git Commit 完整哈希
 * @returns {string} 缩短后的哈希
 */
export function shortenCommitHash(hash) {
  if (!hash || hash === 'unknown') return 'unknown'
  return hash.slice(0, 7)
}

/**
 * 生成演示用的构建信息数据
 * 用于开发环境或数据未注入时的占位
 * @returns {Object} 演示用的构建信息对象
 */
export function generateDemoBuildInfo() {
  return {
    packageVersion: '1.2.3',
    gitCommit: 'a1b2c3d4e5f6g7h8i9j0',
    buildTime: '2024-05-15T14:30:00.000Z',
    environment: 'production'
  }
}
