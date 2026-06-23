import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const badgesTable = pgTable("badges", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  name:                text("name").notNull(),
  tier_required:       text("tier_required").notNull(),
  description:         text("description"),
  icon_url:            text("icon_url"),
  allows_event_booking: boolean("allows_event_booking").notNull().default(false),
  allows_guest_pass:   boolean("allows_guest_pass").notNull().default(false),
  created_at:          timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBadgeSchema = createInsertSchema(badgesTable).omit({ id: true, created_at: true });
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type Badge = typeof badgesTable.$inferSelect;
