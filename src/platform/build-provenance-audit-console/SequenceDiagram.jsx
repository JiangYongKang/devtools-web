import React, { useEffect, useRef, useState } from 'react'
import { renderSequenceDiagram, renderSequenceDiagramSvg } from './logic/mermaidRenderer'

const SequenceDiagram = ({ code, renderMode = 'svg', className = '' }) => {
  const canvasRef = useRef(null)
  const [svgContent, setSvgContent] = useState('')

  useEffect(() => {
    if (renderMode === 'canvas' && canvasRef.current) {
      renderSequenceDiagram(canvasRef.current, code)
    } else if (renderMode === 'svg') {
      const svg = renderSequenceDiagramSvg(code)
      setSvgContent(svg)
    }
  }, [code, renderMode])

  return (
    <div className={`sequence-diagram-container ${className}`}>
      {renderMode === 'canvas' ? (
        <canvas ref={canvasRef} className="sequence-diagram-canvas" />
      ) : (
        <div 
          className="sequence-diagram-svg"
          dangerouslySetInnerHTML={{ __html: svgContent }}
        />
      )}
    </div>
  )
}

export default SequenceDiagram
