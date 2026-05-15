const NODE_DEFAULTS = {
  WIDTH: 120,
  HEIGHT: 60,
  MIN_WIDTH: 80,
  MIN_HEIGHT: 40,
}

const EDGE_STYLES = {
  POLYLINE: 'polyline',
  BEZIER: 'bezier',
}

const LAYOUT_ALGORITHMS = {
  SUGIYAMA: 'sugiyama',
  FORCE_DIRECTED: 'force_directed',
}

const SUPPORT_STATUS = {
  FULL: 'supported',
  PARTIAL: 'partial',
  NOT_SUPPORTED: 'not_supported',
}

const ERROR_CODES = {
  CYCLE_DETECTED: 'CycleDetected',
  INVALID_SCHEMA: 'InvalidSchema',
  WORKER_FAILED: 'WorkerFailed',
  LAYOUT_TIMEOUT: 'LayoutTimeout',
}

const LAYOUT_DEFAULTS = {
  SUGIYAMA: {
    nodeWidth: NODE_DEFAULTS.WIDTH,
    nodeHeight: NODE_DEFAULTS.HEIGHT,
    layerGap: 100,
    nodeGap: 30,
    maxIterations: 100,
    epsilon: 0.1,
  },
  FORCE_DIRECTED: {
    repulsion: 200,
    attraction: 0.01,
    damping: 0.9,
    maxIterations: 300,
    epsilon: 0.5,
    centerGravity: 0.01,
  },
}

const CANVAS_DEFAULTS = {
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 3,
  ZOOM_STEP: 0.1,
  SNAP_THRESHOLD: 10,
  GRID_SIZE: 20,
}

const STACK_LIMIT = 50

const SCHEMA_VERSION = '1.0.0'

export {
  NODE_DEFAULTS,
  EDGE_STYLES,
  LAYOUT_ALGORITHMS,
  SUPPORT_STATUS,
  ERROR_CODES,
  LAYOUT_DEFAULTS,
  CANVAS_DEFAULTS,
  STACK_LIMIT,
  SCHEMA_VERSION,
}
