import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { BottomTabs } from "./BottomTabs";

// Only routes that ARE actual bottom tabs
const TAB_ROUTES = ["/dashboard", "/badges", "/profile"];

export function PageLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;
  const showTabs = TAB_ROUTES.includes(pathname);
  const isAuth = pathname.startsWith("/auth") || pathname === "/login";

  if (isAuth) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Header showBack={!showTabs} />
      <main
        className="portal-container px-5"
        style={{
          paddingTop: "92px",
          paddingBottom: showTabs ? "100px" : "40px",
        }}
      >
        {children}
      </main>
      {showTabs && <BottomTabs />}
    </>
  );
}
