import { runLayout } from './layout.js'

self.onmessage = function(e) {
  const { algorithm, nodes, edges, options } = e.data

  try {
    const result = runLayout(algorithm, nodes, edges, options)
    self.postMessage({
      success: true,
      ...result,
    })
  } catch (error) {
    self.postMessage({
      success: false,
      error: error.message,
    })
  }
}
