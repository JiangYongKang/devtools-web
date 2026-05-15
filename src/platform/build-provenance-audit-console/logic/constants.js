/**
 * CVSS 严重程度分级配置
 * 根据 CVSS 分数区间定义不同级别的显示颜色和标签
 */
export const CVSS_SEVERITY = {
  CRITICAL: { threshold: 9.0, color: '#dc2626', label: '严重' },
  HIGH: { threshold: 7.0, color: '#ea580c', label: '高危' },
  MEDIUM: { threshold: 4.0, color: '#ca8a04', label: '中危' },
  LOW: { threshold: 0.1, color: '#16a34a', label: '低危' },
  NONE: { threshold: 0, color: '#6b7280', label: '无风险' }
}

/**
 * 许可证白名单列表
 * 包含所有允许使用的开源许可证类型
 */
export const LICENSE_ALLOWLIST = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Unlicense',
  'CC0-1.0'
]

/**
 * Source Map 策略配置列表
 * 定义不同构建模式下的 Source Map 配置选项及其优缺点
 */
export const SOURCE_MAP_STRATEGIES = [
  {
    id: 'hidden-source-map',
    name: 'hidden-source-map',
    pros: ['生产环境不暴露源码', '可配合错误上报系统使用', '构建速度较快'],
    cons: ['需单独管理 sourcemap 文件', '部署时需注意权限控制'],
    description: '生成完整 sourcemap 但不 bundle，通过独立文件提供'
  },
  {
    id: 'nosources-source-map',
    name: 'nosources-source-map',
    pros: ['不暴露源码内容', '保留行列映射信息', '体积较小'],
    cons: ['无法还原完整源码', '调试能力有限'],
    description: '仅包含行列映射，不包含源码内容'
  },
  {
    id: 'eval-source-map',
    name: 'eval-source-map',
    pros: ['构建速度快', '支持热更新', '开发环境调试体验好'],
    cons: ['源码直接暴露在 bundle 中', '生产环境严重安全风险', 'bundle 体积增大'],
    description: '使用 eval 执行模块，Source Map 以 DataURL 形式内嵌（仅适用于开发环境）'
  },
  {
    id: 'disabled',
    name: '线上禁用',
    pros: ['最安全，无源码泄露风险', '构建速度最快', '无额外部署成本'],
    cons: ['无法还原生产错误栈', '问题定位困难'],
    description: '生产环境完全禁用 sourcemap'
  }
]

/**
 * Source Map 泄露风险检查项
 * 列出常见的可能导致 Source Map 泄露的配置错误
 */
export const SOURCEMAP_LEAK_CHECKS = [
  {
    id: 'public-dir-exposure',
    name: 'Sourcemap 文件暴露在 public 目录',
    risk: '高危',
    description: '.map 文件被放置在可公开访问的静态资源目录'
  },
  {
    id: 'sourcemap-comment-leftover',
    name: '构建产物残留 sourceMappingURL 注释',
    risk: '中危',
    description: 'JS 文件末尾保留了指向 sourcemap 文件的注释'
  },
  {
    id: 'inline-sourcemap-production',
    name: '生产环境使用 inline-source-map',
    risk: '严重',
    description: '源码以 base64 编码直接内嵌在 bundle 中'
  },
  {
    id: 'sourcemap-cors-open',
    name: 'Source Map 服务器 CORS 配置过宽',
    risk: '中危',
    description: '允许任意域名跨域访问 sourcemap 文件'
  }
]

/**
 * 错误上报时序图 Mermaid 定义
 * 展示从浏览器上报错误到开发团队接收告警的完整流程
 */
export const MERMAID_ERROR_REPORT_FLOW = `sequenceDiagram
    participant Browser as 用户浏览器
    participant Sentry as 错误上报服务
    participant SourceMap as Sourcemap存储服务
    participant DevTeam as 开发团队
    
    Browser->>Sentry: 1. 上报错误堆栈(含行列号)
    Sentry->>SourceMap: 2. 请求对应版本 sourcemap
    SourceMap-->>Sentry: 3. 返回 sourcemap 文件
    Sentry->>Sentry: 4. 还原原始调用栈
    Sentry->>DevTeam: 5. 推送告警(含还原后栈)`

/**
 * CSV 导出表头配置
 * 定义不同类型报告的 CSV 列标题
 */
export const CSV_HEADERS = {
  AUDIT: ['包名', '版本', '漏洞标题', 'CVSS评分', '严重程度', 'CVE', '修复版本'],
  LICENSES: ['包名', '版本', '许可证', '是否在白名单', '作者']
}
