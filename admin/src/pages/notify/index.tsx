import { useState } from "react";
import { Card, Form, Input, Select, Button, Typography, message } from "antd";
import { useList } from "@refinedev/core";
import { adminNotify, type ApiMember } from "@/lib/api";

const { Title, Text } = Typography;

export function NotifyPage() {
  const { data } = useList<ApiMember>({ resource: "members" });
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { member_id: string; title: string; message: string }) => {
    setLoading(true);
    try {
      await adminNotify(values.member_id, values.title, values.message);
      message.success("Notification sent to member");
    } catch (e) {
      message.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={4}>Notify member</Title>
      <Text type="secondary">Push an in-app notification to a specific member.</Text>
      <Card style={{ marginTop: 16, maxWidth: 560 }}>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="member_id" label="Member" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={(data?.data ?? []).map((m) => ({
                value: m.id,
                label: `${m.name} (${m.email})`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label="Title"
            initialValue="Admin Notice"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="message" label="Message" rules={[{ required: true }]}>
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Button loading={loading} type="primary" htmlType="submit">
              Send notification
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
