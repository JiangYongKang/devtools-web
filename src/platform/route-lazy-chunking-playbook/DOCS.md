# 按工具拆分路由 - 代码分割与懒加载方案

## 目录
1. [方案概述](#方案概述)
2. [代码分割策略](#代码分割策略)
3. [Vite 配置说明](#vite-配置说明)
4. [React 懒加载实现](#react-懒加载实现)
5. [错误边界处理](#错误边界处理)
6. [预加载策略](#预加载策略)
7. [可访问性 (A11y)](#可访问性-a11y)
8. [集成清单](#集成清单)
9. [API 参考](#api-参考)

---

## 方案概述

本方案提供了一套完整的按工具拆分的代码分割与懒加载方案，主要特性：

- ✅ **Manifest 驱动**：通过 `toolRouteManifest` 统一管理所有工具路由
- ✅ **动态 import**：使用 `import()` 实现按需加载
- ✅ **错误边界**：优雅处理 chunk 加载失败，支持重试
- ✅ **预加载优化**：hover/focus 触发 + 浏览历史智能预取
- ✅ **可访问性**：加载状态播报，键盘导航支持
- ✅ **可视化 Playground**：体积对比、加载瀑布、Chunk 关系图

---

## 代码分割策略

### 1. Chunk 划分边界

#### 互斥 Chunk (Mutex Chunks)
- 每个工具独立一个 Chunk (`tool-*`)
- 同一时间只加载一个工具 Chunk
- 示例：`tool-analytics`, `tool-editor`, `tool-settings`

#### 共享 Chunk (Shared Chunks)
- 多工具共享的 UI 组件库 (`shared-ui`)
- 图表相关依赖 (`shared-charts`)
- 数据导出工具 (`shared-export`)
- 通用工具函数 (`shared-utils`)

#### Vendor Chunks
- React 核心库 (`react`, `react-dom`)
- 第三方依赖分离

### 2. 共享依赖上浮规则

```
规则 1：被 >= 2 个工具使用的依赖 → 提取到 shared-*
规则 2：体积 > 10KB 的公共依赖 → 优先提取
规则 3：工具特有依赖 → 保留在工具 Chunk 内
规则 4：Vendor 依赖 → 单独打包
```

**示例 Chunk 分配：**
```
├── tool-a (45KB)       # 数据分析面板
│   └── 依赖: shared-ui, shared-charts
├── tool-b (38KB)       # 报表生成器
│   └── 依赖: shared-ui, shared-export
├── tool-c (62KB)       # 可视化编辑器
│   └── 依赖: shared-ui, shared-charts, shared-utils
├── shared-ui (120KB)   # 被 3 个工具使用
├── shared-charts (85KB) # 被 2 个工具使用
├── shared-export (40KB) # 被 2 个工具使用
└── shared-utils (35KB)  # 被 2 个工具使用
```

### 3. 预期收益

| 指标 | 同步打包 | 动态 import | 提升 |
|------|---------|------------|------|
| 初始加载体积 | 505KB | ~120KB (shared-ui) | **-76%** |
| Chunks 数量 | 1 | 9 | +8 |
| 首屏加载时间 | ~2s | ~500ms | **-75%** |

---

## Vite 配置说明

### 1. manualChunks 配置

```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 1. Vendor 依赖分离
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
            return 'vendor-others'
          }

          // 2. 共享 UI 组件库
          if (id.includes('/platform/shared/ui/')) {
            return 'shared-ui'
          }

          // 3. 共享图表库
          if (id.includes('/platform/shared/charts/')) {
            return 'shared-charts'
          }

          // 4. 共享导出工具
          if (id.includes('/platform/shared/export/')) {
            return 'shared-export'
          }

          // 5. 各工具独立 Chunk
          if (id.match(/\/platform\/tools\/([^/]+)\//)) {
            const toolId = RegExp.$1
            return `tool-${toolId}`
          }
        },
      },
    },
  },
}
```

### 2. 预加载提示配置

```javascript
// vite.config.js
export default {
  plugins: [
    {
      name: 'preload-hints',
      generateBundle(options, bundle) {
        // 为 shared-* 生成 preload hints
        Object.keys(bundle).forEach((fileName) => {
          if (fileName.startsWith('shared-') && fileName.endsWith('.js')) {
            // 通过 Link 头部注入 preload
          }
        })
      },
    },
  ],
}
```

---

## React 懒加载实现

### 1. 基础用法

```jsx
import { lazy, Suspense } from 'react'
import { LoadingFallback } from './LoadingFallback'
import { LazyRouteErrorBoundary } from './LazyRouteErrorBoundary'
import { toolRouteManifest } from './toolRouteManifest'

const LazyTool = ({ toolId }) => {
  const tool = toolRouteManifest[toolId]
  const Component = lazy(tool.loader)

  return (
    <LazyRouteErrorBoundary maxRetries={3}>
      <Suspense fallback={<LoadingFallback toolName={tool.title} />}>
        <Component />
      </Suspense>
    </LazyRouteErrorBoundary>
  )
}
```

### 2. Suspense Fallback 一致性

**LoadingFallback 组件设计原则：**
- ✅ 与真实 UI 布局尺寸一致，避免布局抖动
- ✅ 使用骨架屏代替纯 loading 动画
- ✅ 支持小/中/大三种尺寸适配
- ✅ 保持与工具卡片一致的视觉风格

---

## 错误边界处理

### 1. LazyRouteErrorBoundary 组件

**核心功能：**
- ✅ 捕获 chunk 加载失败（网络错误、资源过期）
- ✅ 显示用户友好的错误提示
- ✅ 支持手动重试按钮
- ✅ 记录错误日志（含重试次数、时间戳）
- ✅ 最大 3 次自动重试（指数退避）

**重试策略：**
```
第 1 次重试: 延迟 1s
第 2 次重试: 延迟 2s (1s * 2)
第 3 次重试: 延迟 4s (2s * 2)
超过 3 次 → 显示永久失败状态
```

### 2. 错误分类与处理

| 错误码 | 类型 | 可重试 | 处理方式 |
|--------|------|--------|---------|
| `CHUNK_LOAD_FAILED` | 动态 import 失败 | ✅ 是 | 自动重试 + 手动按钮 |
| `NETWORK_ERROR` | 网络异常 | ✅ 是 | 提示检查网络连接 |
| `TIMEOUT` | 加载超时 | ✅ 是 | 延长超时阈值 |
| `MODULE_NOT_FOUND` | 模块不存在 | ❌ 否 | 提示刷新页面 |
| `INVALID_MANIFEST` | Manifest 错误 | ❌ 否 | 上报错误 |

---

## 预加载策略

### 1. 触发时机

| 触发方式 | 说明 | 适用场景 |
|---------|------|---------|
| **Hover** | 鼠标悬停按钮 200ms 后 | 桌面端 |
| **Focus** | 键盘聚焦到按钮 | 键盘用户、移动端 |
| **Nav History** | 根据浏览历史智能预测 | 所有场景 |

### 2. 调度策略

```javascript
// 首选: requestIdleCallback (浏览器空闲时执行)
window.requestIdleCallback(
  () => preloadChunk(toolId),
  { timeout: 2000 }
)

// 降级: setTimeout (延迟 100ms)
setTimeout(() => preloadChunk(toolId), 100)
```

### 3. 智能预取算法

**输入参数：**
- `navHistory`: 浏览历史记录（含访问频率、时间戳）
- `currentToolId`: 当前打开的工具 ID
- `maxCandidates`: 最大预取数量（默认 3）

**得分公式：**
```
score = (frequency * 0.6) + (recency * 0.4)

frequency: 归一化访问频率 (0~1)
recency: 归一化最近度 (0~1，越近越高)
```

**优先级映射：**
```
score > 0.8 → HIGH 优先级
score > 0.5 → MEDIUM 优先级
otherwise   → LOW 优先级
```

### 4. 取消机制

- 鼠标移出按钮 → 取消未执行的预加载
- 导航离开当前页面 → 取消所有待执行预加载
- 组件卸载 → 清理所有定时器

---

## 可访问性 (A11y)

### 1. 状态播报

使用 `aria-live` 区域播报加载状态：

```jsx
// 加载开始
announcer.textContent = `正在加载 ${toolName}...`

// 加载成功
announcer.textContent = `${toolName} 已加载完成`

// 加载失败
announcer.textContent = `${toolName} 加载失败，请重试`
```

### 2. 键盘导航

- ✅ 所有工具按钮可通过 Tab 聚焦
- ✅ Enter/Space 触发加载
- ✅ Focus 触发预加载（优化键盘用户体验）
- ✅ 错误状态可通过键盘操作重试

### 3. ARIA 属性

```jsx
<button
  role="link"
  aria-label={`打开 ${toolName} 工具`}
  aria-describedby="loading-status"
  tabIndex={0}
>
  {toolName}
</button>

<div
  id="loading-status"
  aria-live="polite"
  aria-atomic="true"
  style={{ position: 'absolute', left: '-9999px' }}
/>
```

---

## 集成清单

### 前置检查

- [ ] 项目使用 Vite 2.x+
- [ ] React 版本 >= 16.6（支持 React.lazy）
- [ ] 现有路由系统支持动态组件

### 步骤 1: 复制核心文件

```
src/platform/route-lazy-chunking-playbook/
├── logic/
│   ├── constants.js      # 常量定义
│   ├── errors.js         # 错误类与工具函数
│   ├── chunkGraph.js     # Chunk 图构建
│   ├── preload.js        # 预加载策略
│   ├── retry.js          # 重试逻辑
│   └── index.js          # 统一导出
├── toolRouteManifest.js  # 工具路由清单
├── LazyRouteErrorBoundary.jsx
├── LoadingFallback.jsx
├── Announcer.jsx
├── usePreload.js
└── RouteLazyChunkingPlaybook.jsx  # Playground (可选)
```

### 步骤 2: 配置 Vite manualChunks

```javascript
// 在 vite.config.js 中添加：
import { manualChunksConfig } from './src/platform/route-lazy-chunking-playbook/logic'

export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: manualChunksConfig,
      },
    },
  },
}
```

### 步骤 3: 创建工具 Manifest

```javascript
// src/config/toolManifest.js
import { createToolManifest } from '../platform/route-lazy-chunking-playbook/logic'

export const toolManifest = createToolManifest({
  'analytics': {
    title: '数据分析面板',
    loader: () => import('../platform/analytics'),
    preloadPriority: 'high',
  },
  // ... 其他工具
})
```

### 步骤 4: 集成到路由系统

```jsx
// src/router.jsx
import { useRoutes } from 'react-router-dom'
import { createLazyRouteElement } from './platform/route-lazy-chunking-playbook'
import { toolManifest } from './config/toolManifest'

const routes = [
  {
    path: '/tool/:toolId',
    element: createLazyRouteElement(toolManifest),
  },
]

export function AppRouter() {
  return useRoutes(routes)
}
```

### 步骤 5: 添加预加载 Hook

```jsx
// 在工具列表组件中：
import { usePreload } from '../platform/route-lazy-chunking-playbook'
import { toolManifest } from '../config/toolManifest'

function ToolList() {
  const { createPreloadHandlers } = usePreload(toolManifest)

  return (
    <div>
      {Object.values(toolManifest).map((tool) => (
        <button
          key={tool.id}
          {...createPreloadHandlers(tool.id)}
          onClick={() => navigate(`/tool/${tool.id}`)}
        >
          {tool.title}
        </button>
      ))}
    </div>
  )
}
```

### 步骤 6: 添加无障碍播报

```jsx
// App.jsx
import { Announcer } from './platform/route-lazy-chunking-playbook'

function App() {
  return (
    <div>
      <Announcer />
      {/* 其他内容 */}
    </div>
  )
}
```

### 验证检查

- [ ] 首屏只加载 shared-ui，工具 Chunk 按需加载
- [ ] Chunk 加载失败时显示重试按钮
- [ ] 鼠标悬停工具按钮触发预加载
- [ ] 屏幕阅读器正确播报加载状态
- [ ] 构建输出包含预期的 Chunk 划分

---

## API 参考

### buildChunkGraph(manifest)

构建 Chunk 依赖关系图。

**参数：**
- `manifest` - 工具路由清单

**返回：**
```javascript
{
  nodes: [
    { id: 'tool-a', type: 'mutex', size: 45, tools: ['tool-a'] },
    { id: 'shared-ui', type: 'shared', size: 120, tools: ['tool-a', 'tool-b'] },
  ],
  edges: [
    { from: 'tool-a', to: 'shared-ui', type: 'dependency' },
    { from: 'shared-ui', to: 'shared-charts', type: 'shared-overlap', overlapCount: 2 },
  ],
}
```

### selectPreloadCandidates(navHistory, config)

根据浏览历史选择预加载候选。

**参数：**
- `navHistory` - 浏览历史数组
- `config.maxCandidates` - 最大候选数 (默认 3)
- `config.historyWeight` - 历史频率权重 (默认 0.6)
- `config.recencyWeight` - 最近度权重 (默认 0.4)

**返回：**
```javascript
[
  { toolId: 'tool-a', score: 0.85, priority: 'high' },
  { toolId: 'tool-b', score: 0.55, priority: 'medium' },
]
```

### withRetry(loaderFn, config)

带重试的加载函数包装。

**参数：**
- `loaderFn` - 加载函数 (返回 Promise)
- `config.maxRetries` - 最大重试次数 (默认 3)
- `config.initialDelay` - 初始延迟 ms (默认 1000)
- `config.backoffMultiplier` - 退避乘数 (默认 2)

---

## 维护建议

1. **定期审核 Chunk 分配**：每月检查构建统计，调整 sharedChunks 边界
2. **监控预加载命中率**：目标命中率 > 70%，低于时调整预取算法
3. **错误日志分析**：关注 CHUNK_LOAD_FAILED 错误率，超过 1% 需排查
4. **性能指标跟踪**：跟踪 LCP、FID 等指标，确保优化效果持续

---

## 相关资源

- [React.lazy 文档](https://react.dev/reference/react/lazy)
- [React.Suspense 文档](https://react.dev/reference/react/Suspense)
- [Vite Build 配置](https://vitejs.dev/config/build-options.html)
- [Rollup manualChunks](https://rollupjs.org/guide/en/#outputmanualchunks)
