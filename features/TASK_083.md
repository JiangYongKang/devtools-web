### 任务目标
- 模板引擎子集：支持 `{{var}}`、`{{obj.path}}`、`{{#if flag}}...{{/if}}`（无递归块深度上限可配置）、`{{#each items}}{{this}}{{/each}}` 单层列表；实现词法/语法错误定位到行列与「未闭合标签」诊断；禁止 `eval` 与 `new Function`。
- 变量面板：JSON 或表格编辑「数据上下文」，与模板双向校验；支持「缺失变量」「多余变量」「类型不匹配（布尔当字符串拼接）」三类警告；提供「从示例加载」三组场景（订单通知、密码重置、账单摘要）。
- 预览管线：渲染为「纯文本」「HTML 转义预览」「假邮件头 + 正文」三栏；HTML 预览走白名单或纯文本高亮，防 XSS；支持主题变量如 `{{brand.primaryColor}}` 嵌套路径与默认值语法 `{{price|0}}`。
- 国际化与格式：内置 `date`、`currency`、`upper` 等有限过滤器注册表，可扩展；过滤器未知时降级为原文并记 warning；所有渲染与解析方法中文注释。
- 纯逻辑测试：覆盖嵌套路径、空白控制、each 空数组、if 假值集合（`false`/`0`/`""`/`null`）语义表；性能上对 64KB 模板给出线性上界说明与样例压测按钮（仅主线程计时，不阻塞 UI 超时可取消）。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/templated-notification-preview/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/templated-notification-preview/logic/`
- 测试文件夹：`devtools-web/src/platform/templated-notification-preview/__tests__/`
### API 信息
- 无 HTTP。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/templated-notification-preview/` 目录内文件；不得修改其它任务目录。
### 验收标准
- 五条均可演示；错误模板可定位错误；HTML 预览经手 XSS 安全策略；单测覆盖语法错误、each/if、过滤器默认值、嵌套路径；三组示例一键加载且渲染差异可见。
