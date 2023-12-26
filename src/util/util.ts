import { Context } from "hono"
import { KV } from "../index"
import { env } from "hono/adapter"
import { Redis } from "@upstash/redis/cloudflare"

export function kvNamespace(ctx: Context) {
    return env<KV>(<any>ctx)
}

export function getRedis(ctx: Context) {
    return new Redis({
        url: <string>ctx.env.UPSTASH_REDIS_REST_URL,
        token: <string>ctx.env.UPSTASH_REDIS_REST_TOKEN
    })
}

export function getRemoteIp(ctx: Context) {
    return ctx.req.raw.headers.get("cf-connecting-ip") || ctx.req.raw.headers.get("CF-Connecting-IP") || "unknown"
}

export function getCurTime() {
    return Math.floor(Date.now() / 1000)
}