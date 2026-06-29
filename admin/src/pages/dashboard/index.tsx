import { useEffect, useState } from "react";
import { Card, Col, Row, Statistic, Typography } from "antd";
import { apiFetch, type ApiMember, type ApiUpgradeRequest } from "@/lib/api";

const { Title, Text } = Typography;

export function DashboardPage() {
  const [members, setMembers] = useState<ApiMember[]>([]);
  const [requests, setRequests] = useState<ApiUpgradeRequest[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [m, r] = await Promise.all([
          apiFetch<ApiMember[]>("/admin/members"),
          apiFetch<ApiUpgradeRequest[]>("/admin/upgrade-requests"),
        ]);
        setMembers(m);
        setRequests(r);
      } catch {
        /* dashboard stats are best-effort */
      }
    })();
  }, []);

  const pending = requests.filter(
    (r) => r.status === "PENDING" || r.status === "UNDER_REVIEW"
  ).length;

  return (
    <div>
      <Title level={4}>HQ Dashboard</Title>
      <Text type="secondary">Overview of membership operations.</Text>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Total members" value={members.length} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Pending upgrades" value={pending} valueStyle={{ color: "#faad14" }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Approved (all time)"
              value={requests.filter((r) => r.status === "APPROVED").length}
              valueStyle={{ color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="Admins" value={members.filter((m) => m.role === "admin").length} />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
