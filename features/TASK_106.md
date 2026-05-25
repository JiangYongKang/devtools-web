### 任务目标
- XPath 查询：粘贴 XML 与 XPath 表达式（支持常用轴、谓词、`text()`、`@attr`、命名空间前缀）；返回匹配节点列表、节点路径（如 `/root/item[2]/@id`）与文本摘要；XQuery-lite 仅支持 FLWR 子集或明确标注「不支持」的构造列表。
- 命名空间：前缀→URI 映射表可编辑；默认 xmlns 自动注册；未绑定前缀报错并提示修复。
- 导出：结果集导出为 JSON 数组（tagName、attributes、text、path）或 CSV；选中节点复制 outerXML 片段（安全转义展示，防 XXE：禁用外部实体，仅字符串解析）。
- 示例：内置带 namespace 的订单 XML、属性选取、计数谓词样例一键填充；非法 XML 与 XPath 语法错误分别定位。
- 单测：覆盖前缀映射、路径生成、XXE 安全解析开关、空 NodeList；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/xml-xpath-query-workbench/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/xml-xpath-query-workbench/logic/`
- 测试文件夹：`devtools-web/src/tools/xml-xpath-query-workbench/__tests__/`
### API 信息
- 无外部 API；禁止网络实体解析。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/xml-xpath-query-workbench/` 目录内文件；不得修改 XML 排版其它任务目录。
### 验收标准
- XPath 求值、命名空间映射、结果导出均可验收；XXE 禁用可说明；单测覆盖路径与谓词；示例可用。
