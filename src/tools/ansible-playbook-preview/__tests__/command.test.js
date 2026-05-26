import { describe, test, expect } from 'vitest'
import {
  buildInventoryArg,
  sanitizePlaybookName,
  buildDryRunCommand,
  getCheckModeNotice,
} from '../logic/command.js'

describe('buildInventoryArg', () => {
  test('空主机默认 inventory.ini', () => {
    expect(buildInventoryArg([])).toEqual({ inventoryArg: 'inventory.ini', inventoryIsFile: true })
  })
  test('单具体主机使用 host, 形式', () => {
    expect(buildInventoryArg(['web01'])).toEqual({ inventoryArg: 'web01,', inventoryIsFile: false })
  })
  test('all 使用文件占位', () => {
    expect(buildInventoryArg(['all'])).toEqual({ inventoryArg: 'inventory.ini', inventoryIsFile: true })
  })
  test('多主机使用文件占位', () => {
    expect(buildInventoryArg(['web', 'db'])).toEqual({ inventoryArg: 'inventory.ini', inventoryIsFile: true })
  })
})

describe('sanitizePlaybookName', () => {
  test('去掉危险字符', () => {
    expect(sanitizePlaybookName('my playbook:deploy.yml')).toBe('my_playbook_deploy.yml')
  })
  test('空值回退', () => {
    expect(sanitizePlaybookName('')).toBe('playbook.yml')
  })
})

describe('buildDryRunCommand', () => {
  test('基本命令拼装', () => {
    const r = buildDryRunCommand(['webservers'], 'deploy.yml')
    expect(r.playbook).toBe('deploy.yml')
    expect(r.inventory).toBe('webservers,')
    expect(r.command).toContain('ansible-playbook')
    expect(r.command).toContain('--check')
    expect(r.command).toContain('--diff')
    expect(r.command).not.toContain('--become')
  })

  test('become=true 追加 --become', () => {
    const r = buildDryRunCommand(['all'], 'deploy.yml', { become: true })
    expect(r.command).toContain('--become')
  })

  test('inventoryOverride 覆盖占位符', () => {
    const r = buildDryRunCommand(['web'], 'x.yml', { inventoryOverride: 'staging.ini' })
    expect(r.inventory).toBe('staging.ini')
    expect(r.command).toContain('-i staging.ini')
  })
})

describe('getCheckModeNotice', () => {
  test('返回非空文本', () => {
    expect(getCheckModeNotice().length).toBeGreaterThan(10)
  })
})
