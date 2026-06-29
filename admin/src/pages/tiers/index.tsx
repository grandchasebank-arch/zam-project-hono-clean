import { Create, Edit, List, useForm, useTable } from "@refinedev/antd";
import { Form, Input, InputNumber, Switch, Table } from "antd";
import type { FormProps } from "antd";
import { useParams } from "react-router-dom";
import type { ApiTier } from "@/lib/api";

export function TierListPage() {
  const { tableProps } = useTable<ApiTier>({ resource: "tiers" });
  return (
    <List title="Membership tiers">
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="label" title="Label" />
        <Table.Column dataIndex="rank" title="Rank" />
        <Table.Column dataIndex="price" title="Price" render={(v) => `$${Number(v).toLocaleString()}`} />
        <Table.Column dataIndex="is_active" title="Active" render={(v) => (v ? "Yes" : "No")} />
      </Table>
    </List>
  );
}

export function TierCreatePage() {
  const { formProps, saveButtonProps } = useForm<ApiTier>({ resource: "tiers" });
  return (
    <Create saveButtonProps={saveButtonProps} title="New tier">
      <TierForm formProps={formProps} />
    </Create>
  );
}

export function TierEditPage() {
  const { id } = useParams();
  const { formProps, saveButtonProps } = useForm<ApiTier>({ resource: "tiers", action: "edit", id });
  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit tier">
      <TierForm formProps={formProps} />
    </Edit>
  );
}

function TierForm({
  formProps,
}: {
  formProps: FormProps;
}) {
  return (
    <Form {...formProps} layout="vertical">
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input placeholder="Explorer" />
      </Form.Item>
      <Form.Item name="label" label="Label" rules={[{ required: true }]}>
        <Input placeholder="Level 1" />
      </Form.Item>
      <Form.Item name="rank" label="Rank" rules={[{ required: true }]}>
        <InputNumber min={1} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item name="price" label="Price (USD)" rules={[{ required: true }]}>
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item name="description" label="Description">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item name="is_active" label="Active" valuePropName="checked">
        <Switch />
      </Form.Item>
    </Form>
  );
}
