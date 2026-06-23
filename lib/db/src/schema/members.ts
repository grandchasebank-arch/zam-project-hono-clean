import { pgTable, uuid, text, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { badgesTable } from "./badges";

export const membersTable = pgTable("members", {
  id:            uuid("id").primaryKey().defaultRandom(),
  auth_user_id:  uuid("auth_user_id").unique(),
  badge_id:      uuid("badge_id").references(() => badgesTable.id),
  email:         text("email").notNull().unique(),
  name:          text("name").notNull(),
  tier:          text("tier").notNull().default("Explorer"),
  status:        text("status").notNull().default("INACTIVE"),
  role:          text("role").notNull().default("member"),
  clearance:     text("clearance").notNull().default("INTERNAL"),
  title:         text("title"),
  location:      text("location"),
  member_since:  date("member_since"),
  avatar_url:    text("avatar_url"),
  display_level: text("display_level").notNull().default("Level 1 Applicant"),
  created_at:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at:    timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true, created_at: true, updated_at: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
