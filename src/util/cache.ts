interface CacheObject {
    value: any
    startTime: number
    ttl?: number
}

export class LocalCache {
    defaultTtl?: number
    cache: Map<string, CacheObject> = new Map()

    constructor(defaultTtl?: number) {
        this.defaultTtl = defaultTtl
    }

    get(key: string) {
        const cachedObj = this.cache.get(key)
        if (!cachedObj) return
        if (cachedObj.ttl && cachedObj.startTime + cachedObj.ttl < Date.now()) {
			this.cache.delete(key)
			return
		}

        return cachedObj.value
    }

    /**
     * Sets a KV pair in the cache
     * @param key Key to set
     * @param value Value to set
     * @param ttl In milliseconds
     */
    set(key: string, value: any, ttl?: number) {
        this.cache.set(key, {
            value,
            startTime: Date.now(),
            ttl: ttl || this.defaultTtl
        })
    }

    delete(key: string) {
        this.cache.delete(key)
    }

    clear() {
        this.cache.clear()
    }
}
