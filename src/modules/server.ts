import app, { KV } from "../index"
import { version } from "../../package.json"
import { StatusCodes } from "http-status-codes"
import { Hono } from "hono"
import { env } from "hono/adapter"
import { Bindings } from "hono/types"
import { isIP } from "is-ip"
import { kvNamespace } from "../util/util"

const HEARTBEAT_TTL = 60

interface Server {
    ip: string
    port: number
    lastHeartbeat: number
    expiresAt: number
}

export const serverApi = new Hono<{Bindings: Bindings}>()

// TODO: Should we use KV here?
// I'm thinking use D1 database instead, it has far more read/writes
// Each time we get the server list check for TTL expiry

serverApi.get("/list", async (ctx) => {
    const serverList = await kvNamespace(ctx).SERVERS.list()
    let servers: Server[] = []

    for (const server of serverList.keys) {
        console.log("server", server)
        servers.push(<any>server.metadata)
    }

    return ctx.json({
        servers,
        msVersion: version
    })
})

serverApi.post("/heartbeat", async (ctx) => {
    let body

    // ip rate limiting?
    console.log("IP sending heartbeat:", ctx.req.raw.headers.get("cf-connecting-ip"))
    
    try {
        body = await ctx.req.json<Server>()
    } catch(ex) {}

    if (!body) return ctx.text("", StatusCodes.BAD_REQUEST)

    // TODO: Should we actually read this IP, or should we just be getting the IP (above)
    // and using that?
    // TODO: Check this IP value for console param injection!
    // This validation must be harsh!
    if ((!body.ip || !isIP(body.ip))
    || (!body.port || typeof(body.port) !== "number")
    || (body.port < 0 || body.port > 9999))
        return ctx.text("", StatusCodes.BAD_REQUEST)


    const curTime = Math.floor(Date.now() / 1000)
    const server: Server = {
        ip: body.ip,
        port: body.port,
        lastHeartbeat: curTime,
        expiresAt: curTime + HEARTBEAT_TTL
    } 

    const expiresAt = 

    // TODO: Let's try and use SRCDS server query to ping this IP?
    // if that doesn't work (as its node only?) we could at least
    // ping the IP + port just like we do on the client to at least
    // verify if the server actually is reachable to the open-internet

    console.log("to store:", server)

    await kvNamespace(ctx).SERVERS.put(`${body.ip}:${body.port}`, "", {
        expiration: server.expiresAt,
        metadata: server
    })

    return ctx.json(server)
})

