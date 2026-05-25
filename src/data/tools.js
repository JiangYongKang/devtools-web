/** 当前已落地的工具条目（121～130），首页列表与 ToolPage 实现一致 */
export const tools = [
  {
    id: '121',
    name: 'OAuth2 PKCE 流程模拟器',
    summary:
      'code_verifier/challenge 生成，授权 URL 组装，回调参数解析与 token 交换草稿',
  },
  {
    id: '122',
    name: 'JWT 签名验证工作台',
    summary:
      'JWT 三段解析，JWKS 验签，exp/nbf/iss/aud claims 校验与 clock skew 配置',
  },
  {
    id: '123',
    name: 'WebAuthn/FIDO2 解释器',
    summary:
      '注册/断言选项 JSON 预览，clientDataJSON 与 authData 摘要，RP ID 与 capability 说明',
  },
  {
    id: '124',
    name: 'SAML 断言解码器',
    summary:
      'SAML 2.0 Base64/DEFLATE 解码，Issuer/Subject/Conditions 摘要与时效校验',
  },
  {
    id: '125',
    name: 'CSRF 防护策略对比',
    summary:
      'Double Submit Cookie、Synchronizer Token、SameSite 三种模型交互剧本与修复 checklist',
  },
  {
    id: '126',
    name: 'CSP 指令解析器',
    summary:
      'Content-Security-Policy 指令解析，冲突检测，违规样例模拟与 report JSON 预览',
  },
  {
    id: '127',
    name: 'CORS 预检诊断',
    summary:
      '简单/非简单请求判定，OPTIONS 预检模拟，Allow-Origin 匹配与修复建议',
  },
  {
    id: '128',
    name: 'SRI 哈希生成器',
    summary:
      'sha256/sha384/sha512 integrity 生成，批量 manifest 与 digest 校验模式',
  },
  {
    id: '129',
    name: '密钥派生参数对比',
    summary:
      'PBKDF2/scrypt/Argon2 参数配置，派生耗时基准与弱参数警告',
  },
  {
    id: '130',
    name: '非对称密钥转换器',
    summary:
      'RSA/EC/Ed25519 密钥对生成，PEM/JWK/SPKI 互转与公钥指纹摘要',
  },
]

export function getToolById(id) {
  return tools.find((t) => t.id === id)
}
