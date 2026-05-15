### 任务目标
- 大数据树渲染：支持 1e4+ 节点懒加载展开（子节点按需 attach）、虚拟化可选（折叠态下仅渲染可视行）、多选（checkbox 半选传播）、键盘方向键导航与 `aria-expanded`；数据源自 JSON「嵌套 children」与「物化路径」两种加载器示例。
- 表格模式：同构数据切换为「树形表格」（左冻结缩进列、右滚动列族），列宽拖拽与最小宽度约束；支持按列排序时保持子树稳定或扁平排序两种策略切换（逻辑层可配置 comparator）。
- 编辑与危险操作：行内重命名（防抖校验）、删除子树确认、撤销栈（内存上限可配）；批量展开到深度 N 时须进度条与可取消。
- 纯逻辑：实现 `flattenVisibleRows(state) -> RowModel[]`、`patchTreeimmutable(nodeId, mutator)`、`collectCheckedSubtree(root)` 等可测纯函数；所有方法中文注释。
- 示例：一键加载「深链」「宽扇出」「随机 ID」三类合成数据；展示「展开全部耗时」与「选中节点导出为 JSONPath 列表」。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/hierarchical-data-tree-table/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/hierarchical-data-tree-table/logic/`
- 测试文件夹：`devtools-web/src/platform/hierarchical-data-tree-table/__tests__/`
### API 信息
- 无 HTTP；大数据生成在客户端用 PRNG 种子可复现。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/hierarchical-data-tree-table/` 目录内文件；不得修改虚拟列表全局组件其它任务目录。
### 验收标准
- 列表/表格双模式与虚拟化或降级路径可演示；单测覆盖半选传播、immutable patch、可见行扁平、排序稳定选项；万级节点展开在 DOC 写明目标设备参考帧预算。
