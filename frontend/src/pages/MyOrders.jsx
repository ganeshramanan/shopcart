import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Tag, Typography, Empty, Button, Space, Input, Select, DatePicker } from "antd";
import { ReloadOutlined, RedoOutlined, DownOutlined, UpOutlined } from "@ant-design/icons";
import api from "../api";
import { formatDate } from "../utils.js";

const { Title, Text } = Typography;
const ORDER_STATUSES = ["placed", "confirmed", "packing", "ready", "dispatched", "delivered", "cancelled"];
const STATUS_COLORS = {
  placed: "gold", confirmed: "blue", packing: "purple", ready: "cyan",
  dispatched: "geekblue", delivered: "green", cancelled: "red",
};

// Items collapsed by default behind a "N items — view" toggle, same
// pattern as StaffPOS's order cards — a big order (10+ items) shouldn't
// dominate the card. Kept the per-line price breakdown customers care
// about (qty × price = line total) once expanded.
function OrderCard({ order: o, onReorder }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card style={{ marginBottom: 12, marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <Text strong>Order #{o.id.slice(0, 8)}</Text>
          <div><Text type="secondary" style={{ fontSize: 12 }}>{formatDate(o.created_at)}</Text></div>
        </div>
        <Tag color={STATUS_COLORS[o.status]}>{o.status}</Tag>
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
        <div className="myorders-items-list">
          {o.items.map((it) => (
            <div key={it.id} className="myorders-item-row">
              <span className="myorders-item-name">{it.product_name_snapshot} — {it.quantity} {it.unit_type_snapshot}</span>
              <span className="myorders-item-total">× ₹{it.unit_price_snapshot} = ₹{it.line_total}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
        <Text strong>Total: ₹{o.total_amount}</Text>
        <Space>
          <Button size="small" icon={<RedoOutlined />} onClick={() => onReorder(o)}>Order Again</Button>
          <Link to={`/invoice/${o.id}`}><Button size="small">View Bill</Button></Link>
        </Space>
      </div>
    </Card>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateRange, setDateRange] = useState(null);
  const navigate = useNavigate();

  const load = () => {
    setRefreshing(true);
    api.get("/orders").then((res) => setOrders(res.data)).finally(() => setRefreshing(false));
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // auto-refresh every 30s so status updates show up without a manual reload
    return () => clearInterval(interval);
  }, []);

  // "Order Again" — jump to that shop's catalog with the same items
  // pre-filled in the cart. Catalog.jsx picks this up via router state and
  // re-validates each product still exists/is active before adding it, so
  // a discontinued item just gets silently skipped rather than breaking.
  const reorder = (order) => {
    navigate(`/shop/${order.business_id}`, {
      state: {
        reorderItems: order.items.map((it) => ({ product_id: it.product_id, quantity: it.quantity })),
      },
    });
  };

  const filteredOrders = orders.filter((o) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      o.items.some((it) => it.product_name_snapshot.toLowerCase().includes(q));
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const orderDay = o.created_at.slice(0, 10);
    const matchesRange =
      !dateRange ||
      (orderDay >= dateRange[0].format("YYYY-MM-DD") && orderDay <= dateRange[1].format("YYYY-MM-DD"));
    return matchesSearch && matchesStatus && matchesRange;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0 }}>My Orders</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={refreshing}>Refresh</Button>
      </div>

      <Space wrap style={{ marginTop: 16, marginBottom: 4 }}>
        <Input
          placeholder="Search by order ID or item name..."
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
      </Space>

      {filteredOrders.length === 0 && (
        <Empty description={orders.length === 0 ? "No orders yet" : "No orders match your filters"} style={{ marginTop: 40 }} />
      )}
      {filteredOrders.map((o) => (
        <OrderCard key={o.id} order={o} onReorder={reorder} />
      ))}
    </div>
  );
}
