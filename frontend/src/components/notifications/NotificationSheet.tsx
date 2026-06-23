import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import type { AppNotification } from "@/types/notification";
import { NotificationItem } from "./NotificationItem";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NotificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
}

export function NotificationSheet({
  open,
  onOpenChange,
  notifications,
  onMarkAllRead,
}: NotificationSheetProps) {
  const navigate = useNavigate();

  const handleNotificationClick = (id: string) => {
    onOpenChange(false);
    navigate(`/notifications/${id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>Notifications</SheetTitle>
          <button
            onClick={() => onMarkAllRead()}
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--text)]"
          >
            Mark all read
          </button>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--muted)]">
              No notifications yet
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n.id)}
                  className="text-left transition hover:opacity-80"
                >
                  <NotificationItem n={n} />
                </button>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
