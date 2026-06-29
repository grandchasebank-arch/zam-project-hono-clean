import { Edit, useForm } from "@refinedev/antd";
import {
  BankOutlined,
  MailOutlined,
  SettingOutlined,
  SkinOutlined,
} from "@ant-design/icons";
import { Collapse, Divider, Form, Input, Switch, Typography } from "antd";
import type { ApiSettings } from "@/lib/api";

const { Text, Paragraph } = Typography;

/** Laravel parallel: AppSettingsController singleton row */
export function SettingsEditPage() {
  const { formProps, saveButtonProps, queryResult } = useForm<ApiSettings>({
    resource: "settings",
    id: "1",
    action: "edit",
  });

  return (
    <Edit
      saveButtonProps={saveButtonProps}
      title="App settings"
      isLoading={queryResult?.isLoading}
    >
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        Configure branding, company details, outbound email, and platform toggles.
        Changes apply immediately for new API requests.
      </Paragraph>

      <Form {...formProps} layout="vertical">
        <Collapse
          accordion
          defaultActiveKey={["branding"]}
          bordered
          style={{ background: "transparent" }}
          items={[
            {
              key: "branding",
              label: (
                <Text strong>
                  <SkinOutlined style={{ marginRight: 8 }} />
                  Branding
                </Text>
              ),
              children: (
                <>
                  <Form.Item name="site_name" label="Site name" rules={[{ required: true }]}>
                    <Input placeholder="SpaceX Member Portal" />
                  </Form.Item>
                  <Form.Item name="site_tagline" label="Tagline">
                    <Input placeholder="Member Portal" />
                  </Form.Item>
                  <Form.Item
                    name="logo_url"
                    label="Logo URL"
                    extra="Public URL or path (e.g. /logo.png or https://cdn.example.com/logo.svg)"
                  >
                    <Input placeholder="/logo.png" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "company",
              label: (
                <Text strong>
                  <BankOutlined style={{ marginRight: 8 }} />
                  Company
                </Text>
              ),
              children: (
                <>
                  <Form.Item name="company_name" label="Company name">
                    <Input placeholder="SpaceX HQ" />
                  </Form.Item>
                  <Form.Item name="company_address" label="Address">
                    <Input.TextArea rows={3} placeholder="1 Rocket Road, Hawthorne, CA 90250" />
                  </Form.Item>
                  <Form.Item name="company_phone" label="Phone">
                    <Input placeholder="+1 (310) 363-6000" />
                  </Form.Item>
                  <Form.Item name="company_website" label="Website">
                    <Input type="url" placeholder="https://www.spacex.com" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "email",
              label: (
                <Text strong>
                  <MailOutlined style={{ marginRight: 8 }} />
                  Email
                </Text>
              ),
              children: (
                <>
                  <Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
                    Outbound mail uses Resend. The API key stays in server env; these fields
                    control the From header and reply address.
                  </Text>
                  <Form.Item name="mail_from_name" label="From name">
                    <Input placeholder="SpaceX Member Portal" />
                  </Form.Item>
                  <Form.Item
                    name="mail_from_email"
                    label="From email"
                    rules={[{ type: "email", message: "Enter a valid email" }]}
                  >
                    <Input placeholder="noreply@spacexhqvip.com" />
                  </Form.Item>
                  <Form.Item
                    name="mail_reply_to"
                    label="Reply-to email"
                    rules={[{ type: "email", message: "Enter a valid email" }]}
                  >
                    <Input placeholder="support@spacex.hq" />
                  </Form.Item>
                  <Divider style={{ margin: "12px 0" }} />
                  <Form.Item
                    name="support_email"
                    label="Support / contact email"
                    rules={[{ type: "email", message: "Enter a valid email" }]}
                  >
                    <Input placeholder="admin@spacex.hq" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: "platform",
              label: (
                <Text strong>
                  <SettingOutlined style={{ marginRight: 8 }} />
                  Platform
                </Text>
              ),
              children: (
                <>
                  <Form.Item
                    name="maintenance_mode"
                    label="Maintenance mode"
                    valuePropName="checked"
                    extra="When on, the member portal should block access (wire via GET /settings/public)."
                  >
                    <Switch />
                  </Form.Item>
                  <Form.Item
                    name="upgrade_enabled"
                    label="Upgrades enabled"
                    valuePropName="checked"
                    extra="When off, members cannot submit new tier upgrade requests."
                  >
                    <Switch />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
      </Form>
    </Edit>
  );
}
