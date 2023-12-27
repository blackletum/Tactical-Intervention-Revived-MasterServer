import { Context, Next } from "hono"
import { d1Namespace } from "../util/util"
import { drizzle } from "drizzle-orm/d1"

export async function middlewareDrizzleClient(ctx: Context, next: Next) {
    ctx.req.db = drizzle(d1Namespace(ctx).DB)
    await next()
}