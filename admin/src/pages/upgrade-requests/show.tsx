import { Show } from "@refinedev/antd";
import { useList, useShow, useUpdate } from "@refinedev/core";
import { Button, Descriptions, Input, Space, Tag, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import type { ApiMember, ApiUpgradeRequest } from "@/lib/api";

const { Text } = Typography;

const statusColor: Record<string, string> = {
  PENDING: "gold",
  UNDER_REVIEW: "blue",
  APPROVED: "green",
  REJECTED: "red",
};

export function UpgradeRequestShowPage() {
  const { id } = useParams();
  const { queryResult } = useShow<ApiUpgradeRequest>({
    resource: "upgrade-requests",
    id,
  });
  const record = queryResult?.data?.data;
  const { data: membersData } = useList<ApiMember>({ resource: "members" });
  const member = useMemo(
    () => membersData?.data?.find((m) => m.id === record?.member_id),
    [membersData, record?.member_id]
  );

  const { mutate: update } = useUpdate();
  const [reviewLoading, setReviewLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const review = (status: string) => {
    if (!record) return;
    setReviewLoading(true);
    update(
      {
        resource: "upgrade-requests",
        id: record.id,
        values: {
          status,
          ...(notes.trim() ? { admin_notes: notes.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          message.success(`Request ${status.toLowerCase().replace("_", " ")}`);
          void queryResult?.refetch();
        },
        onError: (e) => message.error(String(e.message ?? "Update failed")),
        onSettled: () => setReviewLoading(false),
      }
    );
  };

  const canReview =
    record?.status === "PENDING" || record?.status === "UNDER_REVIEW";

  return (
    <Show title="Upgrade request" isLoading={queryResult?.isLoading}>
      {record && (
        <>
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Member">
              {member?.name ?? record.member_id}
              {member?.email ? ` (${member.email})` : ""}
            </Descriptions.Item>
            <Descriptions.Item label="Tier change">
              {record.from_tier} → {record.to_tier}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={statusColor[record.status]}>
                {record.status.replace("_", " ")}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Submitted">
              {new Date(record.created_at).toLocaleString()}
            </Descriptions.Item>
            {record.admin_notes && (
              <Descriptions.Item label="Admin notes">{record.admin_notes}</Descriptions.Item>
            )}
          </Descriptions>

          {canReview && (
            <Space direction="vertical" style={{ width: "100%", marginTop: 24 }} size="middle">
              <Text type="secondary">Review this request (member will be notified).</Text>
              <Input.TextArea
                rows={3}
                placeholder="Optional note for rejection or internal record"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Space wrap>
                <Button type="primary" loading={reviewLoading} onClick={() => review("APPROVED")}>
                  Approve
                </Button>
                <Button danger loading={reviewLoading} onClick={() => review("REJECTED")}>
                  Reject
                </Button>
                {record.status === "PENDING" && (
                  <Button loading={reviewLoading} onClick={() => review("UNDER_REVIEW")}>
                    Mark under review
                  </Button>
                )}
              </Space>
            </Space>
          )}
        </>
      )}
    </Show>
  );
}
