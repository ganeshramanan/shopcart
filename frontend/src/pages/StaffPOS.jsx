import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Tabs, Card, Tag, Typography, Empty, Button, Input, Select, Space, DatePicker } from "antd";
import { ReloadOutlined, PhoneOutlined, EnvironmentOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatDate } from "../utils.js";
import NewSale from "./NewSale.jsx";
import SignupLinkCard from "../components/SignupLinkCard.jsx";
import ShopBanner from "../components/ShopBanner.jsx";

const { Text } = Typography;
const ORDER_STATUSES = ["placed", "confirmed", "packing", "ready", "dispatched", "delivered", "cancelled"];
const STATUS_COLORS = {
  placed: "gold", confirmed: "blue", packing: "purple", ready: "cyan",
  dispatched: "geekblue", delivered: "green", cancelled: "red",
};
// Hex equivalents of the Tag colors above, used for the card's left border
// accent so staff can glance-scan status without reading the tag text.
const STATUS_BORDER_COLORS = {
  placed: "#eab308", confirmed: "#2563eb", packing: "#a855f7", ready: "#06b6d4",
  dispatched: "#4338ca", delivered: "#16a34a", cancelled: "#dc2626",
};

function StaffOrderCard({ order: o }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      size="small"
      style={{ marginBottom: 12, borderLeft: `4px solid ${STATUS_BORDER_COLORS[o.status] || "#d9d9d9"}` }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <Text strong>#{o.id.slice(0, 8)} — ₹{o.total_amount}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{formatDate(o.created_at)}</Text></div>
          {o.customer_name && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {o.customer_name}
                {o.customer_phone && (
                  <> · <PhoneOutlined style={{ fontSize: 11 }} /> <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></>
                )}
              </Text>
            </div>
          )}
          {o.customer_address && (
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <EnvironmentOutlined style={{ fontSize: 11 }} /> {o.customer_address.label}: {o.customer_address.line1}
                {o.customer_address.line2 ? `, ${o.customer_address.line2}` : ""}
                {o.customer_address.city ? `, ${o.customer_address.city}` : ""}
                {o.customer_address.pincode ? ` - ${o.customer_address.pincode}` : ""}
              </Text>
            </div>
          )}
        </div>
        <Tag color={STATUS_COLORS[o.status]} style={{ fontWeight: 600 }}>{o.status}</Tag>
      </div>

      <Button
        type="link"
        size="small"
        style={{ padding: 0, marginTop: 10, fontSize: 13, fontWeight: 600 }}
        icon={expanded ? <UpOutlined /> : <DownOutlined />}
        onClick={() => setExpanded((v) => !v)}
      >
        {o.items.length} item{o.items.length !== 1 ? "s" : ""} {expanded ? "— hide" : "— view"}
      </Button>

      {expanded && (
        <div className="staff-order-items-list">
          {o.items.map((it) => (
            <div key={it.id} className="staff-order-item-row">
              <span className="staff-order-item-name">{it.product_name_snapshot}</span>
              <span className="staff-order-item-qty">{it.quantity} {it.unit_type_snapshot}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <Link to={`/invoice/${o.id}`}><Button size="small">View Bill</Button></Link>
      </div>
    </Card>
  );
}

function StaffOrders({ businessId }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);

  const load = () => {
    setRefreshing(true);
    api.get("/orders")
      .then((res) => setOrders(res.data))
      .catch((e) => setError(e.response?.data?.detail || "Could not load orders"))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // auto-refresh every 30s so staff see new orders without reloading the page
    return () => clearInterval(interval);
  }, [businessId]);

  if (error) return <Text type="danger">{error}</Text>;

  const filteredOrders = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.includes(q)) ||
      o.id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const orderDay = o.created_at.slice(0, 10);
    const matchesRange =
      !dateRange ||
      (orderDay >= dateRange[0].format("YYYY-MM-DD") && orderDay <= dateRange[1].format("YYYY-MM-DD"));
    return matchesSearch && matchesStatus && matchesRange;
  });

  return (
    <div>
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            placeholder="Search by customer name, phone, or order ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[{ value: "all", label: "All statuses" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s }))]}
          />
          <DatePicker.RangePicker value={dateRange} onChange={setDateRange} />
          {(search || statusFilter !== "all" || dateRange) && (
            <Button onClick={() => { setSearch(""); setStatusFilter("all"); setDateRange(null); }}>Clear</Button>
          )}
          <Button icon={<ReloadOutlined />} onClick={load} loading={refreshing}>Refresh</Button>
        </Space>
      </Card>

      {filteredOrders.length === 0 && <Empty description={orders.length === 0 ? "No orders yet" : "No orders match your filters"} />}
      {filteredOrders.map((o) => (
        <StaffOrderCard key={o.id} order={o} />
      ))}
    </div>
  );
}

function StaffSignupLink({ businessId }) {
  return <SignupLinkCard businessId={businessId} title="Customer Signup Link" />;
}

export default function StaffPOS() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [business, setBusiness] = useState(null);

  useEffect(() => {
    if (user?.business_id) {
      api.get(`/products?business_id=${user.business_id}`).then((res) => setProducts(res.data));
      api.get(`/businesses/${user.business_id}`).then((res) => setBusiness(res.data)).catch(() => {});
    }
  }, [user?.business_id]);

  const items = [
    {
      key: "newsale",
      label: "🧾 New Sale",
      children: <NewSale products={products} businessId={user?.business_id} />,
    },
  ];

  if (user?.can_view_orders) {
    items.push({ key: "orders", label: "Orders", children: <StaffOrders businessId={user?.business_id} /> });
  }
  if (user?.can_share_signup_link) {
    items.push({ key: "signup", label: "Signup Link", children: <StaffSignupLink businessId={user?.business_id} /> });
  }

  return (
    <div>
      {business && <ShopBanner business={business} compact />}
      <Tabs defaultActiveKey={searchParams.get("tab") || "newsale"} items={items} />
    </div>
  );
}
