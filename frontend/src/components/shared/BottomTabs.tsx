import { Link, useLocation } from "react-router-dom";
import { Award, Home, User } from "lucide-react";

const TABS = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/badges", label: "Badges", icon: Award },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomTabs() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center border-t border-[var(--border)] backdrop-blur-[20px]"
      style={{ background: "rgba(var(--bg-rgb), 0.85)" }}
    >
      <div className="portal-container flex">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-semibold uppercase tracking-wider transition"
              style={{ color: active ? "var(--text)" : "var(--muted)" }}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
