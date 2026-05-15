const ERROR_CODES = {
  IMAGE_LOAD_ERROR: 'IMAGE_LOAD_ERROR',
  INVALID_IMAGE_FORMAT: 'INVALID_IMAGE_FORMAT',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  CANVAS_NOT_SUPPORTED: 'CANVAS_NOT_SUPPORTED',
  RENDER_ERROR: 'RENDER_ERROR',
  TEXT_WATERMARK_EMPTY: 'TEXT_WATERMARK_EMPTY',
  WATERMARK_OUT_OF_BOUNDS: 'WATERMARK_OUT_OF_BOUNDS',
  INVALID_COLOR_FORMAT: 'INVALID_COLOR_FORMAT',
  INVALID_ROTATION_ANGLE: 'INVALID_ROTATION_ANGLE',
  ABORTED: 'ABORTED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  XSS_DETECTED: 'XSS_DETECTED',
}

const ERROR_MESSAGES = {
  [ERROR_CODES.IMAGE_LOAD_ERROR]: '图片加载失败',
  [ERROR_CODES.INVALID_IMAGE_FORMAT]: '无效的图片格式',
  [ERROR_CODES.IMAGE_TOO_LARGE]: '图片尺寸过大，超出内存限制',
  [ERROR_CODES.CANVAS_NOT_SUPPORTED]: '浏览器不支持 Canvas',
  [ERROR_CODES.RENDER_ERROR]: '渲染水印时出错',
  [ERROR_CODES.TEXT_WATERMARK_EMPTY]: '水印文本不能为空',
  [ERROR_CODES.WATERMARK_OUT_OF_BOUNDS]: '水印位置超出画布边界',
  [ERROR_CODES.INVALID_COLOR_FORMAT]: '无效的颜色格式',
  [ERROR_CODES.INVALID_ROTATION_ANGLE]: '无效的旋转角度',
  [ERROR_CODES.ABORTED]: '操作已取消',
  [ERROR_CODES.UNKNOWN_ERROR]: '未知错误',
  [ERROR_CODES.XSS_DETECTED]: '检测到潜在的XSS攻击',
}

const RECOVERY_HINTS = {
  [ERROR_CODES.IMAGE_LOAD_ERROR]: '请检查图片文件是否损坏，或尝试使用其他图片',
  [ERROR_CODES.INVALID_IMAGE_FORMAT]: '请使用 JPG、PNG、WebP、GIF 等常见图片格式',
  [ERROR_CODES.IMAGE_TOO_LARGE]: '请压缩图片尺寸后再尝试，或使用离屏渲染降级方案',
  [ERROR_CODES.CANVAS_NOT_SUPPORTED]: '请升级到现代浏览器（Chrome、Firefox、Safari、Edge）',
  [ERROR_CODES.RENDER_ERROR]: '请尝试调整水印参数，或重新上传图片',
  [ERROR_CODES.TEXT_WATERMARK_EMPTY]: '请输入水印文本内容',
  [ERROR_CODES.WATERMARK_OUT_OF_BOUNDS]: '请调整边距或缩放比例，确保水印在画布内',
  [ERROR_CODES.INVALID_COLOR_FORMAT]: '请使用有效的颜色格式，如 #RRGGBB、rgba(r,g,b,a)',
  [ERROR_CODES.INVALID_ROTATION_ANGLE]: '请输入有效的旋转角度（0-360度）',
  [ERROR_CODES.ABORTED]: '操作已取消，可重新尝试',
  [ERROR_CODES.UNKNOWN_ERROR]: '请刷新页面后重试，如问题持续请反馈',
  [ERROR_CODES.XSS_DETECTED]: '请检查输入内容，移除潜在的危险脚本或标签',
}

const ANCHOR_POSITIONS = {
  TOP_LEFT: 'top_left',
  TOP_CENTER: 'top_center',
  TOP_RIGHT: 'top_right',
  CENTER_LEFT: 'center_left',
  CENTER: 'center',
  CENTER_RIGHT: 'center_right',
  BOTTOM_LEFT: 'bottom_left',
  BOTTOM_CENTER: 'bottom_center',
  BOTTOM_RIGHT: 'bottom_right',
}

const WATERMARK_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
}

const TILE_MODES = {
  NONE: 'none',
  GRID: 'grid',
  DIAGONAL: 'diagonal',
}

const EXIF_ORIENTATIONS = {
  1: { rotation: 0, flipX: false, flipY: false, description: '正常' },
  2: { rotation: 0, flipX: true, flipY: false, description: '水平翻转' },
  3: { rotation: 180, flipX: false, flipY: false, description: '旋转180度' },
  4: { rotation: 0, flipX: false, flipY: true, description: '垂直翻转' },
  5: { rotation: 90, flipX: true, flipY: false, description: '顺时针90度+水平翻转' },
  6: { rotation: 90, flipX: false, flipY: false, description: '顺时针90度' },
  7: { rotation: 270, flipX: true, flipY: false, description: '逆时针90度+水平翻转' },
  8: { rotation: 270, flipX: false, flipY: false, description: '逆时针90度' },
}

const DEFAULT_TEXT_WATERMARK = {
  content: 'WATERMARK',
  fontFamily: 'Arial, sans-serif',
  fontSize: 32,
  color: 'rgba(0, 0, 0, 0.3)',
  rotation: 0,
  opacity: 0.3,
  antialias: true,
  tileMode: TILE_MODES.NONE,
  tileSpacingX: 100,
  tileSpacingY: 100,
  tileOffsetY: 0,
  anchor: ANCHOR_POSITIONS.CENTER,
  marginX: 0,
  marginY: 0,
}

const DEFAULT_IMAGE_WATERMARK = {
  anchor: ANCHOR_POSITIONS.BOTTOM_RIGHT,
  marginX: 20,
  marginY: 20,
  maxWidth: 100,
  maxHeight: 100,
  scale: 1,
  opacity: 0.8,
}

const MAX_TEXTURE_SIZE = 4096
const MAX_CANVAS_AREA = 16 * 1024 * 1024
const MEMORY_PER_PIXEL = 4
const SAFE_ZOOM_MIN = 0.1
const SAFE_ZOOM_MAX = 10
const ZOOM_STEP = 0.1
const WHEEL_ZOOM_FACTOR = 0.001

const EXIF_APP1_MARKER = 0xFFE1
const EXIF_HEADER = 0x45786966

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  RECOVERY_HINTS,
  ANCHOR_POSITIONS,
  WATERMARK_TYPES,
  TILE_MODES,
  EXIF_ORIENTATIONS,
  DEFAULT_TEXT_WATERMARK,
  DEFAULT_IMAGE_WATERMARK,
  MAX_TEXTURE_SIZE,
  MAX_CANVAS_AREA,
  MEMORY_PER_PIXEL,
  SAFE_ZOOM_MIN,
  SAFE_ZOOM_MAX,
  ZOOM_STEP,
  WHEEL_ZOOM_FACTOR,
  EXIF_APP1_MARKER,
  EXIF_HEADER,
}
