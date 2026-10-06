import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, Form, Input, Button, Typography, Alert, Space } from "antd";
import { UserOutlined, PhoneOutlined, LockOutlined, ShoppingOutlined, ArrowLeftOutlined } from "@ant-design/icons";
import { useAuth } from "../auth/AuthContext.jsx";

const { Title, Text } = Typography;

export default function Signup() {
  const [searchParams] = useSearchParams();
  const shopId = searchParams.get("shop");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const submit = async (values) => {
    setError("");
    setLoading(true);
    try {
      const payload = { ...values, role: shopId ? "customer" : "shop_owner", business_id: shopId || null };
      const user = await signup(payload);
      if (user.role === "customer" && user.business_id) {
        navigate(`/shop/${user.business_id}`);
      } else if (user.role === "shop_owner") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const formFields = (
    <Form layout="vertical" onFinish={submit}>
      <Form.Item name="name" label="Name" rules={[{ required: true }]}>
        <Input prefix={<UserOutlined />} placeholder="Your name" />
      </Form.Item>
      <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
        <Input prefix={<PhoneOutlined />} placeholder="e.g. 9876543210" inputMode="numeric" />
      </Form.Item>
      <Form.Item name="password" label="Password" rules={[{ required: true }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="Choose a password" />
      </Form.Item>
      <Button type="primary" htmlType="submit" block loading={loading}>
        {shopId ? "Create account" : "Create Shop Owner Account"}
      </Button>
    </Form>
  );

  // Customer signup requires a shop-specific link (e.g. shared via WhatsApp/QR
  // by the shop owner) — we never show a "pick your shop" dropdown to customers.
  if (!shopId) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
        <div style={{ maxWidth: 460, width: "100%" }}>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, color: "#6b7280" }}>
            <ArrowLeftOutlined /> Back to home
          </Link>
          <Card>
          <Space direction="vertical" align="center" style={{ width: "100%", marginBottom: 16 }}>
            <ShoppingOutlined style={{ fontSize: 32, color: "#2563eb" }} />
            <Title level={3} style={{ margin: 0 }}>Sign up</Title>
          </Space>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Customer sign up requires a shop link"
            description="To sign up as a customer, please use the signup link shared by your shop (via WhatsApp or a QR code at the counter). If you're a shop owner setting up your store, create your account below."
          />
          {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
          {formFields}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Text>Already have an account? <Link to="/login">Login</Link></Text>
          </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", paddingTop: 40 }}>
      <div style={{ maxWidth: 420, width: "100%" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 12, color: "#6b7280" }}>
          <ArrowLeftOutlined /> Back to home
        </Link>
        <Card>
        <Space direction="vertical" align="center" style={{ width: "100%", marginBottom: 16 }}>
          <ShoppingOutlined style={{ fontSize: 32, color: "#2563eb" }} />
          <Title level={3} style={{ margin: 0 }}>Sign up</Title>
          <Text type="secondary">You're signing up as a customer of this shop.</Text>
        </Space>
        {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
        {formFields}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text>Already have an account? <Link to="/login">Login</Link></Text>
        </div>
        </Card>
      </div>
    </div>
  );
}
