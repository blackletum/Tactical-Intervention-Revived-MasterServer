import { Context, Next } from "hono"
import { getRemoteIp } from "../util/util"

const standardRateLimit = new RateLimiterMemory({
    points: 12,
    duration: 30
})

const strictRateLimit = new RateLimiterMemory({
    points: 4,
    duration: 70
})

async function rlConsume(rateLimit: RateLimiterAbstract, key: string, points: number = 1) {
    try {
        await rateLimit.consume(key, points)
        return {success: true}
    } catch(ex) {
        if (ex instanceof Error) throw ex
        return {success: false}
    }
}

export async function middlewareRateLimit(ctx: Context, next: Next) {
    const userIp = getRemoteIp(ctx)
    const {success} = await rlConsume(standardRateLimit, userIp)
    if (!success) return ctx.text("", 429)
    
    await next()
}

export async function middlewareRateLimitStrict(ctx: Context, next: Next) {
    const userIp = getRemoteIp(ctx)
    const {success} = await rlConsume(strictRateLimit, userIp)
    if (!success) return ctx.text("", 429)
    
    await next()
}