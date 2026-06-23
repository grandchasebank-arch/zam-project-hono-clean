import { Sparkles } from "lucide-react";
import { useEffect } from "react";
import { useNotificationById } from "@/hooks/useNotifications";
import { useMarkNotificationAsRead } from "@/hooks/useNotifications";
import { Loader } from "@/components/shared/Loader";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import {
  Award,
  TrendingUp,
  Zap,
  AlertCircle,
  X,
} from "lucide-react";

interface NotificationPreviewProps {
  id: string;
  onClose?: () => void;
}

const NOTIFICATION_ICONS = {
  upgrade: Sparkles,
  badge: Award,
  profit: TrendingUp,
  event: Zap,
  system: AlertCircle,
};

const ICON_COLORS = {
  upgrade: "#c5a059",
  badge: "#f59e0b",
  profit: "#10b981",
  event: "#8b5cf6",
  system: "#ef4444",
};

export function NotificationPreview({ id, onClose }: NotificationPreviewProps) {
  const { data: notification, isLoading } = useNotificationById(id || "");
  const markAsRead = useMarkNotificationAsRead();

  // Mark as read when component mounts and notification is loaded
  useEffect(() => {
    if (notification && notification.unread && id) {
      markAsRead.mutate(id);
    }
  }, [notification, id, markAsRead]);

  if (isLoading) {
    return (
      <div className="flex justify-center pt-12">
        <Loader size={24} />
      </div>
    );
  }

  if (!notification) {
    return (
      <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-10 text-center">
        <p className="text-sm text-[var(--muted)]">Notification not found</p>
      </div>
    );
  }

  const IconComponent =
    NOTIFICATION_ICONS[notification.kind as keyof typeof NOTIFICATION_ICONS] || AlertCircle;
  const color = ICON_COLORS[notification.kind as keyof typeof ICON_COLORS];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="relative flex items-center justify-center px-6 py-4 border-b border-[var(--border)]">
        <SheetClose asChild>
          <button
            className="absolute left-4 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--surface)] transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </SheetClose>
        <h2 className="text-lg font-semibold text-[var(--text)]">Notification</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="animate-slide-up">
          <div className="mb-6 flex items-start gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 flex-shrink-0"
              style={{ backgroundColor: `${color}20` }}
            >
              <IconComponent size={24} style={{ color }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                {notification.title}
              </h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {notification.time}
              </p>
            </div>
          </div>

          <div className="mb-6 space-y-4">
            <p className="text-base text-[var(--text)]">
              {notification.message}
            </p>
          </div>
        </div>
      </div>


    </div>
  );
}
