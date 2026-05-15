import { SNAPSHOT_VERSIONS, CHECKSUM_ALGORITHM, ERROR_CODES } from './constants.js';
import { createError, createSuccess } from './errors.js';

/**
 * 计算数据的校验和
 * @param {any} data - 需要计算校验和的数据
 * @param {string} algorithm - 算法名称，默认 simple-hash
 * @returns {string} 校验和字符串
 */
export function calculateChecksum(data, algorithm = CHECKSUM_ALGORITHM) {
    if (algorithm === 'simple-hash') {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return String(hash);
    }
    return 'unknown';
}

/**
 * 验证数据的校验和是否匹配
 * @param {any} data - 待验证的数据
 * @param {string} checksum - 预期的校验和
 * @param {string} algorithm - 算法名称
 * @returns {boolean} 校验通过返回 true
 */
export function verifyChecksum(data, checksum, algorithm = CHECKSUM_ALGORITHM) {
    const calculated = calculateChecksum(data, algorithm);
    return calculated === checksum;
}

/**
 * 创建快照对象
 * @param {Array} entries - 快照条目数组
 * @param {Object} options - 配置选项
 * @param {string} options.version - 快照版本号
 * @param {string} options.exportedAt - 导出时间
 * @returns {Object} 完整的快照对象
 */
export function createSnapshot(entries, options = {}) {
    const {
        version = SNAPSHOT_VERSIONS.LATEST,
        exportedAt = new Date().toISOString(),
    } = options;

    const payload = {
        entries: Array.isArray(entries) ? entries : [entries],
    };

    const checksum = calculateChecksum(payload);

    return {
        schemaVersion: version,
        exportedAt,
        checksum,
        checksumAlgorithm: CHECKSUM_ALGORITHM,
        entries: payload.entries,
    };
}

/**
 * 将快照序列化为 JSON 字符串
 * @param {Object} snapshot - 快照对象
 * @param {boolean} pretty - 是否格式化输出
 * @returns {string} JSON 字符串
 */
export function serializeSnapshot(snapshot, pretty = false) {
    return JSON.stringify(snapshot, null, pretty ? 2 : 0);
}

/**
 * 反序列化 JSON 字符串为快照对象
 * @param {string} jsonString - JSON 字符串
 * @returns {Object} 结果对象，success 表示是否成功
 */
export function deserializeSnapshot(jsonString) {
    try {
        const parsed = JSON.parse(jsonString);
        return createSuccess({ data: parsed });
    } catch (error) {
        return createError(ERROR_CODES.INVALID_JSON, {
            message: error.message,
        });
    }
}

/**
 * 将快照压缩为 gzip Blob 对象
 * @param {Object} snapshot - 快照对象
 * @returns {Promise<Object>} 压缩结果，包含 blob 属性
 */
export async function compressToGzipBlob(snapshot) {
    try {
        const jsonString = serializeSnapshot(snapshot);
        const encoder = new TextEncoder();
        const data = encoder.encode(jsonString);

        const compressedStream = new CompressionStream('gzip');
        const writer = compressedStream.writable.getWriter();
        writer.write(data);
        writer.close();

        const compressedData = await new Response(compressedStream.readable).arrayBuffer();
        return createSuccess({
            blob: new Blob([compressedData], { type: 'application/gzip' }),
        });
    } catch (error) {
        return createError(ERROR_CODES.COMPRESSION_FAILED, {
            message: error.message,
        });
    }
}

/**
 * 解压 gzip Blob 为快照对象
 * @param {Blob} blob - gzip 压缩的 blob
 * @returns {Promise<Object>} 解压结果
 */
export async function decompressGzipBlob(blob) {
    try {
        const decompressedStream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
        const decompressedData = await new Response(decompressedStream).text();
        return deserializeSnapshot(decompressedData);
    } catch (error) {
        return createError(ERROR_CODES.DECOMPRESSION_FAILED, {
            message: error.message,
        });
    }
}

/**
 * 触发浏览器下载 Blob 文件
 * @param {Blob} blob - 要下载的 Blob 对象
 * @param {string} filename - 文件名，默认 settings-snapshot.gz
 */
export function downloadBlob(blob, filename = 'settings-snapshot.gz') {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 判断值是否为普通对象
 * @param {any} value - 待检测的值
 * @returns {boolean} 是普通对象返回 true
 */
export function isPlainObject(value) {
    if (value === null || value === undefined) return false;
    if (typeof value !== 'object') return false;
    if (Array.isArray(value)) return false;
    return Object.prototype.toString.call(value) === '[object Object]';
}
