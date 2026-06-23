import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useNotificationById } from "@/hooks/useNotifications";
import { Loader } from "@/components/shared/Loader";
import {
  Bell,
  Award,
  TrendingUp,
  Zap,
  AlertCircle,
} from "lucide-react";

const ICON_MAP = {
  upgrade: Bell,
  badge: Award,
  profit: TrendingUp,
  event: Zap,
  system: AlertCircle,
};

const COLOR_MAP = {
  upgrade: "#3b82f6",
  badge: "#f59e0b",
  profit: "#10b981",
  event: "#8b5cf6",
  system: "#ef4444",
};

export default function NotificationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: notification, isLoading } = useNotificationById(id || "");

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
    ICON_MAP[notification.kind as keyof typeof ICON_MAP] || AlertCircle;
  const color = COLOR_MAP[notification.kind as keyof typeof COLOR_MAP];

  return (
    <>
      <button
        onClick={() => navigate(-1)}
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-bright)] bg-[var(--surface)] text-[var(--text)] transition hover:opacity-80"
        aria-label="Back"
      >
        <ArrowLeft size={18} />
      </button>

      <div className="animate-slide-up rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8">
        <div className="mb-6 flex items-start gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"
            style={{ backgroundColor: `${color}20` }}
          >
            <IconComponent size={24} style={{ color }} />
          </div>
          <div>
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

        <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 rounded-xl border border-[var(--border-bright)] bg-transparent px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-white/5"
          >
            Back to Notifications
          </button>
        </div>
      </div>
    </>
  );
}
