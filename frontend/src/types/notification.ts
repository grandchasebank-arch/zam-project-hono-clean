export type NotificationKind =
  | "upgrade"
  | "badge"
  | "event"
  | "profit"
  | "system";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  time: string;
  unread: boolean;
}
