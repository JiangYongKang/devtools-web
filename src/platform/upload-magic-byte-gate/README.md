# Upload Magic Byte Gate

文件上传「第一道闸」校验组件，串联执行三重校验：

1.  **扩展名 / MIME 类型声明校验**
2.  **文件大小分层校验**（软警告 + 硬拒绝）
3.  **魔数签名校验**（读取文件头前 512 字节）

## 功能特性

### 核心校验
- ✅ 声明 MIME / 扩展名一致性检查
- ✅ 可配置的文件大小分层阈值（软警告 / 硬拒绝）
- ✅ 魔数（文件签名）抽样读取校验
- ✅ 结构化校验报告输出
- ✅ `application/octet-stream` 与真实内容不匹配的高优先级 issue

### 魔数库
- ✅ 内置常见格式签名表：PNG、JPEG、GIF、WebP、ZIP、PDF、WASM、ELF、EXE 等
- ✅ 支持运行时注册自定义规则（纯内存，不落库）
- ✅ 复合容器格式（ZIP 等）检测，明示「未扫描压缩包内部」
- ✅ UTF-8 文本启发式检测与 BOM 识别

### UI 界面
- ✅ 多文件队列展示，每个文件独立状态徽章
- ✅ 文件重试、移除功能
- ✅ 展开查看十六进制预览（截断）
- ✅ 示例按钮挂载小型合成 Blob 测试用例

### 异步处理
- ✅ `File.slice` 分块读取文件头
- ✅ `AbortController` 取消操作支持
- ✅ 进度回调（为批量目录扫描预留）
- ✅ `showOpenFilePicker` 可用性探测与降级

## 文件结构

```
upload-magic-byte-gate/
├── UploadMagicByteGate.jsx    # 主组件
├── UploadMagicByteGate.css    # 样式
├── README.md                  # 本文档
├── logic/
│   ├── index.js               # 统一导出入口
│   ├── constants.js           # 常量定义
│   ├── errors.js              # Issue 工厂函数
│   ├── magicNumbers.js        # 魔数检测核心
│   ├── mimeData.js            # MIME / 扩展名映射
│   ├── validation.js          # 三重校验管线
│   └── fileHandling.js        # 文件读取与处理
└── __tests__/
    ├── magicNumbers.test.js   # 魔数检测测试
    └── validation.test.js     # 校验逻辑测试
```

## 快速开始

### 基础使用

```jsx
import { UploadMagicByteGate } from './UploadMagicByteGate'

function App() {
  return (
    <UploadMagicByteGate
      maxFiles={20}
      sizeTier={{
        softWarning: 10 * 1024 * 1024,   // 10MB 警告
        hardReject: 100 * 1024 * 1024,  // 100MB 拒绝
      }}
    />
  )
}
```

### 注册自定义魔数规则

```javascript
import { registerMagicRule, clearCustomRules } from './logic'

// 注册自定义格式
registerMagicRule({
  id: 'my-custom-format',
  signature: [0xAA, 0xBB, 0xCC, 0xDD],
  offset: 0,  // 可选，默认 0
  mime: 'application/x-my-format',
  description: 'My Custom File Format',
  category: 'other',
  isContainer: false,  // 是否为容器格式（如 ZIP）
})

// 清除所有自定义规则
clearCustomRules()
```

### 直接使用校验逻辑

```javascript
import { processSingleFile, detectMimeFromBytes } from './logic'

// 处理单个文件
async function handleFile(file) {
  const result = await processSingleFile(file, {
    sizeTier: {
      softWarning: 10 * 1024 * 1024,
      hardReject: 100 * 1024 * 1024,
    },
  })

  if (result.state === 'passed') {
    console.log('文件校验通过:', result.validationResult)
  } else {
    console.log('文件校验未通过:', result.validationResult.issues)
  }
}

// 直接检测字节
const bytes = new Uint8Array([0x89, 0x50, 0x4E, 0x47, ...])
const detection = detectMimeFromBytes(bytes)
console.log('检测到 MIME:', detection.primary?.mime)
```

## 校验结果结构

### 单文件校验结果

```javascript
{
  ok: true | false,           // 总体是否通过
  issues: [                   // 问题列表
    {
      code: 'ISSUE_CODE',     // 问题代码
      severity: 'error' | 'warning' | 'info',
      message: '问题描述',
      hint: '修复建议',
      details: { /* 详情 */ },
    }
  ],
  detectedMime: 'image/png',  // 从文件内容检测的 MIME
  declaredMime: 'image/png',  // 声明的 MIME 类型
  filename: 'test.png',
  extension: 'png',
  size: 123456,
  humanSize: '120.56 KB',
  detectedDescription: 'PNG 图片',
  isContainer: false,
  category: 'image',
  confidence: 60,             // 检测置信度
  matches: [/* 所有匹配的签名 */],
  hasErrors: false,
  hasWarnings: true,
  bytes: Uint8Array(512),     // 文件头字节
}
```

### 问题代码（ISSUE_CODES）

| 代码 | 说明 | 严重级别 |
|------|------|----------|
| `EMPTY_FILE` | 文件为空 | ERROR |
| `FILE_SIZE_WARNING` | 文件大小超过软阈值 | WARNING |
| `FILE_SIZE_REJECT` | 文件大小超过硬阈值 | ERROR |
| `MIME_MISMATCH` | 声明类型与实际内容不匹配 | ERROR |
| `OCTET_STREAM_MISMATCH` | 声明为通用二进制流但实际为特定类型 | WARNING |
| `UNKNOWN_EXTENSION` | 未知扩展名 | WARNING |
| `DIRECTORY_DETECTED` | 检测到目录（不支持） | ERROR |
| `ZIP_CONTAINER_WARNING` | 检测到容器格式，未深度扫描 | INFO |
| `EXECUTABLE_RISK` | 检测到可执行文件 | WARNING |
| `READ_ERROR` | 文件读取错误 | ERROR |
| `CANCELLED` | 操作被取消 | INFO |

## 内置魔数支持

| 格式 | 签名（十六进制） | MIME 类型 |
|------|------------------|-----------|
| PNG | `89 50 4E 47 0D 0A 1A 0A` | image/png |
| JPEG | `FF D8 FF` | image/jpeg |
| GIF | `47 49 46 38 37 61 / 39 61` | image/gif |
| WebP | `52 49 46 46 ... 57 45 42 50` | image/webp |
| ZIP | `50 4B 03 04 / 05 06 / 07 08` | application/zip |
| PDF | `25 50 44 46` | application/pdf |
| WASM | `00 61 73 6D` | application/wasm |
| ELF | `7F 45 4C 46` | application/x-executable |
| PE (EXE) | `4D 5A` | application/vnd.microsoft.portable-executable |
| Mach-O | `FE ED FA CE / CF` | application/x-mach-binary |
| UTF-8 BOM | `EF BB BF` | text/plain |
| UTF-16 LE BOM | `FF FE` | text/plain |
| UTF-16 BE BOM | `FE FF` | text/plain |
| XML | `3C 3F 78 6D 6C` | application/xml |
| HTML | `3C 21 44 4F 43 54 59 50 45` | text/html |
| RAR | `52 61 72 21 1A 07` | application/x-rar-compressed |
| 7z | `37 7A BC AF 27 1C` | application/x-7z-compressed |
| GZIP | `1F 8B` | application/gzip |
| BZIP2 | `42 5A 68` | application/x-bzip2 |
| MP4 | `... 66 74 79 70` (offset 4) | video/mp4 |
| MP3 | `49 44 33` | audio/mpeg |
| OGG | `4F 67 67 53` | audio/ogg |

## 示例测试用例

组件内置三个示例按钮，可直接生成测试用例：

1.  **正确 PNG 头** - 生成带有标准 PNG 文件签名的测试文件，校验应通过
2.  **伪装成 PNG 的文本** - 生成文本内容但扩展名为 `.png`，会触发 MIME_MISMATCH
3.  **15MB 虚拟大文件** - 仅在内存中创建元数据，测试大小分层校验

## 安全说明

- ⚠️ 本组件仅提供客户端文件头检测，**不能替代服务端病毒扫描**
- ⚠️ 容器格式（ZIP、RAR 等）仅检测本地文件头，**未解压扫描内部内容**
- ⚠️ 可执行文件检测仅为教育性质提醒，**不保证完全覆盖所有可执行格式**
- ✅ 所有检测仅在浏览器本地执行，**不会上传任何文件内容到服务器**

## 测试

```bash
# 运行魔数检测测试
npm test -- magicNumbers.test.js

# 运行校验逻辑测试
npm test -- validation.test.js
```

## 与通用上传入口的关系

本组件专注于文件上传前的内容校验，不包含实际上传逻辑。与 `file-upload-surface` 目录的关系：

- **本组件**：聚焦「内容安全校验」，提供魔数检测、MIME 匹配、大小分层等深度校验
- **通用入口**：聚焦「上传流程」，处理选择文件、拖拽、上传进度、接口调用等

可将本组件作为通用上传入口的前置校验阶段使用。
