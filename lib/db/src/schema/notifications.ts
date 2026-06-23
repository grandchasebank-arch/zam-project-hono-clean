import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const notificationsTable = pgTable("notifications", {
  id:         uuid("id").primaryKey().defaultRandom(),
  member_id:  uuid("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  type:       text("type").notNull(),
  title:      text("title").notNull(),
  message:    text("message").notNull(),
  read:       boolean("read").notNull().default(false),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, created_at: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;
