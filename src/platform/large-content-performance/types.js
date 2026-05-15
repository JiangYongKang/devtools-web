/**
 * LargeContentPerformance - 类型定义
 *
 * 此文件通过 JSDoc 声明所有对外 API 的形状，便于宿主应用依赖注入。
 * 注意：Worker 内禁止 DOM 访问，通信协议为结构化克隆安全子集。
 * ArrayBuffer 转移：使用 transfer 后主线程不可再读。
 */

/**
 * @typedef {'utf-16' | 'utf-8'} EncodingMode
 */

/**
 * @typedef {'small-payload' | 'no-worker-support' | 'single-core' | 'shared-buffer-available' | 'large-payload-multicore' | 'threshold-borderline'} WorkerDecisionReason
 */

/**
 * @typedef {Object} TextChunk
 * @property {string} chunk - 分片内容
 * @property {number} chunkIndex - 分片索引
 * @property {number} startIndex - 在原文中的起始位置
 * @property {number} endIndex - 在原文中的结束位置
 * @property {number} length - 字符长度
 * @property {number} byteSize - 字节大小
 * @property {EncodingMode} encoding - 编码模式
 * @property {boolean} isFirst - 是否是第一个分片
 * @property {boolean} isLast - 是否是最后一个分片
 */

/**
 * @typedef {Object} TextChunkIterator
 * @property {function(): {value: TextChunk|undefined, done: boolean}} next
 * @property {function(): number} getTotalChunks
 * @property {function(): number} getTotalLength
 * @property {function(): EncodingMode} getEncoding
 * @property {function(): void} reset
 * @property {function(): TextChunk[]} collectAll
 */

/**
 * @typedef {Object} DebouncedFunction
 * @property {function(...any): any} cancel
 * @property {function(): any} flush
 * @property {function(): boolean} pending
 */

/**
 * @typedef {Object} WorkerDecision
 * @property {boolean} useWorker - 是否使用 Worker
 * @property {WorkerDecisionReason} reason - 决策理由
 * @property {Object} details - 详细信息
 * @property {number} details.payloadBytes - 负载字节数
 * @property {number} details.thresholdBytes - 阈值字节数
 * @property {number} details.hardwareConcurrency - CPU 核心数
 * @property {boolean} details.workerSupported - Worker 是否可用
 * @property {boolean} details.sharedBufferSupported - SharedArrayBuffer 是否可用
 * @property {'main-thread' | 'worker'} recommendation - 推荐方案
 */

/**
 * @typedef {Object} HeightCache
 * @property {function(number): number} get
 * @property {function(number, number): void} set
 * @property {function(number): boolean} has
 * @property {function(): void} clear
 * @property {function(): number} getEstimatedAverage
 * @property {function(): number} getMeasuredCount
 * @property {function(): number} getDefaultHeight
 * @property {function(): number} getCacheSize
 */

/**
 * @typedef {Object} VisibleRange
 * @property {number} start - 起始索引
 * @property {number} end - 结束索引
 * @property {number} visibleCount - 可见项数
 * @property {number} offsetTop - 顶部偏移
 * @property {number} totalHeight - 总高度
 * @property {number} anchorIndex - 锚点索引
 */

/**
 * @typedef {Object} MemoryEstimate
 * @property {number} bytes
 * @property {number} kilobytes
 * @property {number} megabytes
 */

/**
 * @typedef {Object} CancelToken
 * @property {boolean} isCancelled
 * @property {function(): void} cancel
 * @property {function(function(): void): function(): void} onCancel
 * @property {function(): void} throwIfCancelled
 */

/**
 * @typedef {Object} DatasetProgress
 * @property {number} generated - 已生成数量
 * @property {number} total - 总数
 * @property {number} percent - 百分比
 * @property {MemoryEstimate} memory - 内存估算
 */

/**
 * @typedef {Object} WorkerMessage
 * @property {number} version - 协议版本
 * @property {string} type - 消息类型
 * @property {Object} payload - 消息负载
 * @property {string} id - 消息 ID
 * @property {number} timestamp - 时间戳
 * @property {boolean} [merged] - 是否是合并消息
 */

/**
 * @typedef {Object} LargeTextControllerState
 * @property {boolean} isAttached
 * @property {number} byteSize
 * @property {number} charCount
 * @property {boolean} overBudget
 */

/**
 * @typedef {Object} LargeTextControllerOptions
 * @property {number} [thresholdBytes] - 字节阈值
 * @property {function(Object): void} [onOverBudget] - 超预算回调
 */

/**
 * @typedef {Object} LargeTextController
 * @property {LargeTextControllerOptions} options
 * @property {function(): void} attach
 * @property {function(): void} detach
 * @property {function(): LargeTextControllerState} getState
 * @property {function(): boolean} checkBudget
 */

/**
 * @typedef {'small' | 'medium' | 'large'} DatasetSize
 */

/**
 * @typedef {Object} GenerateDatasetOptions
 * @property {function(number): any} [generator]
 * @property {CancelToken} [cancelToken]
 * @property {number} [frameBudget]
 * @property {function(DatasetProgress): void} [onProgress]
 * @property {string} [itemType]
 */

/**
 * @typedef {Object} DebounceOptions
 * @property {number} [wait] - 等待时间（毫秒）
 * @property {number} [maxWait] - 最大等待时间（毫秒）
 * @property {boolean} [leading] - 是否在开始时执行
 * @property {boolean} [trailing] - 是否在结束时执行
 */

export {}
