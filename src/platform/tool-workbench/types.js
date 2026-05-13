/**
 * ToolWorkbench - 类型定义
 * 
 * 此文件通过 JSDoc 声明所有对外 API 的形状，便于宿主应用依赖注入。
 * 具体的剪贴板、下载、通知实现请参考任务 055/056。
 */

/**
 * @typedef {Object} CopyCallbackOptions
 * @property {string} content - 要复制的文本内容
 * @property {string} [label] - 标签，用于提示信息
 * @returns {Promise<boolean>} 是否成功
 */

/**
 * @typedef {Object} DownloadCallbackOptions
 * @property {string} content - 要下载的内容
 * @property {string} filename - 文件名
 * @property {string} [mimeType] - MIME 类型，默认 text/plain;charset=utf-8
 * @returns {void}
 */

/**
 * @typedef {Object} NotifyCallbackOptions
 * @property {'success' | 'error' | 'warning' | 'info'} type - 通知类型
 * @property {string} message - 消息内容
 * @property {number} [duration] - 持续时间（毫秒）
 */

/**
 * @typedef {Object} ToolWorkbenchProps
 * @property {string} [title] - 工具标题
 * @property {React.ReactNode} [description] - 说明内容
 * @property {'side-by-side' | 'stacked'} [defaultTopology] - 默认布局拓扑
 * @property {boolean} [showSidebar] - 是否显示侧边栏
 * @property {React.ReactNode} [sidebarContent] - 侧边栏内容
 * @property {React.ReactNode} [inputContent] - 输入区内容
 * @property {React.ReactNode} [outputContent] - 输出区内容
 * @property {React.ReactNode} [actionsContent] - 操作区内容
 * @property {Object} [emptyState] - 空态配置
 * @property {Object} [loadingState] - 加载态配置
 * @property {Object} [errorState] - 错误态配置
 * @property {Object} [readOnlyState] - 只读态配置
 * @property {CopyCallback} [onCopy] - 复制回调
 * @property {DownloadCallback} [onDownload] - 下载回调
 * @property {NotifyCallback} [onNotify] - 通知回调
 * @property {OnTopologyChangeCallback} [onTopologyChange] - 布局拓扑变化回调
 * @property {OnClearInputCallback} [onClearInput] - 清空输入回调
 * @property {OnClearOutputCallback} [onClearOutput] - 清空输出回调
 * @property {OnSwapCallback} [onSwap] - 互换输入输出回调
 * @property {OnLoadExampleCallback} [onLoadExample] - 加载示例回调
 * @property {OnInjectErrorCallback} [onInjectError] - 注入错误回调
 * @property {Object} [examples] - 示例配置
 * @property {boolean} [allowSwap] - 是否允许互换
 * @property {boolean} [allowCopy] - 是否允许复制
 * @property {boolean} [allowDownload] - 是否允许下载
 * @property {Object} [outputThresholds] - 输出阈值配置
 */

/**
 * @typedef {(content: string, label?: string) => Promise<boolean>} CopyCallback
 */

/**
 * @typedef {(options: DownloadCallbackOptions) => void} DownloadCallback
 */

/**
 * @typedef {(options: NotifyCallbackOptions) => void} NotifyCallback
 */

/**
 * @typedef {(topology: 'side-by-side' | 'stacked') => void} OnTopologyChangeCallback
 */

/**
 * @typedef {() => void} OnClearInputCallback
 */

/**
 * @typedef {() => void} OnClearOutputCallback
 */

/**
 * @typedef {() => void} OnSwapCallback
 */

/**
 * @typedef {(example: { size: 'small' | 'medium' | 'large', content: string }) => void} OnLoadExampleCallback
 */

/**
 * @typedef {() => void} OnInjectErrorCallback
 */

/**
 * @typedef {Object} OutputChunk
 * @property {string} content - 块内容
 * @property {number} index - 块索引
 * @property {number} size - 块大小
 */

/**
 * @typedef {Object} StreamingState
 * @property {boolean} isStreaming - 是否正在流式传输
 * @property {OutputChunk[]} chunks - 已接收的块
 * @property {number} totalSize - 总大小
 * @property {number} chunkCount - 块数量
 */

/**
 * @typedef {Object} PartitionSizes
 * @property {number} input - 输入区高度
 * @property {number} output - 输出区高度
 * @property {number} [sidebar] - 侧边栏宽度
 * @property {number} [meta] - 元信息区高度
 */

export {}
