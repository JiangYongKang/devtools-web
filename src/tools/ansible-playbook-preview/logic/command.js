/**
 * 将 hosts 列表转换为适合命令行 -i 参数的占位符
 * 若包含 all 或 多主机则使用 inventory.ini；单主机则使用 host, 形式
 * @param {string[]} hosts
 * @returns {{ inventoryArg:string, inventoryIsFile:boolean }}
 */
function buildInventoryArg(hosts) {
  const list = Array.isArray(hosts) ? hosts : []
  const unique = Array.from(new Set(list.filter(Boolean)))
  if (unique.length === 0) {
    return { inventoryArg: 'inventory.ini', inventoryIsFile: true }
  }
  if (unique.length === 1 && unique[0].toLowerCase() !== 'all' && unique[0].toLowerCase() !== 'localhost') {
    return { inventoryArg: `${unique[0]},`, inventoryIsFile: false }
  }
  return { inventoryArg: 'inventory.ini', inventoryIsFile: true }
}

/**
 * 将给定文件名规范为 shell 安全形式（去掉路径分隔符、空格）
 * @param {string} name
 * @returns {string}
 */
function sanitizePlaybookName(name) {
  if (!name) return 'playbook.yml'
  const trimmed = String(name).trim()
  if (!trimmed) return 'playbook.yml'
  return trimmed.replace(/[<>:"/\\|?*\s]+/g, '_')
}

/**
 * 根据 hosts / playbook 文件名拼装 ansible-playbook --check --diff 草稿命令
 * inventory 占位符可编辑（外部由 UI 提供输入框覆盖）
 * @param {string[]} hosts play 的 hosts 列表
 * @param {string} playbookName playbook 文件名（未提供时回退 playbook.yml）
 * @param {{ inventoryOverride?:string, become?:boolean|null }} [opts]
 * @returns {{ command:string, inventory:string, become:boolean|null, playbook:string, checkMode:true, diffMode:true }}
 */
function buildDryRunCommand(hosts, playbookName, opts = {}) {
  const playbook = sanitizePlaybookName(playbookName)
  const defaultInv = buildInventoryArg(hosts)
  const inventory = opts.inventoryOverride || defaultInv.inventoryArg
  const become = opts.become == null ? null : Boolean(opts.become)

  const parts = ['ansible-playbook']
  parts.push('-i', inventory)
  parts.push(playbook)
  parts.push('--check')
  parts.push('--diff')
  if (become === true) parts.push('--become')

  return {
    command: parts.join(' '),
    inventory,
    become: become === true ? true : become === false ? false : null,
    playbook,
    checkMode: true,
    diffMode: true,
  }
}

/**
 * 生成关于 --check 限制的说明（纯文本，供 UI 展示）
 * @returns {string}
 */
function getCheckModeNotice() {
  return [
    '说明：--check（dry-run）仅在远端不做任何实际修改，用于预览变更。',
    '限制：依赖实际远端状态的任务（如 command/shell/script 等未实现 check_mode 的模块）在 dry-run 中可能跳过或失败；',
    '涉及条件判断 when: 时基于当前 facts 估算，未必与真实执行一致。',
    '--diff 仅对支持 diff 的模块（如 template/copy/file/lineinfile）输出文件差异；command 等模块无 diff。',
  ].join('\n')
}

export { buildInventoryArg, sanitizePlaybookName, buildDryRunCommand, getCheckModeNotice }
