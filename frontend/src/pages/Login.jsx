import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, Alert, Space } from "antd";
import { PhoneOutlined, LockOutlined, ShoppingOutlined } from "@ant-design/icons";
import { useAuth } from "../auth/AuthContext.jsx";

const { Title, Text } = Typography;

export default function Login() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async ({ phone, password }) => {
    setError("");
    if (!/^\d{6,15}$/.test(phone)) {
      setError("Please enter a valid phone number (digits only, no name or spaces).");
      return;
    }
    setLoading(true);
    try {
      const user = await login(phone, password);
      if (user.role === "customer" && user.business_id) {
        navigate(`/shop/${user.business_id}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
      <Card style={{ maxWidth: 420, width: "100%" }}>
        <Space direction="vertical" align="center" style={{ width: "100%", marginBottom: 16 }}>
          <ShoppingOutlined style={{ fontSize: 32, color: "#2563eb" }} />
          <Title level={3} style={{ margin: 0 }}>Login</Title>
          <Text type="secondary" style={{ textAlign: "center" }}>
            Log in with the phone number you signed up with — not your name.
          </Text>
        </Space>

        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}

        <Form layout="vertical" onFinish={submit}>
          <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: "Phone number is required" }]}>
            <Input
              prefix={<PhoneOutlined />}
              placeholder="e.g. 9876543210"
              inputMode="numeric"
              maxLength={15}
              onChange={(e) => e.target.value = e.target.value.replace(/[^\d]/g, "")}
            />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, message: "Password is required" }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>Login</Button>
        </Form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text>No account? <Link to="/signup">Sign up</Link></Text>
        </div>
      </Card>
    </div>
  );
}
