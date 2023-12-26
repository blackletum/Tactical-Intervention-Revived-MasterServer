import { Context } from "hono";
import { KV } from "../index";
import { env } from "hono/adapter";

export function kvNamespace(ctx: Context) {
    return env<KV>(<any>ctx)
}