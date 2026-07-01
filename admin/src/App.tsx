import { Authenticated, Refine } from "@refinedev/core";
import { RefineThemes, useNotificationProvider } from "@refinedev/antd";
import { App as AntdApp, ConfigProvider, theme } from "antd";
import routerProvider, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router-v6";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import {
  DashboardOutlined,
  NotificationOutlined,
  SettingOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { AdminLayout } from "@/components/AdminLayout";

import { authProvider } from "@/providers/authProvider";
import { dataProvider } from "@/providers/dataProvider";
import { LoginPage } from "@/pages/login";
import { DashboardPage } from "@/pages/dashboard";
import { MemberListPage } from "@/pages/members/list";
import { MemberEditPage } from "@/pages/members/edit";
import { UpgradeRequestListPage } from "@/pages/upgrade-requests/list";
import { UpgradeRequestShowPage } from "@/pages/upgrade-requests/show";
import { TierListPage, TierCreatePage, TierEditPage } from "@/pages/tiers";
import { SettingsEditPage } from "@/pages/settings/edit";
import { NotifyPage } from "@/pages/notify";

import "@refinedev/antd/dist/reset.css";
import "./index.css";

export function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <ConfigProvider
        warning={{ strict: false }}
        theme={{
          ...RefineThemes.Blue,
          algorithm: theme.darkAlgorithm,
        }}
      >
        <AntdApp>
          <Refine
            routerProvider={routerProvider}
            dataProvider={dataProvider}
            authProvider={authProvider}
            notificationProvider={useNotificationProvider}
            resources={[
              {
                name: "dashboard",
                list: "/",
                meta: { label: "Dashboard", icon: <DashboardOutlined /> },
              },
              {
                name: "upgrade-requests",
                list: "/upgrade-requests",
                show: "/upgrade-requests/show/:id",
                meta: { label: "Upgrades", icon: <RiseOutlined /> },
              },
              {
                name: "members",
                list: "/members",
                edit: "/members/edit/:id",
                meta: { label: "Members", icon: <TeamOutlined /> },
              },
              {
                name: "tiers",
                list: "/tiers",
                create: "/tiers/create",
                edit: "/tiers/edit/:id",
                meta: { label: "Tiers", icon: <ThunderboltOutlined /> },
              },
              {
                name: "notify",
                list: "/notify",
                meta: { label: "Notify", icon: <NotificationOutlined /> },
              },
              {
                name: "settings",
                list: "/settings/edit/1",
                edit: "/settings/edit/1",
                meta: { label: "Settings", icon: <SettingOutlined /> },
              },
            ]}
            options={{
              syncWithLocation: true,
              warnWhenUnsavedChanges: true,
            }}
          >
            <Routes>
              <Route
                element={
                  <Authenticated
                    key="authenticated"
                    fallback={<CatchAllNavigate to="/login" />}
                  >
                    <AdminLayout />
                  </Authenticated>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="/upgrade-requests">
                  <Route index element={<UpgradeRequestListPage />} />
                  <Route path="show/:id" element={<UpgradeRequestShowPage />} />
                </Route>
                <Route path="/members">
                  <Route index element={<MemberListPage />} />
                  <Route path="edit/:id" element={<MemberEditPage />} />
                </Route>
                <Route path="/tiers">
                  <Route index element={<TierListPage />} />
                  <Route path="create" element={<TierCreatePage />} />
                  <Route path="edit/:id" element={<TierEditPage />} />
                </Route>
                <Route path="/settings">
                  <Route index element={<Navigate to="/settings/edit/1" replace />} />
                  <Route path="edit/:id" element={<SettingsEditPage />} />
                </Route>
                <Route path="/notify" element={<NotifyPage />} />
                <Route path="*" element={<NavigateToResource resource="dashboard" />} />
              </Route>
              <Route
                element={
                  <Authenticated key="auth-login" fallback={<Outlet />}>
                    <NavigateToResource resource="dashboard" />
                  </Authenticated>
                }
              >
                <Route path="/login" element={<LoginPage />} />
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler handler={({ resource }) => {
              const label = resource?.meta?.label ?? resource?.name ?? "HQ Control";
              return `${label} | SpaceX HQ Admin`;
            }} />
          </Refine>
        </AntdApp>
      </ConfigProvider>
    </BrowserRouter>
  );
}
