import {ExportedHandler} from "@cloudflare/workers-types"
import {Env, Hono} from "hono"
import {scheduledServerListCleanup, serverApi} from "./modules/server"
import { middlewareRateLimit } from "./middleware/ratelimit"
import { middlewareDrizzleClient } from "./middleware/drizzleclient"
import { LocalCache } from "./util/cache"
import { drizzle } from "drizzle-orm/d1"

export type KV = {
    //SERVERS: KVNamespace
}

export type D1 = {
    DB: D1Database
}

export const cache = new LocalCache()

const app = new Hono()
app.use("*", middlewareDrizzleClient)
app.use("*", middlewareRateLimit)
app.route("/server", serverApi)

export default <ExportedHandler>{
    fetch: app.fetch,
    async scheduled(event, env: any, ctx) {
        const db = drizzle(env.DB)
        ctx.waitUntil(scheduledServerListCleanup(db))
    }
}