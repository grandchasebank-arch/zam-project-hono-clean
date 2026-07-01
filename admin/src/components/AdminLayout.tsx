import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  useLink,
  useLogout,
  useMenu,
} from "@refinedev/core";
import { ThemedTitleV2 } from "@refinedev/antd";
import {
  DashboardOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import {
  Button,
  Drawer,
  Grid,
  Layout,
  Menu,
  theme,
  type MenuProps,
} from "antd";

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

type MenuTreeItem = ReturnType<typeof useMenu>["menuItems"][number];

function toMenuItems(
  items: MenuTreeItem[],
  Link: ReturnType<typeof useLink>,
): MenuProps["items"] {
  return items.map((item) => {
    if (item.children.length > 0) {
      return {
        key: item.key,
        icon: item.icon,
        label: item.label,
        children: toMenuItems(item.children, Link),
      };
    }

    return {
      key: item.key,
      icon: item.icon,
      label: item.route ? <Link to={item.route}>{item.label}</Link> : item.label,
    };
  });
}

export function AdminLayout() {
  const { menuItems, selectedKey, defaultOpenKeys } = useMenu();
  const Link = useLink();
  const { mutate: logout } = useLogout();
  const breakpoint = useBreakpoint();
  const { token } = theme.useToken();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = breakpoint.lg === false;

  const items = useMemo<MenuProps["items"]>(() => {
    const links = toMenuItems(menuItems, Link) ?? [];
    return [
      ...links,
      {
        key: "logout",
        icon: <LogoutOutlined />,
        label: "Logout",
        danger: true,
        onClick: () => logout(),
      },
    ];
  }, [Link, logout, menuItems]);

  const menu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={selectedKey ? [selectedKey] : []}
      defaultOpenKeys={defaultOpenKeys}
      items={items}
      onClick={() => {
        if (isMobile) setDrawerOpen(false);
      }}
      style={{ borderInlineEnd: 0 }}
    />
  );

  const siderInner = (
    <>
      <div
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
        }}
      >
        <ThemedTitleV2
          collapsed={false}
          text="HQ Control"
          icon={<DashboardOutlined />}
        />
      </div>
      {menu}
    </>
  );

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {isMobile ? (
        <>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            placement="left"
            closable={false}
            width={240}
            styles={{ body: { padding: 0 } }}
            maskClosable
          >
            <Sider width={240} theme="dark" style={{ minHeight: "100vh" }}>
              {siderInner}
            </Sider>
          </Drawer>
          <Header
            style={{
              padding: "0 16px",
              display: "flex",
              alignItems: "center",
              background: token.colorBgContainer,
            }}
          >
            <Button
              type="text"
              aria-label="Open menu"
              icon={<MenuUnfoldOutlined />}
              onClick={() => setDrawerOpen(true)}
            />
          </Header>
        </>
      ) : (
        <Sider width={240} theme="dark">
          {siderInner}
        </Sider>
      )}

      <Layout>
        <Content style={{ padding: isMobile ? 12 : 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
