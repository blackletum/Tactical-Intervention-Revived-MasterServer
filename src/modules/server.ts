import { version } from "../../package.json"
import { StatusCodes } from "http-status-codes"
import { Hono } from "hono"
import { Bindings } from "hono/types"
import { getCurTime, getRemoteIp } from "../util/util"
import { middlewareRateLimitStrict } from "../middleware/ratelimit"
import { connect } from "cloudflare:sockets"
import { serversTable } from "../util/schemas"
import { eq, gt, lt } from "drizzle-orm"
import { cache } from ".."
import { DrizzleD1Database } from "drizzle-orm/d1"
import { isIPv4 } from "is-ip"

const HEARTBEAT_TTL = 60
const SERVERLIST_CACHE_TTL = 5

interface Server {
    ip: string
    port: number
    updatedAt: number
    expiresAt: number
}

export const serverApi = new Hono<{Bindings: Bindings}>()

serverApi.get("/list", async (ctx) => {
    const curTime = getCurTime()
    const cachedServerList = cache.get("serverList")
    const serverList = cachedServerList || await ctx.req.db.select()
        .from(serversTable)
        .where(gt(serversTable.expiresAt, curTime))

    if (!cachedServerList) {
        cache.set("serverList", serverList, SERVERLIST_CACHE_TTL * 1000)
    }

    return ctx.json({
        servers: serverList,
        msVersion: version
    })
})

// apply our strict rate-limiting to heartbeats
serverApi.post("/heartbeat", middlewareRateLimitStrict, async (ctx) => {
    let body

    try {
        body = await ctx.req.json<Server>()
    } catch(ex) {}

    if (!body) return ctx.text("", StatusCodes.BAD_REQUEST)

    // in development, we cant get the remote ip, we'll use this fake ip instead!
    const remoteIp = ctx.env.DEV ? "127.88.88.88" : getRemoteIp(ctx)

    if ((!body.port || typeof(body.port) !== "number")
    || (body.port < 0 || body.port > 65535)
    || (remoteIp === "unknown")
	|| !isIPv4(remoteIp))
        return ctx.text("", StatusCodes.BAD_REQUEST)

    const curTime = getCurTime()
    const server: Server = {
        ip: remoteIp,
        port: Math.floor(body.port),
        updatedAt: curTime,
        expiresAt: curTime + HEARTBEAT_TTL
    }

    const serverUid = `${server.ip}:${server.port}`

    // TODO: Let's try and use SRCDS server query to ping this IP?
    // if that doesn't work (as its node only?) we could at least
    // ping the IP + port just like we do on the client to at least
    // verify if the server actually is reachable to the open-internet
    // use connect from 'cloudflare:sockets'
	// tried this - doesnt seem to work :(

    await ctx.req.db.insert(serversTable)
        .values({...{id: serverUid}, ...server})
        .onConflictDoUpdate({target: serversTable.id, set: server})

    // heartbeat will reset the cache
    cache.delete("serverList")

    return ctx.json(server)
})

serverApi.delete("/heartbeat", middlewareRateLimitStrict, async (ctx) => {
    let body

    try {
        body = await ctx.req.json<Server>()
    } catch(ex) {}

    if (!body) return ctx.text("", StatusCodes.BAD_REQUEST)

    // in development, we cant get the remote ip, we'll use this fake ip instead!
    const remoteIp = ctx.env.DEV ? "127.88.88.88" : getRemoteIp(ctx)

    if ((!body.port || typeof(body.port) !== "number")
    || (body.port < 0 || body.port > 65535)
    || (remoteIp === "unknown")
    || !isIPv4(remoteIp))
        return ctx.text("", StatusCodes.BAD_REQUEST)

    const serverUid = `${remoteIp}:${body.port}`

    const deleted = await ctx.req.db.delete(serversTable)
        .where(eq(serversTable.id, serverUid))
        .returning()

    if (deleted[0] === undefined) return ctx.text("", StatusCodes.BAD_REQUEST)

    cache.delete("serverList")

    return ctx.json({killed: deleted[0].id})
})

// TODO: Cleanup cron job, run every 10 mins and removes expired server rows

export async function scheduledServerListCleanup(db: DrizzleD1Database) {
    const curTime = getCurTime()

    const deletedServers = await db.delete(serversTable)
        .where(lt(serversTable.expiresAt, curTime))
        .returning()

    if (!deletedServers || deletedServers.length === 0) return
    console.log(`Cleaned up ${deletedServers.length} expired servers from the database`)
}
