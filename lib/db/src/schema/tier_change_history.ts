import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const tierChangeHistoryTable = pgTable("tier_change_history", {
  id:            uuid("id").primaryKey().defaultRandom(),
  member_id:     uuid("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  changed_by:    uuid("changed_by").references(() => membersTable.id),
  previous_tier: text("previous_tier").notNull(),
  new_tier:      text("new_tier").notNull(),
  changed_at:    timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTierChangeSchema = createInsertSchema(tierChangeHistoryTable).omit({ id: true, changed_at: true });
export type InsertTierChange = z.infer<typeof insertTierChangeSchema>;
export type TierChange = typeof tierChangeHistoryTable.$inferSelect;
