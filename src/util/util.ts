import { Context } from "hono"
import { D1, KV } from "../index"
import { env } from "hono/adapter"

export function kvNamespace(ctx: Context) {
    return env<KV>(ctx)
}

export function d1Namespace(ctx: Context) {
    return env<D1>(ctx)
}

// export function getRedis(ctx: Context) {
//     return new Redis({
//         url: <string>ctx.env.UPSTASH_REDIS_REST_URL,
//         token: <string>ctx.env.UPSTASH_REDIS_REST_TOKEN
//     })
// }

export function getRemoteIp(ctx: Context) {
    return ctx.req.raw.headers.get("cf-connecting-ip") || ctx.req.raw.headers.get("CF-Connecting-IP") || "unknown"
}

export function getCurTime() {
    return Math.floor(Date.now() / 1000)
}

export function getEnv(ctx: Context, key: string) {
    return ctx.env[key]?.trim()
}

export function getEnvOrThrow(ctx: Context, key: string, customError?: string) {
    const val = getEnv(ctx, key)
    if (val === undefined) throw new Error(customError || `ENV variable '${key}' is missing!`)

    return val
}