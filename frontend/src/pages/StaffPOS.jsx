import { useEffect, useState } from "react";
import { Tabs, Card, Tag, Typography, Empty, Input, Space, Button, message } from "antd";
import { CopyOutlined, WhatsAppOutlined, QrcodeOutlined, ReloadOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatDate } from "../utils.js";
import NewSale from "./NewSale.jsx";

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
  const [showQr, setShowQr] = useState(false);
  const signupLink = `${window.location.origin}/signup?shop=${businessId}`;

  return (
    <Card>
      <Text type="secondary">
        Share this with customers so they can sign up directly to this shop.
      </Text>
      <Space wrap style={{ marginTop: 12 }}>
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
  );
}

export default function StaffPOS() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (user?.business_id) {
      api.get(`/products?business_id=${user.business_id}`).then((res) => setProducts(res.data));
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
      <Tabs defaultActiveKey="newsale" items={items} />
    </div>
  );
}
