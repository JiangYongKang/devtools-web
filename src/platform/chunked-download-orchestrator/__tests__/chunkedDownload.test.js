import {
    createExportSource,
    detectSourceType,
    ERROR_CODES,
    getSourceSize,
    planChunkedDownload,
    SOURCE_TYPES,
} from '../logic/index.js'

describe('chunkedDownload', () => {
  describe('source type detection', () => {
    it('should detect string source type', () => {
      expect(detectSourceType('hello')).toBe(SOURCE_TYPES.STRING)
    })

    it('should detect Uint8Array source type', () => {
      expect(detectSourceType(new Uint8Array([1, 2, 3]))).toBe(SOURCE_TYPES.UINT8_ARRAY)
    })

    it('should detect ArrayBuffer source type', () => {
      const buffer = new ArrayBuffer(8)
      expect(detectSourceType(buffer)).toBe(SOURCE_TYPES.ARRAY_BUFFER)
    })

    it('should return null for invalid source types', () => {
      expect(detectSourceType(null)).toBeNull()
      expect(detectSourceType(undefined)).toBeNull()
      expect(detectSourceType(123)).toBeNull()
      expect(detectSourceType({})).toBeNull()
    })
  })

  describe('getSourceSize', () => {
    it('should calculate string size correctly', async () => {
      const size = await getSourceSize('hello')
      expect(size).toBe(5)
    })

    it('should calculate Uint8Array size correctly', async () => {
      const data = new Uint8Array(100)
      const size = await getSourceSize(data)
      expect(size).toBe(100)
    })

    it('should calculate ArrayBuffer size correctly', async () => {
      const buffer = new ArrayBuffer(200)
      const size = await getSourceSize(buffer)
      expect(size).toBe(200)
    })
  })

  describe('createExportSource', () => {
    it('should create export source from string', () => {
      const source = createExportSource('hello world', {
        filename: 'test.txt',
        mimeType: 'text/plain',
      })
      expect(source.sourceType).toBe(SOURCE_TYPES.STRING)
      expect(source.filename).toBe('test.txt')
      expect(source.mimeType).toBe('text/plain')
    })

    it('should throw for invalid source type', () => {
      expect(() => createExportSource(123)).toThrow()
    })
  })

  describe('planChunkedDownload', () => {
    it('should create download plan with correct configuration', () => {
      const plan = planChunkedDownload('hello world', {
        chunkSize: 5,
        filename: 'test.txt',
        mimeType: 'text/plain',
      })
      expect(plan).toHaveProperty('execute')
      expect(plan).toHaveProperty('cancel')
      expect(plan).toHaveProperty('getChunks')
      expect(plan).toHaveProperty('getCombinedBlob')
      expect(plan).toHaveProperty('state')
    })

    it('should reject when string exceeds maxTotalBytes', async () => {
      const longString = 'a'.repeat(200)
      const plan = planChunkedDownload(longString, {
        maxTotalBytes: 100,
      })

      let errorThrown = false
      try {
        for await (const _ of plan.execute()) {
        }
      } catch (error) {
        expect(error.errorCode).toBe(ERROR_CODES.EXCEEDS_MAX_BYTES)
        errorThrown = true
      }
      expect(errorThrown).toBe(true)
    })

    it('should split data into chunks correctly', async () => {
      const data = 'a'.repeat(100)
      const plan = planChunkedDownload(data, {
        chunkSize: 30,
      })

      let chunkCount = 0
      for await (const event of plan.execute()) {
        if (event.type === 'chunk') {
          chunkCount++
        }
      }

      const chunks = plan.getChunks()
      expect(chunks.length).toBe(4)
      expect(chunkCount).toBe(4)

      let totalBytes = 0
      for (const chunk of chunks) {
        totalBytes += chunk.length
      }
      expect(totalBytes).toBe(100)
    })

    it('should handle exact chunk boundary', async () => {
      const data = 'a'.repeat(90)
      const plan = planChunkedDownload(data, {
        chunkSize: 30,
      })

      for await (const _ of plan.execute()) {
      }

      const chunks = plan.getChunks()
      expect(chunks.length).toBe(3)
      expect(chunks[0].length).toBe(30)
      expect(chunks[1].length).toBe(30)
      expect(chunks[2].length).toBe(30)
    })

    it('should call onProgress callback', async () => {
      const progressEvents = []
      const data = 'a'.repeat(100)
      const plan = planChunkedDownload(data, {
        chunkSize: 25,
        onProgress: (progress) => progressEvents.push(progress),
        throttleProgress: false,
      })

      for await (const _ of plan.execute()) {
      }

      expect(progressEvents.length).toBeGreaterThan(0)
      expect(progressEvents[progressEvents.length - 1].percent).toBe(100)
    })

    it('should set state correctly when complete', async () => {
      const data = 'hello world'
      const plan = planChunkedDownload(data, {
        chunkSize: 5,
      })

      for await (const _ of plan.execute()) {
      }

      expect(plan.state.isCompleted).toBe(true)
      expect(plan.state.writtenBytes).toBe(11)
      expect(plan.state.totalBytes).toBe(11)
    })

    it('should combine chunks correctly', async () => {
      const data = 'hello world'
      const plan = planChunkedDownload(data, {
        chunkSize: 5,
      })

      for await (const _ of plan.execute()) {
      }

      const chunks = plan.getChunks()
      const decoder = new TextDecoder()
      let combined = ''
      for (const chunk of chunks) {
        combined += decoder.decode(chunk, { stream: true })
      }
      combined += decoder.decode()

      expect(combined).toBe('hello world')
    })
  })

  describe('download plan cancellation', () => {
    it('should have initial idle state', () => {
      const plan = planChunkedDownload('test data')
      expect(plan.state.isStarted).toBe(false)
      expect(plan.state.isCompleted).toBe(false)
      expect(plan.state.isCancelled).toBe(false)
    })

    it('should support reset after completion', async () => {
      const plan = planChunkedDownload('test data')

      for await (const _ of plan.execute()) {
      }

      expect(plan.state.isCompleted).toBe(true)

      plan.reset()

      expect(plan.state.isCompleted).toBe(false)
      expect(plan.state.isCancelled).toBe(false)
      expect(plan.state.isStarted).toBe(false)
      expect(plan.getChunks().length).toBe(0)
    })
  })
})
