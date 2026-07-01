import { useEffect, useMemo, useState } from "react";
import { List, useTable } from "@refinedev/antd";
import { useList } from "@refinedev/core";
import { Alert, Button, Space, Table, Tag, Typography } from "antd";
import { Link } from "react-router-dom";
import type { ApiMember, ApiUpgradeRequest } from "@/lib/api";

const { Paragraph, Text } = Typography;
const BANNER_MS = 6000;

const statusColor: Record<string, string> = {
  PENDING: "gold",
  UNDER_REVIEW: "blue",
  APPROVED: "green",
  REJECTED: "red",
};

function needsReview(status: string): boolean {
  return status === "PENDING" || status === "UNDER_REVIEW";
}

export function UpgradeRequestListPage() {
  const { tableProps } = useTable<ApiUpgradeRequest>({
    resource: "upgrade-requests",
    syncWithLocation: true,
  });

  const { data: membersData } = useList<ApiMember>({ resource: "members" });
  const memberMap = useMemo(() => {
    const map = new Map<string, ApiMember>();
    for (const m of membersData?.data ?? []) map.set(m.id, m);
    return map;
  }, [membersData]);

  const rows = (tableProps.dataSource ?? []) as ApiUpgradeRequest[];
  const pendingCount = rows.filter((r) => needsReview(r.status)).length;
  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    if (pendingCount === 0) {
      setBannerVisible(false);
      return;
    }
    setBannerVisible(true);
    const timer = window.setTimeout(() => setBannerVisible(false), BANNER_MS);
    return () => window.clearTimeout(timer);
  }, [pendingCount]);

  return (
    <div>
      {bannerVisible && pendingCount > 0 && (
        <Alert
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 16 }}
          message={`${pendingCount} request${pendingCount === 1 ? "" : "s"} need review`}
          description="Use the Review button in each row to approve, reject, or mark under review."
          onClose={() => setBannerVisible(false)}
        />
      )}

      <List title="Upgrade requests" canCreate={false}>
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          Approve or reject member tier upgrades.
        </Paragraph>
        <Table {...tableProps} rowKey="id">
          <Table.Column
            title="Member"
            render={(_, row: ApiUpgradeRequest) => {
              const m = memberMap.get(row.member_id);
              return (
                <Space direction="vertical" size={0}>
                  <span>{m?.name ?? "Unknown"}</span>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {m?.email}
                  </Text>
                </Space>
              );
            }}
          />
          <Table.Column dataIndex="from_tier" title="From" />
          <Table.Column dataIndex="to_tier" title="To" />
          <Table.Column
            dataIndex="status"
            title="Status"
            render={(v: string) => <Tag color={statusColor[v]}>{v.replace("_", " ")}</Tag>}
          />
          <Table.Column
            dataIndex="created_at"
            title="Submitted"
            render={(v: string) => new Date(v).toLocaleString()}
          />
          <Table.Column
            title="Actions"
            width={120}
            render={(_, record: ApiUpgradeRequest) => {
              const review = needsReview(record.status);
              return (
                <Link to={`/upgrade-requests/show/${record.id}`}>
                  <Button size="small" type={review ? "primary" : "default"}>
                    {review ? "Review" : "View"}
                  </Button>
                </Link>
              );
            }}
          />
        </Table>
      </List>
    </div>
  );
}
