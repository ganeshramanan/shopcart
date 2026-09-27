import { useEffect, useState } from "react";
import { Card, Typography, Empty, Button, Input, Space, Tag, Modal, Form, message, Popconfirm } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, HomeOutlined, StarFilled } from "@ant-design/icons";
import api from "../api";

const { Title, Text } = Typography;

// Customer's saved delivery addresses — Home/Work/Other, with one marked
// default. Plain CRUD against /addresses; no delivery-routing logic here,
// just storage + selection UI for checkout to eventually read from.
export default function AddressBook() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // address being edited, or null for "new"
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/addresses").then((res) => setAddresses(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (address) => {
    setEditing(address);
    form.setFieldsValue(address);
    setModalOpen(true);
  };

  const save = async (values) => {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/addresses/${editing.id}`, values);
        message.success("Address updated");
      } else {
        await api.post("/addresses", values);
        message.success("Address added");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not save address");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    await api.delete(`/addresses/${id}`);
    message.success("Address removed");
    load();
  };

  const makeDefault = async (id) => {
    await api.patch(`/addresses/${id}`, { is_default: true });
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>📍 My Addresses</Title>
          <Text type="secondary">Save your delivery addresses for faster checkout</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>Add Address</Button>
      </div>

      <div style={{ marginTop: 20 }}>
        {!loading && addresses.length === 0 && (
          <Empty description="No saved addresses yet" style={{ marginTop: 40 }} />
        )}
        {addresses.map((a) => (
          <Card key={a.id} size="small" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <Space>
                  <HomeOutlined />
                  <Text strong>{a.label}</Text>
                  {a.is_default && <Tag color="green">Default</Tag>}
                </Space>
                <div style={{ marginTop: 4 }}>
                  <Text type="secondary">
                    {a.line1}{a.line2 ? `, ${a.line2}` : ""}{a.city ? `, ${a.city}` : ""}{a.pincode ? ` - ${a.pincode}` : ""}
                  </Text>
                </div>
              </div>
              <Space>
                {!a.is_default && (
                  <Button size="small" icon={<StarFilled />} onClick={() => makeDefault(a.id)}>Make Default</Button>
                )}
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(a)} />
                <Popconfirm title="Remove this address?" onConfirm={() => remove(a.id)}>
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
              </Space>
            </div>
          </Card>
        ))}
      </div>

      <Modal
        title={editing ? "Edit Address" : "Add Address"}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText="Save"
        confirmLoading={saving}
      >
        <Form form={form} layout="vertical" onFinish={save} initialValues={{ label: "Home" }}>
          <Form.Item name="label" label="Label" rules={[{ required: true }]}>
            <Input placeholder="Home, Work, Other..." />
          </Form.Item>
          <Form.Item name="line1" label="Address Line 1" rules={[{ required: true }]}>
            <Input placeholder="House no, street" />
          </Form.Item>
          <Form.Item name="line2" label="Address Line 2 (optional)">
            <Input placeholder="Landmark, area" />
          </Form.Item>
          <Form.Item name="city" label="City (optional)">
            <Input />
          </Form.Item>
          <Form.Item name="pincode" label="Pincode (optional)">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
