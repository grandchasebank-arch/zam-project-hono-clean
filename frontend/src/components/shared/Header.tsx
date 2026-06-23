import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Bell,
  Moon,
  MoreVertical,
  Sun,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/hooks/useTheme";
import { useNotifications } from "@/hooks/useNotifications";


const LOGO_URL =
  "https://upload.wikimedia.org/wikipedia/commons/2/2e/SpaceX_logo_black.svg";

interface HeaderProps {
  showBack?: boolean;
}

export function Header({ showBack = false }: HeaderProps) {
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { data: notificationsData } = useNotifications();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notificationsData?.filter((n) => n.unread).length ?? 0;
  const badgeText =
    unreadCount === 0 ? "" : unreadCount > 99 ? "99+" : String(unreadCount);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  return (
    <header
      className="fixed left-0 right-0 top-0 z-50 flex h-[72px] items-center justify-center border-b border-[var(--border)] backdrop-blur-[20px]"
      style={{ background: "rgba(var(--bg-rgb), 0.8)" }}
    >
      <div className="portal-container flex items-center justify-between px-5">
        {showBack ? (
          <button
            type="button"
            onClick={() => history.back()}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-bright)] bg-[var(--surface)] text-[var(--text)] transition hover:opacity-80"
            aria-label="Back"
          >
            <ArrowLeft size={18} />
          </button>
        ) : (
          <Link to="/dashboard" className="inline-flex">
            <img
              src={LOGO_URL}
              alt="SpaceX"
              className="h-4 brand-logo"
              style={{
                filter:
                  theme === "light" ? "brightness(0)" : "brightness(0) invert(1)",
              }}
            />
          </Link>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-bright)] bg-[var(--surface)] text-[var(--text)] transition hover:opacity-80"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <>
                <div
                  className="absolute right-0 top-0 h-2 w-2 rounded-full bg-[#ef4444] animate-pulse"
                  aria-hidden="true"
                />
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#ef4444] text-[10px] font-bold text-white">
                  {badgeText}
                </span>
              </>
            )}
          </button>

          <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-bright)] bg-[var(--surface)] text-[var(--text)] transition hover:opacity-80"
            aria-label="Menu"
          >
            <MoreVertical size={18} />
          </button>

          {open && (
            <div
              className="absolute right-0 top-[calc(100%+8px)] flex w-[180px] flex-col overflow-hidden rounded-2xl border border-[var(--border-bright)] bg-[var(--surface)] shadow-[0_20px_40px_rgba(0,0,0,0.4)] animate-slide-in"
            >
              <button
                type="button"
                onClick={() => {
                  toggle();
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[13px] font-medium text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)]"
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                <span>Toggle Theme</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/notifications");
                }}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[13px] font-medium text-[var(--muted)] transition hover:bg-white/5 hover:text-[var(--text)]"
              >
                <Bell size={16} />
                <span>Notifications</span>
              </button>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}
