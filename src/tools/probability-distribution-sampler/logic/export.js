/**
 * 导出功能
 * CSV 导出、PNG 图表导出、Markdown 摘要导出
 */

/**
 * 导出样本为 CSV
 * @param {number[]} data - 样本数据
 * @param {string} filename - 文件名
 * @param {string} distributionName - 分布名称
 */
export function exportCSV(data, filename = 'samples.csv', distributionName = '') {
  const csvContent = 'value\n' + data.map((x) => x.toFixed(6)).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  downloadBlob(blob, filename)
}

/**
 * 导出统计摘要为 Markdown
 * @param {Object} stats - 统计结果
 * @param {string} distributionType - 分布类型
 * @param {Object} params - 分布参数
 * @param {Object} fitTest - 拟合检验结果
 * @returns {string} Markdown 字符串
 */
export function generateMarkdownSummary(stats, distributionType, params, fitTest = null) {
  const distributionNames = {
    uniform: '均匀分布',
    normal: '正态分布',
    poisson: '泊松分布',
    binomial: '二项分布',
    exponential: '指数分布',
  }

  const distName = distributionNames[distributionType] || distributionType

  let md = `# 概率分布采样摘要\n\n`
  md += `## 基本信息\n\n`
  md += `- **分布类型**: ${distName}\n`
  md += `- **样本量**: ${stats.count}\n`
  md += `- **分布参数**: ${JSON.stringify(params, null, 2)}\n\n`

  md += `## 样本统计量\n\n`
  md += `| 统计量 | 样本值 |\n`
  md += `|--------|--------|\n`
  md += `| 均值 (Mean) | ${stats.mean.toFixed(6)} |\n`
  md += `| 方差 (Variance) | ${stats.variance.toFixed(6)} |\n`
  md += `| 标准差 (Std) | ${stats.std.toFixed(6)} |\n`
  md += `| 偏度 (Skewness) | ${stats.skewness.toFixed(6)} |\n`
  md += `| 峰度 (Kurtosis) | ${stats.kurtosis.toFixed(6)} |\n`
  md += `| 最小值 (Min) | ${stats.min.toFixed(6)} |\n`
  md += `| 最大值 (Max) | ${stats.max.toFixed(6)} |\n\n`

  if (fitTest) {
    md += `## 拟合检验结果\n\n`
    if (fitTest.shapiro) {
      md += `### Shapiro-Wilk 检验\n`
      md += `- W 统计量: ${fitTest.shapiro.w.toFixed(6)}\n`
      md += `- p 值区间: ${fitTest.shapiro.pValueRange}\n`
      md += `- 解释: ${fitTest.shapiro.interpretation}\n\n`
    }
    if (fitTest.ks) {
      md += `### Kolmogorov-Smirnov 检验\n`
      md += `- D 统计量: ${fitTest.ks.d.toFixed(6)}\n`
      md += `- p 值区间: ${fitTest.ks.pValueRange}\n`
      md += `- 解释: ${fitTest.ks.interpretation}\n\n`
    }
  }

  md += `---\n`
  md += `*生成时间: ${new Date().toLocaleString()}\n`

  return md
}

/**
 * 从 Canvas 导出 PNG
 * @param {HTMLCanvasElement} canvas - Canvas 元素
 * @param {string} filename - 文件名
 */
export function exportPNGFromCanvas(canvas, filename = 'histogram.png') {
  const dataURL = canvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * 下载 Blob
 */
function downloadBlob(blob, filename) {
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    try {
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      return true
    } catch {
      document.body.removeChild(textarea)
      return false
    }
  }
}
