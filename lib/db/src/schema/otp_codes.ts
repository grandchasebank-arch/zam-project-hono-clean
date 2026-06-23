import { pgTable, uuid, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const otpCodesTable = pgTable("otp_codes", {
  id:         uuid("id").primaryKey().defaultRandom(),
  email:      text("email").notNull(),
  code:       text("code").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
  used:       boolean("used").notNull().default(false),
  attempts:   integer("attempts").notNull().default(0),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOtpCodeSchema = createInsertSchema(otpCodesTable).omit({ id: true, created_at: true });
export type InsertOtpCode = z.infer<typeof insertOtpCodeSchema>;
export type OtpCode = typeof otpCodesTable.$inferSelect;
