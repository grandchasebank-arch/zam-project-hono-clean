import { Edit, useForm } from "@refinedev/antd";
import { Form, Input, Select } from "antd";
import { useParams } from "react-router-dom";
import type { ApiMember } from "@/lib/api";

export function MemberEditPage() {
  const { id } = useParams();
  const { formProps, saveButtonProps } = useForm<ApiMember>({
    resource: "members",
    action: "edit",
    id,
  });

  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit member">
      <Form {...formProps} layout="vertical">
        <Form.Item label="Name" name="name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Tier" name="tier">
          <Input />
        </Form.Item>
        <Form.Item label="Status" name="status">
          <Select
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />
        </Form.Item>
        <Form.Item label="Role" name="role">
          <Select
            options={[
              { value: "member", label: "Member" },
              { value: "admin", label: "Admin" },
            ]}
          />
        </Form.Item>
      </Form>
    </Edit>
  );
}
