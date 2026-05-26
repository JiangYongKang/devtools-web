import { parseDocument, LineCounter } from 'yaml'

/**
 * 判断值是否为非 null 对象（用于字典遍历）
 * @param {unknown} v 待检查值
 * @returns {boolean}
 */
function isObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/**
 * 将 Ansible hosts 字段统一为字符串数组
 * 支持字符串（逗号或冒号分隔）、列表、以及 all / localhost 等特殊值
 * @param {unknown} hosts YAML 中 hosts 字段的原始值
 * @returns {string[]}
 */
function normalizeHosts(hosts) {
  if (hosts == null) return []
  if (Array.isArray(hosts)) {
    return hosts.map((h) => String(h).trim()).filter(Boolean)
  }
  if (typeof hosts === 'string') {
    const trimmed = hosts.trim()
    if (!trimmed) return []
    return trimmed
      .split(/[\s,;:]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return [String(hosts)]
}

/**
 * 从 task 的字典中查找 Ansible 模块名（action）
 * 跳过元数据键（name、when、loop、notify、register、tags、become、ignore_errors、changed_when、failed_when、check_mode、diff、no_log、args、delegate_to、serial 等）
 * 若未命中则退化使用 action 字段或返回 null
 * @param {Record<string, unknown>} taskObj
 * @returns {string | null}
 */
function detectModule(taskObj) {
  const META_KEYS = new Set([
    'name',
    'when',
    'loop',
    'notify',
    'register',
    'tags',
    'become',
    'become_user',
    'become_method',
    'ignore_errors',
    'any_errors_fatal',
    'changed_when',
    'failed_when',
    'check_mode',
    'diff',
    'no_log',
    'args',
    'vars',
    'delegate_to',
    'delegate_facts',
    'serial',
    'throttle',
    'timeout',
    'retries',
    'delay',
    'until',
    'gather_facts',
    'connection',
    'remote_user',
    'environment',
    'listen',
    'block',
    'rescue',
    'always',
    'with_items',
    'with_file',
    'with_lines',
    'with_sequence',
    'with_dict',
    'with_together',
    'with_flattened',
    'with_indexed_items',
    'with_subelements',
    'with_nested',
    'with_inventory_hostnames',
    'with_random_choice',
    'loop_control',
    'async',
    'poll',
    'run_once',
    'local_action',
    'pre_tasks',
    'post_tasks',
    'handlers',
    'roles',
    'hosts',
    'tasks',
    'vars',
    'vars_files',
    'vars_prompt',
    'defaults',
    'fact_path',
    'max_fail_percentage',
    'force_handlers',
  ])

  if (typeof taskObj.action === 'string') return taskObj.action

  const keys = Object.keys(taskObj)
  for (const k of keys) {
    if (!META_KEYS.has(k)) {
      return k
    }
  }
  return null
}

/**
 * 提取单个 task 的摘要信息（供 UI 卡片展示）
 * @param {Record<string, unknown>} raw YAML 中原始字典
 * @param {number} index 原始顺序索引（按在 play 中出现的位置）
 * @returns {{ index:number, name:string|null, module:string|null, when:unknown, loop:unknown, notify:string[], tags:string[] }}
 */
function extractTaskSummary(raw, index) {
  const notify = raw.notify
  let notifyList = []
  if (typeof notify === 'string') notifyList = [notify]
  else if (Array.isArray(notify)) {
    notifyList = notify.map((n) => String(n))
  }

  const tags = raw.tags
  let tagsList = []
  if (typeof tags === 'string') tagsList = [tags]
  else if (Array.isArray(tags)) tagsList = tags.map((t) => String(t))

  const moduleName = detectModule(raw)
  const moduleArgs = moduleName && raw[moduleName] != null ? raw[moduleName] : null

  return {
    index,
    name: typeof raw.name === 'string' ? raw.name : null,
    module: moduleName,
    moduleArgs,
    when: raw.when ?? null,
    loop: raw.loop ?? null,
    notify: notifyList,
    tags: tagsList,
  }
}

/**
 * 从 play 字典的 tasks/pre_tasks/post_tasks/handlers 段提取任务列表
 * 若某段为字典则退化为空数组，避免运行时异常
 * @param {Record<string, unknown>} play 单个 play 的字典
 * @param {'tasks'|'pre_tasks'|'post_tasks'|'handlers'} section 段名
 * @returns {Array<Record<string, unknown>>}
 */
function extractTaskList(play, section) {
  const raw = play[section]
  if (!Array.isArray(raw)) return []
  return raw.filter((item) => isObject(item))
}

/**
 * 解析单个 play，输出结构化数据
 * @param {Record<string, unknown>} play 原始 play 字典
 * @param {number} playIndex play 在 playbook 中的序号（从 1 起）
 */
function buildPlay(play, playIndex) {
  const preTasks = extractTaskList(play, 'pre_tasks').map((t, i) => extractTaskSummary(t, i))
  const tasks = extractTaskList(play, 'tasks').map((t, i) => extractTaskSummary(t, i))
  const postTasks = extractTaskList(play, 'post_tasks').map((t, i) => extractTaskSummary(t, i))
  const handlers = extractTaskList(play, 'handlers').map((t, i) => extractTaskSummary(t, i))

  return {
    index: playIndex,
    name: typeof play.name === 'string' ? play.name : null,
    hosts: normalizeHosts(play.hosts),
    become: play.become == null ? null : Boolean(play.become),
    gatherFacts: play.gather_facts == null ? null : Boolean(play.gather_facts),
    vars: isObject(play.vars) ? { ...play.vars } : {},
    varsFiles: Array.isArray(play.vars_files) ? play.vars_files.map((v) => String(v)) : [],
    preTasks,
    tasks,
    postTasks,
    handlers,
  }
}

/**
 * 计算 task 指向 handler 的有向边
 * 一个 task 的 notify 列表中每条记录对应一条边；handler 名称按「先 match name，后 match listen」的顺序匹配
 * @param {Array<{ notify:string[], name:string|null, module:string|null, index:number }>} sourceTasks 源任务集合（pre/tasks/post）
 * @param {Array<{ name:string|null, index:number }>} handlers handler 集合
 * @param {'preTasks'|'tasks'|'postTasks'} sourceKind 源任务种类（用于区分边的来源段）
 * @returns {Array<{ from:string, to:string, sourceKind:string, fromIndex:number, toIndex:number, notifyName:string }>}
 */
function buildNotifyEdges(sourceTasks, handlers, sourceKind) {
  const edges = []
  for (const task of sourceTasks) {
    for (const notifyName of task.notify) {
      const match = handlers.find((h) => h.name === notifyName)
      if (match) {
        edges.push({
          from: task.name || `task#${task.index + 1}`,
          to: match.name || `handler#${match.index + 1}`,
          sourceKind,
          fromIndex: task.index,
          toIndex: match.index,
          notifyName,
        })
      }
    }
  }
  return edges
}

/**
 * 解析 Ansible Playbook YAML 字符串
 * 成功时返回结构化数据（plays / notifyEdges），失败时返回错误行列
 * @param {string} yaml YAML 原文
 * @returns {{
 *   ok:boolean,
 *   error?:{ message:string, line:number, col:number, code?:string },
 *   result?:{
 *     plays: Array<ReturnType<typeof buildPlay>>,
 *     notifyEdges: Array<{ from:string, to:string, sourceKind:string, playIndex:number, fromIndex:number, toIndex:number, notifyName:string }>,
 *   }
 * }}
 */
function parsePlaybook(yaml) {
  if (typeof yaml !== 'string') {
    return {
      ok: false,
      error: { message: '输入必须为字符串', line: 1, col: 1 },
    }
  }

  const trimmed = yaml.trim()
  if (!trimmed) {
    return {
      ok: false,
      error: { message: 'YAML 内容为空', line: 1, col: 1 },
    }
  }

  const lc = new LineCounter()
  try {
    const doc = parseDocument(yaml, { lineCounter: lc, prettyErrors: true })
    if (doc.errors && doc.errors.length > 0) {
      const err = doc.errors[0]
      const pos = err.linePos && err.linePos.length > 0 ? err.linePos[0] : null
      return {
        ok: false,
        error: {
          message: err.message,
          line: pos ? pos.line : 1,
          col: pos ? pos.col : 1,
          code: err.code,
        },
      }
    }

    const data = doc.toJS()

    const playsRaw = Array.isArray(data) ? data : [data]
    const plays = []
    const notifyEdges = []
    for (let i = 0; i < playsRaw.length; i++) {
      const raw = playsRaw[i]
      if (!isObject(raw)) continue
      const play = buildPlay(raw, i + 1)
      plays.push(play)

      const preEdges = buildNotifyEdges(play.preTasks, play.handlers, 'preTasks')
      const taskEdges = buildNotifyEdges(play.tasks, play.handlers, 'tasks')
      const postEdges = buildNotifyEdges(play.postTasks, play.handlers, 'postTasks')
      for (const e of [...preEdges, ...taskEdges, ...postEdges]) {
        notifyEdges.push({ ...e, playIndex: i + 1 })
      }
    }

    return { ok: true, result: { plays, notifyEdges } }
  } catch (err) {
    return {
      ok: false,
      error: { message: err?.message || '未知解析错误', line: 1, col: 1 },
    }
  }
}

export {
  isObject,
  normalizeHosts,
  detectModule,
  extractTaskSummary,
  extractTaskList,
  buildPlay,
  buildNotifyEdges,
  parsePlaybook,
}
