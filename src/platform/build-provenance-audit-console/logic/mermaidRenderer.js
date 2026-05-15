/**
 * 解析 Mermaid 时序图语法
 * 提取参与者和消息流
 * @param {string} mermaidCode - Mermaid 时序图代码
 * @returns {Object} 包含 participants 和 messages 的解析结果
 */
export function parseSequenceDiagram(mermaidCode) {
  const lines = mermaidCode.split('\n').map(l => l.trim()).filter(Boolean)
  const participants = []
  const messages = []
  
  lines.forEach(line => {
    const participantMatch = line.match(/^participant\s+(\w+)(?:\s+as\s+(.+))?$/i)
    if (participantMatch) {
      const [, id, alias] = participantMatch
      participants.push({
        id,
        alias: alias || id
      })
      return
    }
    
    const messageMatch = line.match(/^(\w+)\s*(->|-->>?|->>|-->|-\|>)\s*(\w+)\s*:\s*(.+)$/)
    if (messageMatch) {
      const [, from, arrow, to, text] = messageMatch
      messages.push({
        from,
        to,
        text,
        arrow,
        type: arrow.includes('--') ? 'dashed' : 'solid',
        isResponse: arrow.includes('>>')
      })
    }
  })
  
  return { participants, messages }
}

/**
 * 使用 Canvas 绘制时序图
 * @param {HTMLCanvasElement} canvas - Canvas DOM 元素
 * @param {string} mermaidCode - Mermaid 时序图代码
 * @param {Object} options - 渲染选项
 */
export function renderSequenceDiagram(canvas, mermaidCode, options = {}) {
  const {
    participantWidth = 120,
    participantHeight = 40,
    messageSpacing = 60,
    paddingTop = 50,
    paddingLeft = 30,
    fontSize = 13,
    fontFamily = '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  } = options
  
  const { participants, messages } = parseSequenceDiagram(mermaidCode)
  
  if (participants.length === 0) {
    const ctx = canvas.getContext('2d')
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.fillStyle = '#6b7280'
    ctx.textAlign = 'center'
    ctx.fillText('无法解析时序图', canvas.width / 2, canvas.height / 2)
    return
  }
  
  const canvasWidth = paddingLeft * 2 + participants.length * participantWidth
  const canvasHeight = paddingTop * 2 + participantHeight + messages.length * messageSpacing
  
  canvas.width = Math.max(canvasWidth, 600)
  canvas.height = Math.max(canvasHeight, 300)
  
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  
  const participantXPositions = {}
  participants.forEach((p, index) => {
    participantXPositions[p.id] = paddingLeft + index * participantWidth + participantWidth / 2
  })
  
  participants.forEach(participant => {
    const x = participantXPositions[participant.id]
    const y = paddingTop
    
    ctx.fillStyle = '#e0e7ff'
    ctx.strokeStyle = '#6366f1'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(x - participantWidth / 2, y - participantHeight / 2, participantWidth, participantHeight, 6)
    ctx.fill()
    ctx.stroke()
    
    ctx.fillStyle = '#1e1b4b'
    ctx.font = `bold ${fontSize}px ${fontFamily}`
    ctx.fillText(participant.alias, x, y)
    ctx.font = `${fontSize}px ${fontFamily}`
  })
  
  const lifelineStartY = paddingTop + participantHeight / 2
  const lifelineEndY = canvasHeight - paddingTop
  
  participants.forEach(participant => {
    const x = participantXPositions[participant.id]
    ctx.strokeStyle = '#9ca3af'
    ctx.lineWidth = 1
    ctx.setLineDash([5, 5])
    ctx.beginPath()
    ctx.moveTo(x, lifelineStartY)
    ctx.lineTo(x, lifelineEndY)
    ctx.stroke()
    ctx.setLineDash([])
  })
  
  messages.forEach((message, index) => {
    const y = lifelineStartY + (index + 1) * messageSpacing
    const fromX = participantXPositions[message.from]
    const toX = participantXPositions[message.to]
    
    if (!fromX || !toX) return
    
    ctx.strokeStyle = message.type === 'dashed' ? '#6b7280' : '#374151'
    ctx.lineWidth = 1.5
    
    if (message.type === 'dashed') {
      ctx.setLineDash([4, 4])
    } else {
      ctx.setLineDash([])
    }
    
    const isReverse = fromX > toX
    const startX = isReverse ? fromX - 5 : fromX + 5
    const endX = isReverse ? toX + 5 : toX - 5
    
    ctx.beginPath()
    ctx.moveTo(startX, y)
    ctx.lineTo(endX, y)
    ctx.stroke()
    
    ctx.beginPath()
    if (message.isResponse) {
      ctx.moveTo(endX, y)
      ctx.lineTo(endX - 8, y - 4)
      ctx.lineTo(endX - 8, y + 4)
      ctx.closePath()
    } else {
      ctx.moveTo(endX + (isReverse ? 8 : -8), y - 4)
      ctx.lineTo(endX, y)
      ctx.lineTo(endX + (isReverse ? 8 : -8), y + 4)
    }
    ctx.fillStyle = '#374151'
    ctx.fill()
    
    ctx.setLineDash([])
    
    const textX = (fromX + toX) / 2
    ctx.fillStyle = '#374151'
    ctx.font = `${fontSize}px ${fontFamily}`
    ctx.fillText(message.text, textX, y - 12)
  })
}

/**
 * 将 Canvas 时序图转换为 SVG 格式
 * @param {string} mermaidCode - Mermaid 时序图代码
 * @param {Object} options - 渲染选项
 * @returns {string} SVG 字符串
 */
export function renderSequenceDiagramSvg(mermaidCode, options = {}) {
  const {
    participantWidth = 120,
    participantHeight = 40,
    messageSpacing = 60,
    paddingTop = 50,
    paddingLeft = 30,
    fontSize = 13,
    fontFamily = '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif'
  } = options
  
  const { participants, messages } = parseSequenceDiagram(mermaidCode)
  
  if (participants.length === 0) {
    return '<svg xmlns="http://www.w3.org/2000/svg"><text x="50%" y="50%" text-anchor="middle">无法解析时序图</text></svg>'
  }
  
  const canvasWidth = paddingLeft * 2 + participants.length * participantWidth
  const canvasHeight = paddingTop * 2 + participantHeight + messages.length * messageSpacing
  
  const width = Math.max(canvasWidth, 600)
  const height = Math.max(canvasHeight, 300)
  
  const participantXPositions = {}
  participants.forEach((p, index) => {
    participantXPositions[p.id] = paddingLeft + index * participantWidth + participantWidth / 2
  })
  
  const lifelineStartY = paddingTop + participantHeight / 2
  const lifelineEndY = height - paddingTop
  
  let svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .participant-box { fill: #e0e7ff; stroke: #6366f1; stroke-width: 2; rx: 6; }
    .participant-text { font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: bold; fill: #1e1b4b; text-anchor: middle; }
    .lifeline { stroke: #9ca3af; stroke-width: 1; stroke-dasharray: 5 5; }
    .message-line { stroke: #374151; stroke-width: 1.5; }
    .message-line-dashed { stroke: #6b7280; stroke-width: 1.5; stroke-dasharray: 4 4; }
    .message-arrow { fill: #374151; }
    .message-text { font-family: ${fontFamily}; font-size: ${fontSize}px; fill: #374151; text-anchor: middle; }
  </style>
`
  
  participants.forEach(participant => {
    const x = participantXPositions[participant.id]
    const y = paddingTop
    
    svgContent += `
  <rect class="participant-box"
        x="${x - participantWidth / 2}"
        y="${y - participantHeight / 2}"
        width="${participantWidth}"
        height="${participantHeight}"/>
  <text class="participant-text" x="${x}" y="${y}" dominant-baseline="middle">
    ${participant.alias}
  </text>
`
    
    svgContent += `
  <line class="lifeline"
        x1="${x}" y1="${lifelineStartY}"
        x2="${x}" y2="${lifelineEndY}"/>
`
  })
  
  messages.forEach((message, index) => {
    const y = lifelineStartY + (index + 1) * messageSpacing
    const fromX = participantXPositions[message.from]
    const toX = participantXPositions[message.to]
    
    if (!fromX || !toX) return
    
    const lineClass = message.type === 'dashed' ? 'message-line-dashed' : 'message-line'
    const isReverse = fromX > toX
    const startX = isReverse ? fromX - 5 : fromX + 5
    const endX = isReverse ? toX + 5 : toX - 5
    
    svgContent += `
  <line class="${lineClass}"
        x1="${startX}" y1="${y}"
        x2="${endX}" y2="${y}"/>
`
    
    if (message.isResponse) {
      svgContent += `
  <polygon class="message-arrow" points="${endX},${y} ${endX - 8},${y - 4} ${endX - 8},${y + 4}"/>
`
    } else {
      const arrowOffset = isReverse ? 8 : -8
      svgContent += `
  <polygon class="message-arrow" points="${endX + arrowOffset},${y - 4} ${endX},${y} ${endX + arrowOffset},${y + 4}"/>
`
    }
    
    const textX = (fromX + toX) / 2
    svgContent += `
  <text class="message-text" x="${textX}" y="${y - 12}" dominant-baseline="middle">
    ${message.text}
  </text>
`
  })
  
  svgContent += '</svg>'
  
  return svgContent
}

export default {
  parseSequenceDiagram,
  renderSequenceDiagram,
  renderSequenceDiagramSvg
}
