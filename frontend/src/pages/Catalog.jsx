import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Input, Row, Col, Card, Button, Badge, Empty, Typography, Affix, Alert, Image, Modal, message } from "antd";
import { PlusOutlined, MinusOutlined, SearchOutlined, ShoppingCartOutlined, WhatsAppOutlined, CheckCircleFilled, HeartOutlined, HeartFilled } from "@ant-design/icons";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { normalizeIndianPhone } from "../utils.js";
import ShopBanner from "../components/ShopBanner.jsx";

const { Title, Text } = Typography;

// Light-touch emoji lookup so category chips feel tappable/friendly instead
// of plain text pills — falls back to a generic tag for anything unmapped.
const CATEGORY_EMOJI = {
  all: "🛒",
  vegetables: "🥦", fruits: "🍎", dairy: "🥛", grains: "🌾", rice: "🍚",
  pulses: "🫘", spices: "🌶️", snacks: "🍪", beverages: "🥤", bakery: "🍞",
  household: "🧴", personal: "🧼", medicines: "💊", laundry: "🧺",
};
const emojiFor = (category) => CATEGORY_EMOJI[category?.toLowerCase()] || "🏷️";

export default function Catalog() {
  const { businessId } = useParams();
  const [products, setProducts] = useState([]);
  const [business, setBusiness] = useState(null);
  const [cart, setCart] = useState({});
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [placedOrder, setPlacedOrder] = useState(null); // shows the post-order modal when set
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    api.get(`/products?business_id=${businessId}`).then((res) => setProducts(res.data));
    api.get(`/businesses/${businessId}`).then((res) => setBusiness(res.data)).catch(() => {});
  }, [businessId]);

  // Load the customer's favorited product IDs (only when logged in as a
  // customer) so the heart icon on each card can show filled/outline state.
  useEffect(() => {
    if (user?.role !== "customer") return;
    api.get("/favorites").then((res) => {
      setFavoriteIds(new Set(res.data.map((f) => f.product_id)));
    }).catch(() => {});
  }, [user]);

  const toggleFavorite = async (productId) => {
    if (!user) return navigate("/login");
    const isFav = favoriteIds.has(productId);
    try {
      if (isFav) {
        await api.delete(`/favorites/${productId}`);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } else {
        await api.post("/favorites", { product_id: productId });
        setFavoriteIds((prev) => new Set(prev).add(productId));
      }
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not update favorite");
    }
  };

  // "Order Again" support — MyOrders.jsx navigates here with
  // location.state.reorderItems. Once products have loaded, pre-fill the
  // cart with whichever of those items are still active; anything
  // discontinued/removed is silently skipped (no broken cart state).
  useEffect(() => {
    const reorderItems = location.state?.reorderItems;
    if (!reorderItems || products.length === 0) return;

    const next = {};
    let skipped = 0;
    reorderItems.forEach(({ product_id, quantity }) => {
      const stillActive = products.find((p) => p.id === product_id && p.is_active !== false);
      if (stillActive) next[product_id] = quantity;
      else skipped += 1;
    });

    setCart(next);
    if (Object.keys(next).length > 0) {
      message.success(
        skipped > 0
          ? `Added ${Object.keys(next).length} item(s) from your last order — ${skipped} item(s) no longer available.`
          : "Added items from your last order to the cart."
      );
    } else {
      message.info("None of the items from that order are available anymore.");
    }
    // Clear the state so refreshing the page doesn't re-apply it
    navigate(location.pathname, { replace: true, state: {} });
  }, [products]);

  const step = (unit) => (unit === "kg" || unit === "litre" || unit === "g" || unit === "ml" ? 0.5 : 1);

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
    const matchesFavorites = !favoritesOnly || favoriteIds.has(p.id);
    return matchesCategory && matchesSearch && matchesFavorites;
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
  const minOrderValue = business?.min_order_value || 0;
  const belowMinimum = minOrderValue > 0 && itemCount > 0 && total < minOrderValue;
  const amountShortOfMinimum = belowMinimum ? Math.round((minOrderValue - total) * 100) / 100 : 0;

  const placeOrder = async () => {
    if (!user) return navigate("/login");
    if (belowMinimum) return; // guarded by disabled button too, but double-check
    setError("");
    setPlacing(true);
    try {
      const items = cartLines.map((l) => ({ product_id: l.product.id, quantity: l.qty }));
      const { data } = await api.post("/orders", { business_id: businessId, items });
      setCart({});
      setPlacedOrder(data);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not place order");
    } finally {
      setPlacing(false);
    }
  };

  const notifyShopOnWhatsApp = () => {
    if (!placedOrder) return;
    const lines = placedOrder.items.map(
      (it) => `${it.product_name_snapshot} — ${it.quantity} ${it.unit_type_snapshot}`
    );
    const text = [
      `New order on ShopCart!`,
      `Order #${placedOrder.id.slice(0, 8)} from ${user?.name || "a customer"}`,
      "",
      ...lines,
      "",
      `Total: ₹${placedOrder.total_amount}`,
    ].join("\n");
    const encoded = encodeURIComponent(text);
    const target = business?.contact_phone
      ? `https://wa.me/${normalizeIndianPhone(business.contact_phone)}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(target, "_blank");
  };

  return (
    <div>
      {business ? <ShopBanner business={business} /> : <Title level={3}>Catalog</Title>}

      {business && (
        <div className="catalog-tagline">
          <Text>🛍️ Fresh picks, fair prices — order now, we'll have it ready for you.</Text>
          {minOrderValue > 0 && (
            <Text style={{ display: "block", marginTop: 4, fontSize: 12 }}>
              Minimum order value: <b>₹{minOrderValue}</b>
            </Text>
          )}
        </div>
      )}

      {error && <Alert type="error" message={error} showIcon style={{ margin: "12px 0" }} />}

      <Modal
        open={!!placedOrder}
        onCancel={() => { setPlacedOrder(null); navigate("/orders"); }}
        footer={null}
        centered
      >
        {placedOrder && (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <CheckCircleFilled style={{ fontSize: 48, color: "#16a34a" }} />
            <Title level={4} style={{ marginTop: 12 }}>Order Placed!</Title>
            <Text type="secondary">Order #{placedOrder.id.slice(0, 8)} · ₹{placedOrder.total_amount}</Text>

            <div style={{ marginTop: 20 }}>
              <Button type="primary" icon={<WhatsAppOutlined />} block onClick={notifyShopOnWhatsApp}>
                Notify Shop on WhatsApp
              </Button>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
                Let the shop know right away so they can start preparing your order.
              </Text>
            </div>

            <Button
              type="link"
              style={{ marginTop: 12 }}
              onClick={() => { setPlacedOrder(null); navigate("/orders"); }}
            >
              View My Orders →
            </Button>
          </div>
        )}
      </Modal>

      <Input
        className="catalog-search-input"
        prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
        placeholder="Search for atta, rice, milk..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        size="large"
        style={{ maxWidth: 440, margin: "20px 0 14px" }}
        allowClear
      />

      {(categories.length > 1 || user?.role === "customer") && (
        <div className="catalog-chip-row">
          {categories.length > 1 && categories.map((c) => (
            <button
              key={c}
              className={`catalog-chip ${c === activeCategory ? "catalog-chip-active" : ""}`}
              onClick={() => setActiveCategory(c)}
            >
              <span className="catalog-chip-emoji">{emojiFor(c === "All" ? "all" : c)}</span> {c}
            </button>
          ))}
          {user?.role === "customer" && (
            <button
              className={`catalog-chip catalog-chip-fav ${favoritesOnly ? "catalog-chip-fav-active" : ""}`}
              onClick={() => setFavoritesOnly((v) => !v)}
            >
              {favoritesOnly ? <HeartFilled /> : <HeartOutlined />} Favorites
            </button>
          )}
        </div>
      )}

      <Row gutter={16}>
        <Col xs={24} lg={17}>
          {visibleProducts.length === 0 ? (
            <div className="catalog-empty-state">
              {favoritesOnly ? (
                <>
                  <div style={{ fontSize: 40 }}>🤍</div>
                  <Title level={5} style={{ marginTop: 8 }}>No favorites in this category yet</Title>
                  <Text type="secondary">Tap the heart on any product to save it here.</Text>
                  <div style={{ marginTop: 12 }}>
                    <Button onClick={() => setFavoritesOnly(false)}>Show All Products</Button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 40 }}>🔍</div>
                  <Title level={5} style={{ marginTop: 8 }}>No products match your search</Title>
                  <Text type="secondary">Try a different keyword or browse another category.</Text>
                </>
              )}
            </div>
          ) : (
            <Row gutter={[14, 14]}>
              {visibleProducts.map((p) => (
                <Col key={p.id} xs={12} sm={8} md={6}>
                  <Card
                    className="catalog-product-card"
                    size="small"
                    cover={
                      <div style={{ position: "relative" }}>
                        <Image
                          src={p.image_url || "https://placehold.co/300x300/CCCCCC/666666?text=No+Image"}
                          alt={p.name}
                          height={150}
                          style={{ objectFit: "cover" }}
                          preview={false}
                        />
                        <button
                          className="catalog-fav-btn"
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                          aria-label="Toggle favorite"
                        >
                          {favoriteIds.has(p.id) ? (
                            <HeartFilled style={{ color: "#ef4444" }} />
                          ) : (
                            <HeartOutlined style={{ color: "#6b7280" }} />
                          )}
                        </button>
                      </div>
                    }
                  >
                    <Text strong className="catalog-product-name">{p.name}</Text>
                    <div className="catalog-price-pill">₹{p.price} <span>/ {p.unit_type}</span></div>
                    <div style={{ marginTop: 10 }}>
                      {(cart[p.id] || 0) > 0 ? (
                        <div className="catalog-qty-stepper">
                          <Button size="small" type="text" style={{ color: "#fff" }} icon={<MinusOutlined />} onClick={() => setQty(p.id, (cart[p.id] || 0) - step(p.unit_type))} />
                          <Text style={{ color: "#fff", fontWeight: 700 }}>{cart[p.id]}</Text>
                          <Button size="small" type="text" style={{ color: "#fff" }} icon={<PlusOutlined />} onClick={() => setQty(p.id, (cart[p.id] || 0) + step(p.unit_type))} />
                        </div>
                      ) : (
                        <Button className="catalog-add-btn" size="small" block onClick={() => setQty(p.id, step(p.unit_type))}>+ Add</Button>
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
            <Card className="catalog-cart-card" title="🛒 Your Cart">
              {itemCount === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 32 }}>🧺</div>
                  <Text type="secondary" style={{ display: "block", marginTop: 8 }}>
                    No items added yet. Tap "+ Add" on a product to start.
                  </Text>
                </div>
              ) : (
                <>
                  <div className="catalog-cart-items-scroll">
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
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #f0f0f0", paddingTop: 10, marginBottom: 10 }}>
                    <Text>{itemCount} item(s)</Text>
                    <Text strong className="catalog-price" style={{ fontSize: 16 }}>₹{total.toFixed(2)}</Text>
                  </div>
                  {belowMinimum && (
                    <Text type="warning" style={{ display: "block", fontSize: 12, marginBottom: 8 }}>
                      Add ₹{amountShortOfMinimum} more to reach the ₹{minOrderValue} minimum order value.
                    </Text>
                  )}
                  <Button className="catalog-add-btn" block loading={placing} disabled={belowMinimum} onClick={placeOrder}>
                    {belowMinimum ? `Add ₹${amountShortOfMinimum} More` : "Place Order"}
                  </Button>
                </>
              )}
            </Card>
          </Affix>
        </Col>
      </Row>

      {itemCount > 0 && (
        <Affix offsetBottom={0} className="mobile-only-affix">
          <div style={{ background: "#111827", padding: "12px 16px", borderRadius: "12px 12px 0 0" }}>
            {belowMinimum && (
              <Text type="warning" style={{ display: "block", fontSize: 11, marginBottom: 6 }}>
                Add ₹{amountShortOfMinimum} more to reach the ₹{minOrderValue} minimum
              </Text>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: "#fff" }}>
                <Badge count={itemCount} style={{ marginRight: 8, backgroundColor: "#16a34a" }} /> ₹{total.toFixed(2)}
              </Text>
              <Button className="catalog-add-btn" loading={placing} disabled={belowMinimum} onClick={placeOrder} icon={<ShoppingCartOutlined />}>
                {belowMinimum ? `Add ₹${amountShortOfMinimum} More` : "Place Order"}
              </Button>
            </div>
          </div>
        </Affix>
      )}
    </div>
  );
}
