import type { Config } from "drizzle-kit"

export default {
    schema: "./src/util/schemas.ts",
    out: "./drizzle"
} satisfies Config