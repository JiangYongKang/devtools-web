import { PRELOAD_PRIORITY } from './logic/constants'

export const toolRouteManifest = {
  'tool-a': {
    id: 'tool-a',
    title: '数据分析面板',
    description: '高级数据分析与可视化工具',
    loader: () => import('./tools/tool-a'),
    preloadPriority: PRELOAD_PRIORITY.HIGH,
    estimatedSize: 45,
    sharedChunks: ['shared-ui', 'shared-charts'],
  },
  'tool-b': {
    id: 'tool-b',
    title: '报表生成器',
    description: '多格式报表导出工具',
    loader: () => import('./tools/tool-b'),
    preloadPriority: PRELOAD_PRIORITY.MEDIUM,
    estimatedSize: 38,
    sharedChunks: ['shared-ui', 'shared-export'],
  },
  'tool-c': {
    id: 'tool-c',
    title: '可视化编辑器',
    description: '拖拽式图表编辑器',
    loader: () => import('./tools/tool-c'),
    preloadPriority: PRELOAD_PRIORITY.HIGH,
    estimatedSize: 62,
    sharedChunks: ['shared-ui', 'shared-charts', 'shared-utils'],
  },
  'tool-d': {
    id: 'tool-d',
    title: '数据导入器',
    description: '批量数据导入与校验',
    loader: () => import('./tools/tool-d'),
    preloadPriority: PRELOAD_PRIORITY.LOW,
    estimatedSize: 52,
    sharedChunks: ['shared-ui', 'shared-export', 'shared-utils'],
  },
  'tool-e': {
    id: 'tool-e',
    title: '设置管理器',
    description: '全局配置与偏好设置',
    loader: () => import('./tools/tool-e'),
    preloadPriority: PRELOAD_PRIORITY.CRITICAL,
    estimatedSize: 28,
    sharedChunks: ['shared-ui', 'shared-utils'],
  },
}

export const mockBuildStats = {
  chunks: [
    { id: 'tool-a', size: 45, type: 'mutex', usedBy: ['tool-a'] },
    { id: 'tool-b', size: 38, type: 'mutex', usedBy: ['tool-b'] },
    { id: 'tool-c', size: 62, type: 'mutex', usedBy: ['tool-c'] },
    { id: 'tool-d', size: 52, type: 'mutex', usedBy: ['tool-d'] },
    { id: 'tool-e', size: 28, type: 'mutex', usedBy: ['tool-e'] },
    { id: 'shared-ui', size: 120, type: 'shared', usedBy: ['tool-a', 'tool-b', 'tool-c', 'tool-d', 'tool-e'] },
    { id: 'shared-charts', size: 85, type: 'shared', usedBy: ['tool-a', 'tool-c'] },
    { id: 'shared-export', size: 40, type: 'shared', usedBy: ['tool-b', 'tool-d'] },
    { id: 'shared-utils', size: 35, type: 'shared', usedBy: ['tool-c', 'tool-d', 'tool-e'] },
  ],
  totalSize: 505,
  bundleType: 'dynamic-import',
}

export const syncBundleStats = {
  chunks: [
    { id: 'main-bundle', size: 505, type: 'single', usedBy: ['all'] },
  ],
  totalSize: 505,
  bundleType: 'sync',
}

export default toolRouteManifest
