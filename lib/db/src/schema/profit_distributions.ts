import { pgTable, uuid, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const profitDistributionsTable = pgTable("profit_distributions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  member_id:    uuid("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  amount:       numeric("amount", { precision: 12, scale: 2 }).notNull(),
  period_month: date("period_month").notNull(),
  tier_at_time: text("tier_at_time").notNull(),
  status:       text("status").notNull().default("PENDING"),
  paid_at:      timestamp("paid_at", { withTimezone: true }),
  notes:        text("notes"),
  created_at:   timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProfitDistributionSchema = createInsertSchema(profitDistributionsTable).omit({ id: true, created_at: true });
export type InsertProfitDistribution = z.infer<typeof insertProfitDistributionSchema>;
export type ProfitDistribution = typeof profitDistributionsTable.$inferSelect;
