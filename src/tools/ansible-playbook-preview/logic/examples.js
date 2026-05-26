/**
 * 部署任务示例：安装 nginx、下发配置、触发重启 handler
 * 展示 task → handler 的 notify 边与模板变量
 */
const DEPLOY_WITH_HANDLER = `---
- name: 部署 Nginx 并通过 handler 重载
  hosts: webservers
  become: true
  vars:
    nginx_port: 8080
    server_name: example.com
  tasks:
    - name: 安装 nginx 包
      yum:
        name: nginx
        state: present

    - name: 下发站点配置
      template:
        src: templates/site.conf.j2
        dest: /etc/nginx/conf.d/{{ server_name }}.conf
        mode: '0644'
      notify: restart nginx

    - name: 启动 nginx 服务
      service:
        name: nginx
        state: started
        enabled: true
  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
`

/**
 * 条件任务示例：根据 ansible_os_family 选择合适的包管理器
 * 展示 when 条件与 loop 列表
 */
const WHEN_CONDITIONAL_TASKS = `---
- name: 按操作系统条件安装依赖
  hosts: all
  gather_facts: true
  vars:
    required_packages:
      - curl
      - git
      - vim
  tasks:
    - name: Debian 系安装基础包
      apt:
        name: "{{ required_packages }}"
        state: present
        update_cache: true
      when: ansible_os_family == "Debian"
      tags:
        - packages

    - name: RedHat 系安装基础包
      yum:
        name: "{{ item }}"
        state: present
      loop: "{{ required_packages }}"
      when: ansible_os_family == "RedHat"
      tags:
        - packages

    - name: 确认当前主机名
      debug:
        msg: "Host {{ inventory_hostname }} 已完成包安装"
`

/**
 * 变量与 notify 示例：自定义变量引用 + 多 handler 通知
 */
const VARS_AND_NOTIFY = `---
- name: 多服务编排（变量 + notify）
  hosts: app_servers
  become: true
  vars:
    app_user: deploy
    app_dir: /opt/myapp
    version: "1.4.2"
  tasks:
    - name: 下发应用配置
      template:
        src: app.conf.j2
        dest: "{{ app_dir }}/config/app-{{ version }}.yaml"
        owner: "{{ app_user }}"
        mode: '0640'
      notify:
        - restart app
        - validate config

    - name: 校验配置文件
      command: "myapp validate --config {{ app_dir }}/config/app-{{ version }}.yaml"
      notify: restart app
  handlers:
    - name: restart app
      systemd:
        name: myapp
        state: restarted

    - name: validate config
      command: "myapp check --config {{ app_dir }}/config/app-{{ version }}.yaml"
`

const EXAMPLES = [
  {
    id: 'deploy-handler',
    name: '含 handler 的部署',
    description: 'Nginx 部署 + template 触发重启 handler',
    yaml: DEPLOY_WITH_HANDLER,
  },
  {
    id: 'when-conditional',
    name: 'when 条件任务',
    description: '按 OS Family 分支选择包管理器',
    yaml: WHEN_CONDITIONAL_TASKS,
  },
  {
    id: 'vars-notify',
    name: 'vars 与 notify',
    description: '自定义变量引用与多 handler 通知',
    yaml: VARS_AND_NOTIFY,
  },
]

export { DEPLOY_WITH_HANDLER, EXAMPLES, VARS_AND_NOTIFY, WHEN_CONDITIONAL_TASKS }

