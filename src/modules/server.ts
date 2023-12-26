import { version } from "../../package.json"
import { StatusCodes } from "http-status-codes"
import { Hono } from "hono"
import { Bindings } from "hono/types"
import { getCurTime, getRedis, getRemoteIp, kvNamespace } from "../util/util"
import { rateLimitStrict } from "../middleware/ratelimit"
import { connect } from "cloudflare:sockets"
import { LRUCache } from "lru-cache"

const HEARTBEAT_TTL = 60

interface Server {
    ip: string
    port: number
    lastHeartbeat: number
    expiresAt: number
}

export const serverApi = new Hono<{Bindings: Bindings}>()
const serverCache = new LRUCache({ttl: 1000 * 30, ttlAutopurge: true})

// TODO: Should we use KV here?
// I'm thinking use D1 database instead, it has far more read/writes
// plus it should update right away instead of being delayed?
// Each time we get the server list check for TTL expiry

// Another valid option would be MongoDB free-tier
// it should provide basically unlimited storage
// https://www.mongodb.com/developer/products/atlas/cloudflare-worker-rest-api/

serverApi.get("/list", async (ctx) => {
    const curTime = getCurTime()
    const serverList = await ctx.req.redis.zrange(
        "serversAliveRegister",
        curTime, 
        curTime + HEARTBEAT_TTL,
        {byScore: true}
    )

    let servers: Server[] = []

    for (const serverUid of serverList) {
        const cachedServer = serverCache.get(<string>serverUid)
        const serverVal = cachedServer || await ctx.req.redis.get(<string>serverUid)
        if (!serverVal) continue

        servers.push(<Server>serverVal)
    }

    return ctx.json({
        servers,
        msVersion: version
    })
})

// apply our strict rate-limiting to heartbeats
serverApi.post("/heartbeat", rateLimitStrict, async (ctx) => {
    let body
    
    try {
        body = await ctx.req.json<Server>()
    } catch(ex) {}

    if (!body) return ctx.text("", StatusCodes.BAD_REQUEST)

    // in development, we cant get the remote ip, we'll use this fake ip instead!
    const remoteIp = ctx.env.DEV ? "127.88.88.88" : getRemoteIp(ctx)

    if ((!body.port || typeof(body.port) !== "number")
    || (body.port < 0 || body.port > 9999)
    || (remoteIp === "unknown"))
        return ctx.text("", StatusCodes.BAD_REQUEST)

    const curTime = getCurTime()
    const server: Server = {
        ip: remoteIp,
        port: body.port,
        lastHeartbeat: curTime,
        expiresAt: curTime + HEARTBEAT_TTL
    }

    const serverUid = `server:${server.ip}:${server.port}`

    // TODO: Let's try and use SRCDS server query to ping this IP?
    // if that doesn't work (as its node only?) we could at least
    // ping the IP + port just like we do on the client to at least
    // verify if the server actually is reachable to the open-internet

    // use connect from 'cloudflare:sockets'

    // Prune expired entries to the set by the expiry time
    await ctx.req.redis.zremrangebyscore("serversAliveRegister", 0, curTime)

    // Add the current server to the register
    await ctx.req.redis.zadd("serversAliveRegister", {member: serverUid, score: server.expiresAt})

    // Add the server record with the correct TTL
    await ctx.req.redis.set(serverUid, server, {exat: server.expiresAt})

    // Store in cache
    serverCache.set(serverUid, server)

    return ctx.json(server)
})

// TODO: Serverlist heartbeat die endpoint
