import { pgTable, uuid, text, boolean, date, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const eventBookingsTable = pgTable("event_bookings", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  member_id:           uuid("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  event_name:          text("event_name").notNull(),
  event_date:          date("event_date").notNull(),
  includes_guest_pass: boolean("includes_guest_pass").notNull().default(false),
  booking_status:      text("booking_status").notNull().default("CONFIRMED"),
  booked_at:           timestamp("booked_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEventBookingSchema = createInsertSchema(eventBookingsTable).omit({ id: true, booked_at: true });
export type InsertEventBooking = z.infer<typeof insertEventBookingSchema>;
export type EventBooking = typeof eventBookingsTable.$inferSelect;
