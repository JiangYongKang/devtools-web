/**
 * 将任意值深度转换为字符串（用于统一扫描变量占位符）
 * 保持 JSON 字符串、数字、布尔、null 的直观形式；对数组/对象递归展开
 * @param {unknown} v
 * @returns {string}
 */
function stringifyAny(v) {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) return v.map(stringifyAny).join('\n')
  if (typeof v === 'object') {
    const parts = []
    for (const [k, val] of Object.entries(v)) {
      parts.push(`${k}: ${stringifyAny(val)}`)
    }
    return parts.join('\n')
  }
  return String(v)
}

/**
 * 提取一个 play 中声明的变量名集合（vars + vars_files 中出现的键）
 * 注意：vars_files 只记录文件名，不尝试读取内容，因此只收集 vars 字典的键
 * @param {{ vars: Record<string,unknown>, varsFiles: string[] }} play
 * @returns {Set<string>}
 */
function collectDeclaredVars(play) {
  const declared = new Set(['item', 'ansible_check_mode', 'ansible_diff_mode', 'ansible_forks', 'inventory_hostname', 'inventory_hostname_short', 'groups', 'hostvars', 'ansible_version', 'ansible_facts', 'ansible_play_batch', 'ansible_play_hosts', 'ansible_play_hosts_all', 'ansible_play_name', 'ansible_play_role_names', 'play_hosts', 'role_names', 'omit', 'true', 'false', 'yes', 'no'])
  if (play.vars && typeof play.vars === 'object') {
    for (const k of Object.keys(play.vars)) {
      declared.add(k)
    }
  }
  return declared
}

/**
 * 匹配 Jinja2 模板 {{ ... }} 片段（非贪婪）
 * 注意：此正则只处理单行常见形式，嵌套花括号或注释中的变量不在范围
 */
const TEMPLATE_RE = /\{\{\s*([\s\S]*?)\s*\}\}/g

/**
 * 从模板内容（{{ ... }} 内部）提取纯变量名（去掉 filter、成员访问首段）
 * 例："foo.bar" → "foo"；"foo | default('x')" → "foo"；"lookup('env','HOME')" → 跳过（以 lookup 开头）
 * @param {string} expr
 * @returns {string | null}
 */
function extractVariableName(expr) {
  const trimmed = expr.trim()
  if (!trimmed) return null
  if (/^lookup\s*\(/.test(trimmed)) return null
  const head = trimmed.split(/\|/)[0].trim()
  const base = head.split(/[.[\s]/)[0].trim()
  if (!base) return null
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(base)) return null
  return base
}

/**
 * 扫描一段文本中所有 {{ ... }} 片段
 * 返回结构化信息：原始模板、纯变量名（若可识别）、是否为 lookup 调用
 * @param {string} text
 * @returns {Array<{ template:string, variable:string|null, isLookup:boolean }>}
 */
function scanTemplates(text) {
  const results = []
  if (!text) return results
  let m
  TEMPLATE_RE.lastIndex = 0
  while ((m = TEMPLATE_RE.exec(text)) !== null) {
    const inner = m[1]
    const isLookup = /^lookup\s*\(/.test(inner.trim())
    const variable = isLookup ? null : extractVariableName(inner)
    results.push({
      template: m[0],
      variable,
      isLookup,
    })
  }
  return results
}

/**
 * 汇总单个 play 中所有任务 / handler 的模板引用
 * 扫描 name、module 参数、when、loop、notify、tags 以及 vars 内的字符串值
 * @param {{ preTasks:any[], tasks:any[], postTasks:any[], handlers:any[], vars: Record<string,unknown> }} play
 * @returns {{ refs:Array<{ kind:'task'|'handler'|'vars', section:string, index:number, variable:string|null, isLookup:boolean, template:string }>, undeclared:Set<string>, declared:Set<string> }}
 */
function collectPlayReferences(play) {
  const declared = collectDeclaredVars(play)
  const refs = []
  const undeclared = new Set()

  const sections = [
    { kind: 'task', name: 'preTasks', list: play.preTasks || [] },
    { kind: 'task', name: 'tasks', list: play.tasks || [] },
    { kind: 'task', name: 'postTasks', list: play.postTasks || [] },
    { kind: 'handler', name: 'handlers', list: play.handlers || [] },
  ]

  for (const { kind, name, list } of sections) {
    list.forEach((item, idx) => {
      const hay = [item.name, item.when, item.loop, item.moduleArgs, item.notify.join(','), item.tags.join(',')]
        .map(stringifyAny)
        .join('\n')
      const templates = scanTemplates(hay)
      for (const t of templates) {
        refs.push({
          kind,
          section: name,
          index: idx,
          variable: t.variable,
          isLookup: t.isLookup,
          template: t.template,
        })
        if (t.variable && !declared.has(t.variable)) {
          undeclared.add(t.variable)
        }
      }
    })
  }

  if (play.vars && typeof play.vars === 'object') {
    for (const [k, v] of Object.entries(play.vars)) {
      const hay = stringifyAny(v)
      const templates = scanTemplates(hay)
      for (const t of templates) {
        refs.push({
          kind: 'vars',
          section: 'vars',
          index: -1,
          variable: t.variable,
          isLookup: t.isLookup,
          template: t.template,
        })
        if (t.variable && !declared.has(t.variable)) {
          undeclared.add(t.variable)
        }
      }
    }
  }

  return { refs, undeclared, declared }
}

/**
 * 对 parsePlaybook 结果的所有 play 进行变量引用扫描
 * @param {{ plays:any[] }} parsed
 * @returns {Array<{ playIndex:number, refs:any[], undeclared:string[], declared:string[] }>}
 */
function analyzeAllVariables(parsed) {
  if (!parsed || !Array.isArray(parsed.plays)) return []
  return parsed.plays.map((play) => {
    const { refs, undeclared, declared } = collectPlayReferences(play)
    return {
      playIndex: play.index,
      refs,
      undeclared: Array.from(undeclared),
      declared: Array.from(declared),
    }
  })
}

export {
    analyzeAllVariables, collectDeclaredVars, collectPlayReferences, extractVariableName,
    scanTemplates, stringifyAny
}

