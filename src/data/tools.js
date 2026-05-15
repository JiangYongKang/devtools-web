/** 当前已落地的工具条目（081～100），首页列表与 ToolPage 实现一致 */
export const tools = [
  {
    id: '091',
    name: '弱网与请求排队',
    summary:
      '在线/离线/降级网络画像、请求入队与重放、背压与持久化策略演示',
  },
  {
    id: '092',
    name: '路由懒加载与分包',
    summary:
      '按工具拆分的动态 import、预取、错误边界与体积/瀑布分析 Playground',
  },
  {
    id: '093',
    name: '并发上限任务队列',
    summary:
      '有界并发池、优先级与取消、溢出策略与 Worker/主线程任务演示',
  },
  {
    id: '094',
    name: '未保存离开提示',
    summary:
      '脏检测、beforeunload 与路由守卫拦截、多标签租约与无障碍对话框',
  },
  {
    id: '095',
    name: '依赖健康检查面板',
    summary:
      '多目标探测、超时与熔断、延迟 sparkline 与错误分类展示',
  },
  {
    id: '096',
    name: '本地设置导入导出',
    summary:
      '设置快照版本、校验与迁移链、diff 预览与敏感字段脱敏',
  },
  {
    id: '097',
    name: '实验与灰度 UI 矩阵',
    summary:
      '特性开关与分桶规则、变体矩阵与命中原因、紧急关停演示',
  },
  {
    id: '098',
    name: 'API 弃用与 Sunset 横幅',
    summary:
      'Deprecation/Sunset 等响应头解析、站内横幅与 snooze 状态机',
  },
  {
    id: '099',
    name: '出站 HTTP 韧性策略',
    summary:
      '超时、重试、退避与取消的统一 policyFetch 与时间线观测',
  },
  {
    id: '100',
    name: '构建溯源与安全审计',
    summary:
      '运行时版本信息、Source Map 策略说明、审计 JSON 与许可证聚合',
  },
]

export function getToolById(id) {
  return tools.find((t) => t.id === id)
}
