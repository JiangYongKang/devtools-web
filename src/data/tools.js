/** 当前已落地的工具条目（151～160），首页列表与 ToolPage 实现一致 */
export const tools = [
  {
    id: '151',
    name: 'Cron 高级调度器',
    summary:
      '标准五段与 Quartz 六/七段解析、未来 N 次触发序列、多时区对照与夏令时边界标注、非法日期提示',
  },
  {
    id: '152',
    name: 'Kubernetes Manifest 校验器',
    summary:
      '多文档 YAML 解析、apiVersion/kind 摘要、Probe/Resource 字段检查、风险警告与 YAML→JSON 预览',
  },
  {
    id: '153',
    name: 'Docker Compose 依赖图',
    summary:
      'depends_on/healthcheck 解析、服务依赖 DAG、启动顺序拓扑批次与端口映射表',
  },
  {
    id: '154',
    name: 'Terraform HCL / Plan 解析器',
    summary:
      'HCL 片段缩进格式化、terraform plan 文本解析、resource 变更摘要与 drift 分级标记',
  },
  {
    id: '155',
    name: 'Ansible Playbook 预览器',
    summary:
      'Playbook 任务链预览、handler/notify 关系图、变量插值提示与 ansible-playbook dry-run 命令生成',
  },
  {
    id: '156',
    name: 'GitHub Actions Workflow 可视化',
    summary:
      'workflow YAML 解析、job 依赖 DAG、matrix 组合展开与 secrets 占位说明',
  },
  {
    id: '157',
    name: 'Helm Chart 模板渲染器',
    summary:
      'Chart.yaml/values.yaml/模板解析、Values 静态注入预览、tpl 函数调试与多文档 Manifest 展示',
  },
  {
    id: '158',
    name: 'Nginx/Caddy 配置检视器',
    summary:
      '双方言配置解析、语法高亮、upstream 块摘要、虚拟 include 文件合并与循环检测',
  },
  {
    id: '159',
    name: 'systemd Unit 解析器',
    summary:
      'Unit/Service/Install 等分段展示、Requires/After 依赖图、启动顺序批次与常用字段摘要',
  },
  {
    id: '160',
    name: 'Prometheus 告警规则校验器',
    summary:
      '告警/录制规则 YAML 解析、PromQL 子集检查、标签模板预览与 firing 样例求值',
  },
]

export function getToolById(id) {
  return tools.find((t) => t.id === id)
}
