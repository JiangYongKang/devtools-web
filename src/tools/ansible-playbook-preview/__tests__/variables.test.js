import { describe, test, expect } from 'vitest'
import {
  extractVariableName,
  scanTemplates,
  collectPlayReferences,
  analyzeAllVariables,
} from '../logic/variables.js'
import { parsePlaybook } from '../logic/parser.js'
import { DEPLOY_WITH_HANDLER, VARS_AND_NOTIFY } from '../logic/examples.js'

describe('extractVariableName', () => {
  test('简单变量名', () => {
    expect(extractVariableName('foo')).toBe('foo')
  })
  test('带成员访问', () => {
    expect(extractVariableName('foo.bar.baz')).toBe('foo')
  })
  test('带 filter', () => {
    expect(extractVariableName('foo | default("x")')).toBe('foo')
  })
  test('lookup 跳过', () => {
    expect(extractVariableName("lookup('env','HOME')")).toBeNull()
  })
  test('非法标识跳过', () => {
    expect(extractVariableName('123abc')).toBeNull()
  })
})

describe('scanTemplates', () => {
  test('多模板全部命中', () => {
    const r = scanTemplates("{{ a }} and {{ b | upper }} and {{ lookup('k', 'v') }}")
    expect(r).toHaveLength(3)
    expect(r[0].variable).toBe('a')
    expect(r[1].variable).toBe('b')
    expect(r[2].isLookup).toBe(true)
    expect(r[2].variable).toBeNull()
  })
})

describe('collectPlayReferences 与 analyzeAllVariables', () => {
  test('部署示例中 server_name / nginx_port 已声明', () => {
    const parsed = parsePlaybook(DEPLOY_WITH_HANDLER)
    expect(parsed.ok).toBe(true)
    const analysis = analyzeAllVariables(parsed.result)
    const play = analysis[0]
    expect(play.declared).toContain('nginx_port')
    expect(play.declared).toContain('server_name')
    const refs = play.refs.filter((r) => r.variable)
    const names = new Set(refs.map((r) => r.variable))
    expect(names.has('server_name')).toBe(true)
  })

  test('vars_notify 示例引用了 app_user/app_dir/version', () => {
    const parsed = parsePlaybook(VARS_AND_NOTIFY)
    expect(parsed.ok).toBe(true)
    const analysis = analyzeAllVariables(parsed.result)
    const refs = analysis[0].refs.filter((r) => r.variable)
    const names = new Set(refs.map((r) => r.variable))
    expect(names.has('app_dir')).toBe(true)
    expect(names.has('version')).toBe(true)
  })

  test('未定义变量提示：引用 missing_var', () => {
    const pb = `---
- hosts: localhost
  vars:
    known: yes
  tasks:
    - name: use
      debug:
        msg: "{{ known }} {{ missing_var }}"
`
    const parsed = parsePlaybook(pb)
    const analysis = analyzeAllVariables(parsed.result)
    expect(analysis[0].undeclared).toContain('missing_var')
    expect(analysis[0].undeclared).not.toContain('known')
  })
})
