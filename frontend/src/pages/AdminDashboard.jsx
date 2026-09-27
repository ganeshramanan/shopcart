import { useEffect, useState } from "react";
import { Row, Col, Card, Statistic, Table, Tag, Button, Popconfirm, Typography, message, Input } from "antd";
import api from "../api";

const { Title, Text } = Typography;

export default function AdminDashboard() {
  const [owners, setOwners] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [userSearch, setUserSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Cartbi — Platform Admin";
    return () => { document.title = "ShopCart — Order Simple, Bill Right"; };
  }, []);

  const load = () => {
    api.get("/admin/shop-owners").then((res) => setOwners(res.data)).catch((e) => setError(e.response?.data?.detail || "Failed to load"));
    api.get("/admin/businesses").then((res) => setBusinesses(res.data)).catch(() => {});
    api.get("/admin/users").then((res) => setAllUsers(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (ownerId) => {
    await api.patch(`/admin/shop-owners/${ownerId}/toggle-active`);
    load();
  };

  const approve = async (ownerId) => {
    await api.patch(`/admin/shop-owners/${ownerId}/approve`);
    message.success("Approved");
    load();
  };

  const reject = async (ownerId) => {
    await api.patch(`/admin/shop-owners/${ownerId}/reject`);
    message.success("Rejected");
    load();
  };

  const deleteBusiness = async (businessId) => {
    await api.delete(`/businesses/${businessId}`);
    message.success("Business deleted");
    load();
  };

  const deleteOwner = async (ownerId) => {
    try {
      await api.delete(`/admin/shop-owners/${ownerId}`);
      message.success("Shop owner deleted");
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not delete this shop owner");
    }
  };

  const deleteUser = async (userId) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      message.success("User deleted");
      load();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not delete this user");
    }
  };

  const pendingOwners = owners.filter((o) => o.approval_status === "pending");
  const decidedOwners = owners.filter((o) => o.approval_status !== "pending");

  const filteredUsers = allUsers.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || (u.phone && u.phone.includes(q));
  });

  const ownerColumns = [
    {
      title: "Name", dataIndex: "name", key: "name",
      render: (name, o) => (
        <div>
          <Text strong>{name}</Text>{" "}
          {!o.is_active && <Tag color="red">Disabled</Tag>}
          {o.approval_status === "rejected" && <Tag color="red">Rejected</Tag>}
        </div>
      ),
    },
    { title: "Phone", dataIndex: "phone", key: "phone" },
    {
      title: "Business", key: "business",
      render: (_, o) => o.business_name ? `${o.business_name} (${o.business_type})` : <Text type="secondary">No business yet</Text>,
    },
    {
      title: "", key: "actions", width: 200,
      render: (_, o) => (
        <div style={{ display: "flex", gap: 8 }}>
          {o.approval_status === "approved" && (
            <Button size="small" onClick={() => toggleActive(o.id)}>{o.is_active ? "Disable" : "Enable"}</Button>
          )}
          {!o.business_id && (
            <Popconfirm title={`Delete ${o.name}?`} onConfirm={() => deleteOwner(o.id)}>
              <Button size="small" danger>Delete</Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  const businessColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Type", dataIndex: "type", key: "type" },
    { title: "Products", dataIndex: "product_count", key: "product_count" },
    { title: "Orders", dataIndex: "order_count", key: "order_count" },
    {
      title: "", key: "actions",
      render: (_, b) => (
        <Popconfirm title={`Delete "${b.name}"? This removes all its products and orders.`} onConfirm={() => deleteBusiness(b.id)}>
          <Button size="small" danger>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  const userColumns = [
    {
      title: "Name", dataIndex: "name", key: "name",
      render: (name, u) => (
        <div>
          <Text strong>{name}</Text>{" "}
          <Tag>{u.role}</Tag>
          {!u.is_active && <Tag color="red">Disabled</Tag>}
          {u.is_guest && <Tag color="default">Guest</Tag>}
        </div>
      ),
    },
    { title: "Phone", dataIndex: "phone", key: "phone", render: (p) => p || <Text type="secondary">—</Text> },
    {
      title: "Business", key: "business",
      render: (_, u) => u.business_name || <Text type="secondary">—</Text>,
    },
    { title: "Orders", dataIndex: "order_count", key: "order_count", width: 80 },
    {
      title: "", key: "actions", width: 100,
      render: (_, u) => (
        <Popconfirm
          title={`Permanently delete ${u.name}?`}
          description="This cannot be undone."
          onConfirm={() => deleteUser(u.id)}
        >
          <Button size="small" danger>Delete</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <Title level={3} style={{ marginBottom: 0 }}>Cartbi Platform Overview</Title>
      <Text type="secondary">Manage every shop and shop owner running on ShopCart</Text>

      {error && <Text type="danger">{error}</Text>}

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col xs={12} md={6}><Card><Statistic title="Businesses" value={businesses.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Shop Owners" value={owners.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Pending Approval" value={pendingOwners.length} /></Card></Col>
        <Col xs={12} md={6}><Card><Statistic title="Disabled" value={owners.filter((o) => !o.is_active).length} /></Card></Col>
      </Row>

      {pendingOwners.length > 0 && (
        <Card title="Pending Requests" style={{ marginTop: 20 }}>
          {pendingOwners.map((o) => (
            <div key={o.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
              <div>
                <Text strong>{o.name}</Text> <Tag color="gold">Pending</Tag>
                <div><Text type="secondary" style={{ fontSize: 12 }}>{o.phone} · Registered {new Date(o.created_at).toLocaleDateString()}</Text></div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button type="primary" size="small" onClick={() => approve(o.id)}>Approve</Button>
                <Button size="small" danger onClick={() => reject(o.id)}>Reject</Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Card title="Shop Owners" style={{ marginTop: 20 }}>
        <Table dataSource={decidedOwners} columns={ownerColumns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Card title="All Businesses" style={{ marginTop: 20 }}>
        <Table dataSource={businesses} columns={businessColumns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>

      <Card title="All Users (any role)" style={{ marginTop: 20 }}>
        <Text type="secondary">
          Full account list across every role — useful for finding orphaned/misconfigured accounts
          not shown in the Shop Owners list above (e.g. a stuck phone number blocking a new signup).
        </Text>
        <Input
          placeholder="Search by name or phone..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          style={{ margin: "12px 0", maxWidth: 320 }}
          allowClear
        />
        <Table dataSource={filteredUsers} columns={userColumns} rowKey="id" pagination={{ pageSize: 10 }} />
      </Card>
    </div>
  );
}
