### 任务目标
- 多副本编辑：2～4 个 replica 文本面板模拟离线编辑，每 replica 独立操作序列（insert/delete 带 lamport/vector clock 简化版）；支持 LWW（Last-Write-Wins）与 RGA（Replicated Growable Array）简化算法切换。
- 合并演示：点击「合并全部」输出统一文档与操作 log；冲突处用 inline 标记（`<conflict>` 或背景色）展示各 replica 候选字符/片段。
- 可视化：可选操作时间线（按 replica 着色）；合并前后 diff；说明 CRDT 与 OT 差异及本演示简化假设。
- 示例：内置「并发插入同一位置」「交错删除」「LWW vs RGA 结果差异」三组剧本一键加载；空 replica 与超长文本截断策略。
- 单测：覆盖 LWW merge、RGA insert/delete、冲突标记生成、操作序列合法性；所有纯函数中文注释。
### 实现范围
- 页面文件夹：`devtools-web/src/tools/crdt-text-merge-demo/`
- 纯逻辑函数文件夹：`devtools-web/src/tools/crdt-text-merge-demo/logic/`
- 测试文件夹：`devtools-web/src/tools/crdt-text-merge-demo/__tests__/`
### API 信息
- 无外部 API。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/tools/crdt-text-merge-demo/` 目录内文件；不得修改乐观冲突 UI 其它任务目录。
### 验收标准
- 多 replica 编辑、LWW/RGA 合并、冲突标记与时间线均可演示；单测覆盖两种算法；示例剧本可用。
