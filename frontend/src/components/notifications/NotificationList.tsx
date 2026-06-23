import type { AppNotification } from "@/types/notification";
import { NotificationItem } from "./NotificationItem";

export function NotificationList({ 
  items, 
  onSelect 
}: { 
  items: AppNotification[]
  onSelect: (id: string) => void
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center text-sm text-[var(--muted)]">
        No notifications yet.
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-col gap-2">
      {items.map((n) => (
        <button
          key={n.id}
          type="button"
          onClick={() => onSelect(n.id)}
          className="w-full text-left"
        >
          <NotificationItem n={n} />
        </button>
      ))}
    </div>
  );
}
