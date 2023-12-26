import { Context, Next } from "hono"
import { Ratelimit } from "@upstash/ratelimit"
import { getRemoteIp } from "../util/util"

const cache = new Map()
const strictCache = new Map()

export async function rateLimit(ctx: Context, next: Next) {
    const rateLimit = new Ratelimit({
        prefix: "generic",
        redis: ctx.req.redis,
        limiter: Ratelimit.fixedWindow(9, "30 s"),
        ephemeralCache: cache
    })

    const userIp = getRemoteIp(ctx)
    const data = await rateLimit.limit(userIp)
    if (!data.success) return ctx.text("", 429)
    
    await next()
}

export async function rateLimitStrict(ctx: Context, next: Next) {
    const rateLimit = new Ratelimit({
        prefix: "strict",
        redis: ctx.req.redis,
        limiter: Ratelimit.tokenBucket(1, "40 s", 4),
        ephemeralCache: strictCache
    })

    const userIp = getRemoteIp(ctx)
    const data = await rateLimit.limit(userIp)
    if (!data.success) return ctx.text("", 429)
    
    await next()
}