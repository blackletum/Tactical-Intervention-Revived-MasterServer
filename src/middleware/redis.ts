import { Context, Next } from "hono"
import { getRedis } from "../util/util"

export async function redis(ctx: Context, next: Next) {
    ctx.req.redis = getRedis(ctx)
    await next()
}