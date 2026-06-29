import { useState } from "react";
import { useLogin } from "@refinedev/core";
import { Alert, Button, Card, Form, Input, Space, Typography } from "antd";
import { useSearchParams } from "react-router-dom";

const { Title, Text } = Typography;

export function LoginPage() {
  const [searchParams] = useSearchParams();
  const presetEmail = searchParams.get("email") ?? "";
  const step = searchParams.get("step") === "otp" ? "otp" : "email";

  const { mutate: login } = useLogin();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState(presetEmail);
  const [error, setError] = useState<string | null>(null);

  const onEmail = () => {
    setError(null);
    setIsLoading(true);
    login(
      { email },
      {
        onSettled: () => setIsLoading(false),
        onError: (e) => setError(String(e.message ?? e)),
      }
    );
  };

  const onOtp = (values: { otp: string }) => {
    setError(null);
    setIsLoading(true);
    login(
      { email, otp: values.otp },
      {
        onSettled: () => setIsLoading(false),
        onSuccess: (result) => {
          if (result?.error) setError(result.error.message);
        },
        onError: (e) => setError(String(e.message ?? e)),
      }
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1117",
        padding: 24,
      }}
    >
      <Card style={{ width: 420, maxWidth: "100%" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Text type="secondary">SpaceX HQ</Text>
            <Title level={3} style={{ margin: "4px 0 0" }}>
              Admin Control
            </Title>
            <Text type="secondary">
              Restricted access — HQ administrators only.
            </Text>
          </div>

          {error && <Alert type="error" message={error} showIcon />}

          {step === "email" ? (
            <>
              <Input
                size="large"
                type="email"
                placeholder="admin@spacex.hq"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onPressEnter={onEmail}
              />
              <Button
                type="primary"
                size="large"
                block
                loading={isLoading}
                onClick={onEmail}
              >
                Send verification code
              </Button>
            </>
          ) : (
            <Form layout="vertical" onFinish={onOtp}>
              <Text type="secondary">Code sent to {email}</Text>
              <Form.Item
                name="otp"
                label="6-digit code"
                rules={[{ required: true, len: 6, message: "Enter 6 digits" }]}
              >
                <Input size="large" maxLength={6} inputMode="numeric" />
              </Form.Item>
              <Button type="primary" htmlType="submit" block loading={isLoading}>
                Verify & sign in
              </Button>
            </Form>
          )}
        </Space>
      </Card>
    </div>
  );
}
