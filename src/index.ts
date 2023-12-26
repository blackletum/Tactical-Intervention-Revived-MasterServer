import {Hono} from "hono"
import {serverApi} from "./modules/server"

export type KV = {
    SERVERS: KVNamespace
}

const app = new Hono()

app.route("/server", serverApi)

export default app