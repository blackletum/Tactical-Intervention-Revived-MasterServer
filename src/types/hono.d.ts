import { Client as LibsqlClient } from "@libsql/client/web"
import { DrizzleD1Database } from "drizzle-orm/d1"
import { Context as BaseContext, HonoRequest as BaseRequest } from "hono"

declare module "hono" {
    interface HonoRequest extends BaseRequest {
        db: DrizzleD1Database
    }
}

// declare global {
//     interface Context extends BaseContext {
//         req: {
//             redis: Redis
//         } & HonoRequest
//     }
// }