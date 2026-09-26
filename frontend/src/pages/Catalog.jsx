import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Input, Row, Col, Card, Button, Badge, Empty, Typography, Affix, Alert, Image } from "antd";
import { PlusOutlined, MinusOutlined, SearchOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";

const { Title, Text } = Typography;

export default function Catalog() {
  const { businessId } = useParams();
  const [products, setProducts] = useState([]);
  const [business, setBusiness] = useState(null);
  const [cart, setCart] = useState({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/products?business_id=${businessId}`).then((res) => setProducts(res.data));
    api.get(`/businesses/${businessId}`).then((res) => setBusiness(res.data)).catch(() => {});
  }, [businessId]);

  const step = (unit) => (unit === "kg" || unit === "litre" ? 0.5 : 1);

  const setQty = (productId, qty) => {
    setCart((prev) => {
      const rounded = Math.max(0, Math.round(qty * 100) / 100);
      if (rounded === 0) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: rounded };
    });
  };

  const categories = ["All", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const visibleProducts = products.filter((p) => {
    const matchesCategory = activeCategory === "All" || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartLines = Object.entries(cart)
    .map(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return null;
      return { product, qty, lineTotal: product.price * qty };
    })
    .filter(Boolean);

  const total = cartLines.reduce((sum, l) => sum + l.lineTotal, 0);
  const itemCount = cartLines.length;

  const placeOrder = async () => {
    if (!user) return navigate("/login");
    setError("");
    setPlacing(true);
    try {
      const items = cartLines.map((l) => ({ product_id: l.product.id, quantity: l.qty }));
      await api.post("/orders", { business_id: businessId, items });
      setCart({});
      navigate("/orders");
    } catch (err) {
      setError(err.response?.data?.detail || "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      <Title level={3} style={{ marginBottom: 0 }}>{business ? business.name : "Catalog"}</Title>
      {business?.type && <Text type="secondary">{business.type}</Text>}
      {error && <Alert type="error" message={error} showIcon style={{ margin: "12px 0" }} />}

      <Input
        prefix={<SearchOutlined />}
        placeholder="Search products..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 400, margin: "16px 0 12px" }}
        allowClear
      />

      {categories.length > 1 && (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12 }}>
          {categories.map((c) => (
            <Button
              key={c}
              type={c === activeCategory ? "primary" : "default"}
              shape="round"
              size="small"
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>
      )}

      <Row gutter={16}>
        <Col xs={24} lg={17}>
          {visibleProducts.length === 0 ? (
            <Empty description="No products match your search" style={{ marginTop: 40 }} />
          ) : (
            <Row gutter={[12, 12]}>
              {visibleProducts.map((p) => (
                <Col key={p.id} xs={12} sm={8} md={6}>
                  <Card
                    size="small"
                    cover={
                      <Image
                        src={p.image_url || "https://placehold.co/300x300/CCCCCC/666666?text=No+Image"}
                        alt={p.name}
                        height={120}
                        style={{ objectFit: "cover" }}
                        preview={false}
                      />
                    }
                  >
                    <Text strong style={{ fontSize: 13, display: "block", minHeight: 34 }}>{p.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>₹{p.price} / {p.unit_type}</Text>
                    <div style={{ marginTop: 8 }}>
                      {(cart[p.id] || 0) > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#2563eb", borderRadius: 8, padding: "2px 4px" }}>
                          <Button size="small" type="text" style={{ color: "#fff" }} icon={<MinusOutlined />} onClick={() => setQty(p.id, (cart[p.id] || 0) - step(p.unit_type))} />
                          <Text style={{ color: "#fff", fontWeight: 600 }}>{cart[p.id]}</Text>
                          <Button size="small" type="text" style={{ color: "#fff" }} icon={<PlusOutlined />} onClick={() => setQty(p.id, (cart[p.id] || 0) + step(p.unit_type))} />
                        </div>
                      ) : (
                        <Button size="small" block onClick={() => setQty(p.id, step(p.unit_type))}>+ Add</Button>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Col>

        <Col xs={0} lg={7}>
          <Affix offsetTop={16}>
            <Card title="Your Cart">
              {itemCount === 0 ? (
                <Text type="secondary">No items added yet. Tap "+ Add" on a product to start.</Text>
              ) : (
                <>
                  {cartLines.map(({ product, qty, lineTotal }) => (
                    <div key={product.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <img src={product.image_url || "https://placehold.co/60x60/CCCCCC/666666?text=?"} alt={product.name}
                        style={{ width: 40, height: 40, borderRadius: 8, objectFit: "cover" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13, display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.name}</Text>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <Button size="small" icon={<MinusOutlined />} onClick={() => setQty(product.id, qty - step(product.unit_type))} />
                          <Text style={{ fontSize: 12 }}>{qty} {product.unit_type}</Text>
                          <Button size="small" icon={<PlusOutlined />} onClick={() => setQty(product.id, qty + step(product.unit_type))} />
                        </div>
                      </div>
                      <Text strong style={{ fontSize: 13 }}>₹{lineTotal.toFixed(2)}</Text>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0f0", paddingTop: 10, marginBottom: 10 }}>
                    <Text>{itemCount} item(s)</Text>
                    <Text strong>₹{total.toFixed(2)}</Text>
                  </div>
                  <Button type="primary" block loading={placing} onClick={placeOrder}>Place Order</Button>
                </>
              )}
            </Card>
          </Affix>
        </Col>
      </Row>

      {itemCount > 0 && (
        <Affix offsetBottom={0} className="mobile-only-affix">
          <div style={{ background: "#111827", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "12px 12px 0 0" }}>
            <Text style={{ color: "#fff" }}>
              <Badge count={itemCount} style={{ marginRight: 8 }} /> ₹{total.toFixed(2)}
            </Text>
            <Button type="primary" loading={placing} onClick={placeOrder} icon={<ShoppingCartOutlined />}>
              Place Order
            </Button>
          </div>
        </Affix>
      )}
    </div>
  );
}
