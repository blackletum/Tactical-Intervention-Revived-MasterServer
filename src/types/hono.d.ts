import { Redis } from "@upstash/redis/cloudflare"
import { Context as BaseContext, HonoRequest as BaseRequest } from "hono"

declare module "hono" {
    interface HonoRequest extends BaseRequest {
        redis: Redis
    }
}

// declare global {
//     interface Context extends BaseContext {
//         req: {
//             redis: Redis
//         } & HonoRequest
//     }
// }