### 任务目标
- 建立轻量 i18n 运行时：命名空间分段、`t(key, params)` 插值（`{{name}}` 与 ICU 单子集 `{n, plural, ...}` 二选一固定并文档化）、回退链 `locale` → `fallbackLocale` → `key` 原样；支持懒加载语言包（`import()` 动态 chunk 或 `fetch` JSON），加载失败时整包回退并 `errorCode`。
- 语言包校验：逻辑层 schema 校验键非空、禁止值内含 `<script` 子串、占位符闭合检查；构建时可选合并表在运行时以哈希校验（演示用手写 `checksum` 字段）；支持远程热补丁包（版本字段冲突则拒绝整包）。
- 演示页与示例：切换 `zh-CN`/`en-US`/虚构 `xx` 观察回退；一键加载「缺键、坏插值、多余占位符」包；展示 `Intl` 日期/数字格式化封装 `formatDate`/`formatNumber`（与 `locale` 绑定，不可用则降级纯文本）。
- 与任务 064 衔接：错误映射表键可引用 `t('errors.HTTP_502')`，演示如何在 `mapError` 后二次套用 i18n（本任务目录内组合函数，不修改 error-message-mapper 文件）。
- 边界：RTL 标记字符检测与 `dir` 提示（可不完整布局镜像）；超长键名拒绝；循环引用语言 JSON 拒绝；SSR 仅导出 `t` 同步子集与 `preloadLocale` no-op。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/i18n-kit/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/i18n-kit/logic/`
- 测试文件夹：`devtools-web/src/platform/i18n-kit/__tests__/`
### API 信息
- 语言包 URL：`GET /locales/{locale}/{namespace}.json`，`Accept-Language` 不参与，由应用显式传 `locale`；304/空体处理与 061 类似须在单测覆盖。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/i18n-kit/` 目录内文件；不得修改其他任务目录。
### 验收标准
- 任务目标五条均可演示；单测覆盖插值、plural（若选）、回退链、schema 拒绝、checksum 失败。
