import { useState, useEffect } from 'react'

export default function LoadingBar({ isLoading = false }) {
  const [visible, setVisible] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (isLoading) {
      setComplete(false)
      setVisible(true)
    } else if (visible) {
      setComplete(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setComplete(false)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isLoading, visible])

  if (!visible) return null

  const classes = ['loading-bar']
  if (isLoading) classes.push('active')
  if (complete) classes.push('complete')

  return (
    <div
      role="progressbar"
      aria-hidden={true}
      aria-label={isLoading ? '页面加载中' : '加载完成'}
      className={classes.join(' ')}
    />
  )
}
