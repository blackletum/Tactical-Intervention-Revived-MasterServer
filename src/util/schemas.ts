import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const serversTable = sqliteTable("servers", {
    id: text("id").primaryKey().unique(),
    ip: text("ip"),
    port: integer("port"),
    updatedAt: integer("updatedAt", {mode: "number"}),
    expiresAt: integer("expiresAt", {mode: "number"})
})