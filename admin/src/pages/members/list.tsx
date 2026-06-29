import { List, EditButton, useTable } from "@refinedev/antd";
import { Table, Tag } from "antd";
import type { ApiMember } from "@/lib/api";

const statusColor: Record<string, string> = {
  ACTIVE: "green",
  INACTIVE: "default",
};

export function MemberListPage() {
  const { tableProps } = useTable<ApiMember>({
    resource: "members",
    syncWithLocation: true,
  });

  return (
    <List title="Members">
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" />
        <Table.Column dataIndex="email" title="Email" />
        <Table.Column dataIndex="tier" title="Tier" />
        <Table.Column
          dataIndex="role"
          title="Role"
          render={(v: string) => (
            <Tag color={v === "admin" ? "purple" : "blue"}>{v}</Tag>
          )}
        />
        <Table.Column
          dataIndex="status"
          title="Status"
          render={(v: string) => <Tag color={statusColor[v] ?? "default"}>{v}</Tag>}
        />
        <Table.Column
          title="Actions"
          render={(_, record: ApiMember) => <EditButton hideText size="small" recordItemId={record.id} />}
        />
      </Table>
    </List>
  );
}
