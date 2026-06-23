import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const upgradeRequestsTable = pgTable("upgrade_requests", {
  id:                uuid("id").primaryKey().defaultRandom(),
  member_id:         uuid("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  reviewed_by:       uuid("reviewed_by").references(() => membersTable.id),
  from_tier:         text("from_tier").notNull(),
  to_tier:           text("to_tier").notNull(),
  status:            text("status").notNull().default("PENDING"),
  payment_reference: text("payment_reference"),
  payment_verified:  boolean("payment_verified").notNull().default(false),
  admin_notes:       text("admin_notes"),
  reviewed_at:       timestamp("reviewed_at", { withTimezone: true }),
  created_at:        timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at:        timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUpgradeRequestSchema = createInsertSchema(upgradeRequestsTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertUpgradeRequest = z.infer<typeof insertUpgradeRequestSchema>;
export type UpgradeRequest = typeof upgradeRequestsTable.$inferSelect;
