type RateLimitEntry = {
    count: number
    resetAt: number
}

const buckets = new Map<string, RateLimitEntry>()

export function getClientIp(req: Request): string {
    const forwardedFor = req.headers.get('x-forwarded-for')
    const realIp = req.headers.get('x-real-ip')

    return forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown'
}

export function rateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now()
    const current = buckets.get(key)

    if (!current || current.resetAt <= now) {
        buckets.set(key, {
            count: 1,
            resetAt: now + windowMs,
        })

        return {
            allowed: true,
            remaining: limit - 1,
            resetAt: now + windowMs,
        }
    }

    if (current.count >= limit) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: current.resetAt,
        }
    }

    current.count += 1
    buckets.set(key, current)

    return {
        allowed: true,
        remaining: limit - current.count,
        resetAt: current.resetAt,
    }
}
