class MemoryCollector {
    constructor() {
        this.reports = []
        this.maxReports = 100
    }

    add(report) {
        this.reports.push({
            ...report,
            collectedAt: Date.now(),
        })

        if (this.reports.length > this.maxReports) {
            this.reports = this.reports.slice(-this.maxReports)
        }
    }

    getAll() {
        return [...this.reports]
    }

    clear() {
        this.reports = []
    }

    getCount() {
        return this.reports.length
    }
}

export function createMemoryCollector() {
    return new MemoryCollector()
}

const DEFAULT_COLLECTOR = createMemoryCollector()

export function getDefaultCollector() {
    return DEFAULT_COLLECTOR
}

export function prepareReportPayload(report) {
    return JSON.stringify(report, null, 2)
}

export async function sendToCollector(report, collector = null) {
    const targetCollector = collector || DEFAULT_COLLECTOR
    targetCollector.add(report)
    return {
        success: true,
        stored: true,
        collectorSize: targetCollector.getCount(),
    }
}
