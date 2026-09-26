import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Layout, Menu, Card, Row, Col, Statistic, Button, Input, Select, DatePicker,
  Table, Tag, Space, Badge, Form, Upload, message, Popconfirm, Empty, Typography,
} from "antd";
import {
  HomeOutlined, ShoppingCartOutlined, InboxOutlined, PlusCircleOutlined,
  UploadOutlined, TeamOutlined, TagsOutlined, BarChartOutlined, UserOutlined,
  CopyOutlined, WhatsAppOutlined, QrcodeOutlined, MenuOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatDate } from "../utils.js";
import NewSale from "./NewSale.jsx";
import PrintLabels from "./PrintLabels.jsx";
import Analytics from "./Analytics.jsx";
import StaffManagement from "./StaffManagement.jsx";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const ORDER_STATUSES = ["placed", "confirmed", "packing", "ready", "dispatched", "delivered", "cancelled"];
const STATUS_COLORS = {
  placed: "gold", confirmed: "blue", packing: "purple", ready: "cyan",
  dispatched: "geekblue", delivered: "green", cancelled: "red",
};

const NAV_ITEMS = [
  { key: "home", icon: <HomeOutlined />, label: "Home" },
  { key: "newsale", icon: <ShoppingCartOutlined />, label: "New Sale" },
  { key: "overview", icon: <InboxOutlined />, label: "Orders" },
  { key: "inventory", icon: <InboxOutlined />, label: "Inventory" },
  { key: "add", icon: <PlusCircleOutlined />, label: "Add Product" },
  { key: "import", icon: <UploadOutlined />, label: "Bulk Import" },
  { key: "customers", icon: <TeamOutlined />, label: "Customers" },
  { key: "labels", icon: <TagsOutlined />, label: "Print Labels" },
  { key: "analytics", icon: <BarChartOutlined />, label: "Analytics" },
  { key: "staff", icon: <UserOutlined />, label: "Staff" },
];

const PAGE_TITLES = {
  home: ["Home", "Quick overview of your shop"],
  newsale: ["New Sale", "Billing counter — search or scan a product to add it"],
  overview: ["Orders", "Track and update order status"],
  inventory: ["Inventory", "Manage your catalog and prices"],
  add: ["Add Product", "Add a single item to your catalog"],
  import: ["Bulk Import", "Upload an Excel/CSV rate list"],
  customers: ["Customers", "Everyone who signed up to your shop"],
  labels: ["Print Labels", "Generate scannable barcode stickers"],
  analytics: ["Analytics", "Sales performance over time"],
  staff: ["Staff", "Manage POS-only staff accounts"],
};

export default function ShopDashboard() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState("home");
  const [collapsed, setCollapsed] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [search, setSearch] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderDateRange, setOrderDateRange] = useState(null);
  const [addForm] = Form.useForm();

  const businessId = user?.business_id;
  const signupLink = businessId ? `${window.location.origin}/signup?shop=${businessId}` : "";

  const loadProducts = () => {
    if (!businessId) return;
    api.get(`/products?business_id=${businessId}`).then((res) => setProducts(res.data));
  };
  const loadOrders = () => api.get("/orders").then((res) => setOrders(res.data));
  const loadCustomers = () => {
    if (!businessId) return;
    api.get(`/businesses/${businessId}/customers`).then((res) => setCustomers(res.data));
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
    loadCustomers();
  }, [businessId]);

  if (!businessId) return <NoBusinessYet onCreated={refreshUser} approvalStatus={user?.approval_status} />;

  const addProduct = async (values) => {
    try {
      await api.post(`/products?business_id=${businessId}`, {
        ...values,
        price: parseFloat(values.price),
      });
      addForm.resetFields();
      message.success("Product added");
      loadProducts();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not add product");
    }
  };

  const savePrice = async (productId) => {
    const price = parseFloat(editing[productId]);
    if (isNaN(price)) return;
    await api.put(`/products/${productId}`, { price });
    setEditing((prev) => ({ ...prev, [productId]: undefined }));
    message.success("Price updated");
    loadProducts();
  };

  const deleteProduct = async (productId) => {
    await api.delete(`/products/${productId}`);
    message.success("Product removed");
    loadProducts();
  };

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    setImportResult(null);
    setImporting(true);
    try {
      const { data } = await api.post(
        `/products/import?business_id=${businessId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setImportResult(data);
      loadProducts();
      message.success(`Imported: ${data.created} created, ${data.updated} updated`);
    } catch (err) {
      message.error(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
    return false; // prevent antd Upload's default upload behavior
  };

  const updateStatus = async (orderId, status) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    loadOrders();
  };

  const removeCustomer = async (customerId) => {
    await api.delete(`/businesses/${businessId}/customers/${customerId}`);
    message.success("Customer removed");
    loadCustomers();
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.includes(q)) ||
      o.id.toLowerCase().includes(q);
    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
    const orderDay = o.created_at.slice(0, 10);
    const matchesRange =
      !orderDateRange ||
      (orderDay >= orderDateRange[0].format("YYYY-MM-DD") && orderDay <= orderDateRange[1].format("YYYY-MM-DD"));
    return matchesSearch && matchesStatus && matchesRange;
  });

  const [pageTitle, pageSubtitle] = PAGE_TITLES[tab] || ["", ""];

  const selectTab = (key) => setTab(key);

  const inventoryColumns = [
    {
      title: "Product", dataIndex: "name", key: "name",
      render: (name, p) => (
        <Space>
          <img src={p.image_url || "https://placehold.co/40x40/CCCCCC/666666?text=?"} alt={name}
            style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{p.category || "Uncategorized"} · {p.unit_type}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Price", dataIndex: "price", key: "price", width: 240,
      render: (price, p) => (
        <Space>
          <Input
            style={{ width: 90 }}
            prefix="₹"
            type="number"
            value={editing[p.id] ?? price}
            onChange={(e) => setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))}
          />
          <Button size="small" onClick={() => savePrice(p.id)}>Save</Button>
          <Popconfirm title="Remove this product?" onConfirm={() => deleteProduct(p.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const customerColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Phone", dataIndex: "phone", key: "phone", render: (p) => <a href={`tel:${p}`}>{p}</a> },
    { title: "Orders", dataIndex: "order_count", key: "order_count", width: 100 },
    {
      title: "", key: "actions", width: 100,
      render: (_, c) => (
        <Popconfirm title={`Remove ${c.name}?`} onConfirm={() => removeCustomer(c.id)}>
          <Button size="small" danger>Remove</Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Layout style={{ background: "transparent", minHeight: "calc(100vh - 64px)" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={80}
        trigger={null}
        style={{ background: "#fff", borderRadius: 12, marginRight: 16, overflow: "hidden" }}
        width={220}
      >
        <div style={{ padding: 12, textAlign: collapsed ? "center" : "left" }}>
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ marginBottom: 8 }}
          />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[tab]}
          onClick={({ key }) => selectTab(key)}
          items={NAV_ITEMS}
          style={{ border: "none" }}
        />
      </Sider>

      <Content>
        <Title level={3} style={{ marginBottom: 0 }}>{pageTitle}</Title>
        <Text type="secondary">{pageSubtitle}</Text>

        <div style={{ marginTop: 20 }}>
          {tab === "home" && (
            <>
              <Row gutter={16}>
                <Col xs={12} md={6}><Card><Statistic title="Products" value={products.length} /></Card></Col>
                <Col xs={12} md={6}><Card><Statistic title="Active Orders" value={activeOrders.length} /></Card></Col>
                <Col xs={12} md={6}><Card><Statistic title="Total Orders" value={orders.length} /></Card></Col>
                <Col xs={12} md={6}><Card><Statistic title="Revenue (Delivered)" value={totalRevenue} prefix="₹" /></Card></Col>
              </Row>

              <Card title="Your customer signup link" style={{ marginTop: 16 }}>
                <Text type="secondary">
                  Share this with your customers via WhatsApp or let them scan the QR code
                  so they can sign up directly to your shop — they'll never see other shops on the platform.
                </Text>
                <Space wrap style={{ marginTop: 12, width: "100%" }}>
                  <Input readOnly value={signupLink} style={{ width: 320 }} onFocus={(e) => e.target.select()} />
                  <Button icon={<CopyOutlined />} onClick={() => {
                    navigator.clipboard.writeText(signupLink);
                    message.success("Copied!");
                  }}>Copy</Button>
                  <Button
                    icon={<WhatsAppOutlined />}
                    href={`https://wa.me/?text=${encodeURIComponent(`Join our shop on ShopCart to place orders directly: ${signupLink}`)}`}
                    target="_blank"
                  >
                    Share on WhatsApp
                  </Button>
                  <Button icon={<QrcodeOutlined />} onClick={() => setShowQr((v) => !v)}>
                    {showQr ? "Hide QR" : "Show QR Code"}
                  </Button>
                </Space>
                {showQr && (
                  <div style={{ marginTop: 16, textAlign: "center" }}>
                    <div style={{ display: "inline-block", background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #f0f0f0" }}>
                      <QRCodeSVG value={signupLink} size={180} />
                    </div>
                  </div>
                )}
              </Card>

              {activeOrders.length > 0 && (
                <Card title="Recent Active Orders" style={{ marginTop: 16 }}>
                  {activeOrders.slice(0, 5).map((o) => (
                    <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                      <span>#{o.id.slice(0, 8)} — ₹{o.total_amount}</span>
                      <Tag color={STATUS_COLORS[o.status]}>{o.status}</Tag>
                    </div>
                  ))}
                  <Button type="link" onClick={() => selectTab("overview")} style={{ marginTop: 8, padding: 0 }}>
                    View All Orders →
                  </Button>
                </Card>
              )}
            </>
          )}

          {tab === "newsale" && <NewSale products={products} businessId={businessId} />}
          {tab === "labels" && <PrintLabels products={products} businessId={businessId} onRefresh={loadProducts} />}
          {tab === "analytics" && <Analytics businessId={businessId} />}
          {tab === "staff" && <StaffManagement />}

          {tab === "overview" && (
            <>
              <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                  <Input
                    placeholder="Search by customer name, phone, or order ID..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    style={{ width: 280 }}
                  />
                  <Select
                    value={orderStatusFilter}
                    onChange={setOrderStatusFilter}
                    style={{ width: 160 }}
                    options={[{ value: "all", label: "All statuses" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s }))]}
                  />
                  <DatePicker.RangePicker value={orderDateRange} onChange={setOrderDateRange} />
                  {(orderSearch || orderStatusFilter !== "all" || orderDateRange) && (
                    <Button onClick={() => { setOrderSearch(""); setOrderStatusFilter("all"); setOrderDateRange(null); }}>
                      Clear
                    </Button>
                  )}
                </Space>
              </Card>

              {filteredOrders.length === 0 && <Empty description="No orders match your filters" />}
              {filteredOrders.map((o) => (
                <Card key={o.id} size="small" style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <Text strong>#{o.id.slice(0, 8)} — ₹{o.total_amount}</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>{formatDate(o.created_at)}</Text></div>
                      {o.customer_name && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {o.customer_name}
                            {o.customer_phone && <> · <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></>}
                          </Text>
                        </div>
                      )}
                    </div>
                    <Select
                      value={o.status}
                      onChange={(val) => updateStatus(o.id, val)}
                      style={{ width: 140 }}
                      options={ORDER_STATUSES.map((s) => ({ value: s, label: <Tag color={STATUS_COLORS[s]}>{s}</Tag> }))}
                    />
                  </div>
                  <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                    {o.items.map((it) => (
                      <li key={it.id}>{it.product_name_snapshot} — {it.quantity} {it.unit_type_snapshot}</li>
                    ))}
                  </ul>
                  <Link to={`/invoice/${o.id}`}><Button size="small">View Bill</Button></Link>
                </Card>
              ))}
            </>
          )}

          {tab === "inventory" && (
            <>
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 12, maxWidth: 320 }}
              />
              <Table
                dataSource={filteredProducts}
                columns={inventoryColumns}
                rowKey="id"
                pagination={{ pageSize: 15 }}
              />
            </>
          )}

          {tab === "add" && (
            <Card style={{ maxWidth: 480 }}>
              <Form form={addForm} layout="vertical" onFinish={addProduct}>
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Basmati Rice" />
                </Form.Item>
                <Form.Item name="unit_type" label="Unit" rules={[{ required: true }]} initialValue="kg">
                  <Input placeholder="kg, piece, litre..." />
                </Form.Item>
                <Form.Item name="price" label="Price" rules={[{ required: true }]}>
                  <Input type="number" step="0.01" prefix="₹" />
                </Form.Item>
                <Form.Item name="category" label="Category (optional)">
                  <Input />
                </Form.Item>
                <Form.Item name="image_url" label="Image URL (optional)">
                  <Input />
                </Form.Item>
                <Button type="primary" htmlType="submit">Add Product</Button>
              </Form>
            </Card>
          )}

          {tab === "import" && (
            <Card style={{ maxWidth: 480 }}>
              <Text type="secondary">
                Upload a spreadsheet with columns like Name, Category, Unit, Price, Image_URL.
                Existing items are matched by name+unit and updated automatically.
              </Text>
              <div style={{ marginTop: 16 }}>
                <Upload beforeUpload={handleImport} showUploadList={false} accept=".csv,.xlsx,.xls">
                  <Button icon={<UploadOutlined />} loading={importing}>Upload CSV/Excel</Button>
                </Upload>
              </div>
              {importResult && (
                <div style={{ marginTop: 12 }}>
                  <Tag color="green">Created: {importResult.created}</Tag>
                  <Tag color="blue">Updated: {importResult.updated}</Tag>
                  {importResult.errors?.length > 0 && <Tag color="red">Errors: {importResult.errors.length}</Tag>}
                </div>
              )}
            </Card>
          )}

          {tab === "customers" && (
            <Table
              dataSource={customers}
              columns={customerColumns}
              rowKey="id"
              pagination={{ pageSize: 15 }}
              locale={{ emptyText: <Empty description="No customers yet. Share your signup link to invite them." /> }}
            />
          )}
        </div>
      </Content>
    </Layout>
  );
}

function NoBusinessYet({ onCreated, approvalStatus }) {
  const [form] = Form.useForm();
  const [error, setError] = useState("");

  const createBusiness = async (values) => {
    setError("");
    try {
      await api.post("/businesses", values);
      await onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create business");
    }
  };

  if (approvalStatus === "pending") {
    return (
      <Card style={{ maxWidth: 480, margin: "40px auto" }}>
        <Title level={4}>⏳ Pending Approval</Title>
        <Text type="secondary">
          Thanks for registering with Cartbi! Your shop registration is currently
          under review. You'll be able to set up your business as soon as Cartbi approves your account.
        </Text>
      </Card>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <Card style={{ maxWidth: 480, margin: "40px auto" }}>
        <Title level={4}>Registration Not Approved</Title>
        <Text type="secondary">
          Your shop registration was not approved. Please contact Cartbi support if you believe this is a mistake.
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 480, margin: "40px auto" }} title="Create your business first">
      {error && <Text type="danger">{error}</Text>}
      <Form form={form} layout="vertical" onFinish={createBusiness} initialValues={{ type: "provision" }}>
        <Form.Item name="name" label="Business name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Type">
          <Select options={[
            { value: "provision", label: "Provision Store" },
            { value: "pharmacy", label: "Pharmacy" },
            { value: "laundry", label: "Laundry" },
            { value: "other", label: "Other" },
          ]} />
        </Form.Item>
        <Button type="primary" htmlType="submit">Create Business</Button>
      </Form>
    </Card>
  );
}
