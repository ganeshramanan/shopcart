import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, Card, Tag, Typography, Empty, Button } from "antd";
import { ReloadOutlined } from "@ant-design/icons";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatDate } from "../utils.js";
import NewSale from "./NewSale.jsx";
import SignupLinkCard from "../components/SignupLinkCard.jsx";
import ShopBanner from "../components/ShopBanner.jsx";

const { Text } = Typography;
const STATUS_COLORS = {
  placed: "gold", confirmed: "blue", packing: "purple", ready: "cyan",
  dispatched: "geekblue", delivered: "green", cancelled: "red",
};

function StaffOrders({ businessId }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <Button icon={<ReloadOutlined />} onClick={load} loading={refreshing}>Refresh</Button>
      </div>
      {orders.length === 0 && <Empty description="No orders yet" />}
      {orders.map((o) => (
        <Card key={o.id} size="small" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <Text strong>#{o.id.slice(0, 8)} — ₹{o.total_amount}</Text>
              <div><Text type="secondary" style={{ fontSize: 12 }}>{formatDate(o.created_at)}</Text></div>
              {o.customer_name && <Text type="secondary" style={{ fontSize: 12 }}>{o.customer_name}</Text>}
              {o.customer_address && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    📍 {o.customer_address.label}: {o.customer_address.line1}
                    {o.customer_address.line2 ? `, ${o.customer_address.line2}` : ""}
                    {o.customer_address.city ? `, ${o.customer_address.city}` : ""}
                    {o.customer_address.pincode ? ` - ${o.customer_address.pincode}` : ""}
                  </Text>
                </div>
              )}
            </div>
            <Tag color={STATUS_COLORS[o.status]}>{o.status}</Tag>
          </div>
          <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 18, fontSize: 13 }}>
            {o.items.map((it) => (
              <li key={it.id}>{it.product_name_snapshot} — {it.quantity} {it.unit_type_snapshot}</li>
            ))}
          </ul>
        </Card>
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
