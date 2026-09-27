import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Tag, Typography, Empty, Button, Space } from "antd";
import { ReloadOutlined, RedoOutlined } from "@ant-design/icons";
import api from "../api";
import { formatDate } from "../utils.js";

const { Title, Text } = Typography;
const STATUS_COLORS = {
  placed: "gold", confirmed: "blue", packing: "purple", ready: "cyan",
  dispatched: "geekblue", delivered: "green", cancelled: "red",
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Title level={3} style={{ margin: 0 }}>My Orders</Title>
        <Button icon={<ReloadOutlined />} onClick={load} loading={refreshing}>Refresh</Button>
      </div>
      {orders.length === 0 && <Empty description="No orders yet" style={{ marginTop: 40 }} />}
      {orders.map((o) => (
        <Card key={o.id} style={{ marginBottom: 12, marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <Text strong>Order #{o.id.slice(0, 8)}</Text>
              <div><Text type="secondary" style={{ fontSize: 12 }}>{formatDate(o.created_at)}</Text></div>
            </div>
            <Tag color={STATUS_COLORS[o.status]}>{o.status}</Tag>
          </div>
          <ul style={{ margin: "12px 0", paddingLeft: 18 }}>
            {o.items.map((it) => (
              <li key={it.id}>
                {it.product_name_snapshot} — {it.quantity} {it.unit_type_snapshot} × ₹{it.unit_price_snapshot} = ₹{it.line_total}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Text strong>Total: ₹{o.total_amount}</Text>
            <Space>
              <Button size="small" icon={<RedoOutlined />} onClick={() => reorder(o)}>Order Again</Button>
              <Link to={`/invoice/${o.id}`}><Button size="small">View Bill</Button></Link>
            </Space>
          </div>
        </Card>
      ))}
    </div>
  );
}
