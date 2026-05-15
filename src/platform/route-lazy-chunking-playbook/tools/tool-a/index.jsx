export function ToolA() {
  return (
    <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
      <h3>工具 A - 数据分析面板</h3>
      <p>这是工具 A 的占位内容，专注于数据分析功能。</p>
      <p>所属 Chunk: tool-a (互斥 Chunk)</p>
      <p>共享依赖: shared-ui, shared-charts</p>
    </div>
  )
}

export default ToolA
