import { useEffect, useState } from "react";
import { Card, Form, Input, Button, Checkbox, Typography, Tag, Popconfirm, message, Space, Modal } from "antd";
import api from "../api";

const { Text } = Typography;

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [error, setError] = useState("");
  const [form] = Form.useForm();
  const [resetTarget, setResetTarget] = useState(null); // staff object being reset, or null
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const load = () => {
    api.get("/staff").then((res) => setStaff(res.data)).catch((e) => setError(e.response?.data?.detail || "Failed to load"));
  };

  useEffect(() => { load(); }, []);

  const addStaff = async (values) => {
    setError("");
    try {
      await api.post("/staff", values);
      form.resetFields();
      message.success("Staff member added");
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add staff member");
    }
  };

  const toggleActive = async (id) => {
    await api.patch(`/staff/${id}/toggle-active`);
    load();
  };

  const updatePermission = async (id, field, value) => {
    await api.patch(`/staff/${id}/permissions`, { [field]: value });
    load();
  };

  const removeStaff = async (id) => {
    await api.delete(`/staff/${id}`);
    message.success("Staff member removed");
    load();
  };

  // Shop owner resets their own staff's password directly — previously
  // this needed Cartbi admin involvement via the platform-wide "All Users"
  // table, even though staff are otherwise entirely self-service here.
  const submitPasswordReset = async () => {
    if (!newPassword || newPassword.length < 4) {
      message.error("Password must be at least 4 characters");
      return;
    }
    setResetting(true);
    try {
      await api.post(`/staff/${resetTarget.id}/reset-password`, { new_password: newPassword });
      message.success(`Password reset for ${resetTarget.name}. Let them know their new password directly.`);
      setResetTarget(null);
      setNewPassword("");
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not reset password");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div>
      <Card title="Add Staff (Sales/POS access only)" style={{ maxWidth: 480, marginBottom: 20 }}>
        <Text type="secondary">
          Staff accounts can only use the "New Sale" billing screen by default —
          they cannot see customer details, pricing controls, analytics, or other
          shop data. No approval needed from Cartbi, this is fully controlled by you.
          You can optionally grant extra permissions below after creating them.
        </Text>
        {error && <Text type="danger" style={{ display: "block", marginTop: 8 }}>{error}</Text>}
        <Form form={form} layout="vertical" onFinish={addStaff} style={{ marginTop: 16 }}>
          <Form.Item name="name" label="Staff name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Phone number" rules={[{ required: true }]}>
            <Input inputMode="numeric" onChange={(e) => e.target.value = e.target.value.replace(/[^\d]/g, "")} />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit">Add Staff</Button>
        </Form>
      </Card>

      <Card title="Your Staff">
        {staff.length === 0 && <Text type="secondary">No staff added yet.</Text>}
        {staff.map((s) => (
          <div key={s.id} style={{ padding: "14px 0", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <Text strong>{s.name}</Text>{" "}
                {!s.is_active && <Tag color="red">Disabled</Tag>}
                <div><Text type="secondary" style={{ fontSize: 12 }}>{s.phone}</Text></div>
              </div>
              <Space>
                <Button size="small" onClick={() => { setResetTarget(s); setNewPassword(""); }}>Reset PW</Button>
                <Button size="small" onClick={() => toggleActive(s.id)}>
                  {s.is_active ? "Disable" : "Enable"}
                </Button>
                <Popconfirm title={`Remove ${s.name}?`} onConfirm={() => removeStaff(s.id)}>
                  <Button size="small" danger>Remove</Button>
                </Popconfirm>
              </Space>
            </div>
            <div style={{ marginTop: 8 }}>
              <Space direction="vertical" size={4}>
                <Checkbox
                  checked={s.can_view_orders}
                  onChange={(e) => updatePermission(s.id, "can_view_orders", e.target.checked)}
                >
                  Can view orders
                </Checkbox>
                <Checkbox
                  checked={s.can_share_signup_link}
                  onChange={(e) => updatePermission(s.id, "can_share_signup_link", e.target.checked)}
                >
                  Can share customer signup link
                </Checkbox>
              </Space>
            </div>
          </div>
        ))}
      </Card>

      <Modal
        title={`Reset password for ${resetTarget?.name || ""}`}
        open={!!resetTarget}
        onCancel={() => setResetTarget(null)}
        onOk={submitPasswordReset}
        okText="Reset Password"
        confirmLoading={resetting}
      >
        <Text type="secondary">
          Set a new password for this staff member. Let them know it directly — there's no automatic notification.
        </Text>
        <Input.Password
          placeholder="New password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{ marginTop: 12 }}
        />
      </Modal>
    </div>
  );
}
