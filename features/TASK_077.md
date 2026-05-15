### 任务目标
- 乐观更新与冲突 UI 模式库：在纯前端状态机中模拟「本地草稿 vs 服务端版本向量」双轨；展示列表行内编辑的乐观 `pending` 态、`synced` 态、`rejected` 态与 `conflict` 态；冲突时弹出三路解决面板（「保留本地」「采用远端」「合并字段级 diff」），合并视图基于行字段级 LCS 或简单 JSON 平铺 diff（逻辑层实现，禁止引入重量级 diff 二进制）。
- 版本与幂等：逻辑层维护 `baseRevision`、`optimisticRevision` 与 `lastAppliedMutationId`；重复提交检测与「重放同一 mutationId」忽略策略；网络失败分层（超时、5xx、422 业务冲突）映射到不同 UI 色带与恢复动作（重试/回滚）。
- 示例与脚本化演示：内置「模拟服务端延迟与随机冲突」控制台（滑块调节延迟毫秒、冲突概率）；示例数据集一键载入（多用户伪造成通过 `actor` 下拉切换）；展示 ETag/`If-Match` 请求头在说明区的契约（不发起真实 HTTP，除非下文 mock）。
- 可访问与国际化预留：所有状态切换具备 `aria-busy` 与文案插槽；时间线侧栏展示事件溯源（最多保留 K 条可配）；与任务 064 错误码映射表在文案层对齐枚举名但不跨目录 import。
- 边界：并发编辑同一行时的「最后写入获胜」与「冲突」两种模式切换；页面卸载前未同步变更计数与拦截提示（本任务内最小实现 `beforeunload` 钩子演示，不修改路由层）；大数据列表下冲突面板仅加载当前行快照。
### 实现范围
- 页面文件夹：`devtools-web/src/platform/optimistic-sync-conflict-ui/`
- 纯逻辑函数文件夹：`devtools-web/src/platform/optimistic-sync-conflict-ui/logic/`
- 测试文件夹：`devtools-web/src/platform/optimistic-sync-conflict-ui/__tests__/`
### API 信息
- 可选 mock：`fetch` 封装在 `logic/mockServer.ts` 内用 `setTimeout` 模拟，入参含 `If-Match` 头，返回 `412` 触发冲突路径；默认导出给演示页使用，不绑定真实域名。
### 任务约束
- 当前任务只允许读取和修改 `devtools-web/src/platform/optimistic-sync-conflict-ui/` 目录内文件；不得修改全局 HTTP 客户端任务目录。
### 验收标准
- 任务目标五条均可操作演示；单测覆盖状态机全转移、mutation 幂等、412 冲突解决三路、模拟随机冲突分布统计；示例脚本可稳定重现至少一种冲突与一次回滚。
