import {Hono} from "hono"
import {serverApi} from "./modules/server"
import { rateLimit } from "./middleware/ratelimit"
import { redis } from "./middleware/redis"

export type KV = {
    SERVERS: KVNamespace
}

const app = new Hono()
app.use("*", redis)
app.use("*", rateLimit)
app.route("/server", serverApi)

export default app