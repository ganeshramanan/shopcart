import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Catalog() {
  const { businessId } = useParams();
  const [products, setProducts] = useState([]);
  const [business, setBusiness] = useState(null);
  const [cart, setCart] = useState({}); // product_id -> quantity
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
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
  const visibleProducts =
    activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);

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
      <h2>{business ? business.name : "Catalog"}</h2>
      {business?.type && <p className="dashboard-subtitle" style={{ marginTop: -8, marginBottom: 12 }}>{business.type}</p>}
      {error && <div className="error">{error}</div>}

      {categories.length > 1 && (
        <div className="category-scroll">
          {categories.map((c) => (
            <button
              key={c}
              className={c === activeCategory ? "chip active" : "chip"}
              onClick={() => setActiveCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="catalog-layout">
        <div className="product-grid">
          {visibleProducts.map((p) => (
            <div key={p.id} className="product-card">
              <img
                src={p.image_url || "https://placehold.co/300x300/CCCCCC/666666?text=No+Image"}
                alt={p.name}
                className="product-image"
              />
              <div className="product-info">
                <strong className="product-name">{p.name}</strong>
                <div className="product-price">₹{p.price} / {p.unit_type}</div>
                {(cart[p.id] || 0) > 0 ? (
                  <div className="qty-control full-width">
                    <button onClick={() => setQty(p.id, (cart[p.id] || 0) - step(p.unit_type))}>-</button>
                    <span>{cart[p.id]}</span>
                    <button onClick={() => setQty(p.id, (cart[p.id] || 0) + step(p.unit_type))}>+</button>
                  </div>
                ) : (
                  <button className="add-btn" onClick={() => setQty(p.id, step(p.unit_type))}>
                    + Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="cart-panel">
          <h3>Your Cart</h3>
          {itemCount === 0 ? (
            <p className="cart-empty">No items added yet. Tap "+ Add" on a product to start.</p>
          ) : (
            <>
              <div className="cart-lines">
                {cartLines.map(({ product, qty, lineTotal }) => (
                  <div key={product.id} className="cart-line">
                    <img
                      src={product.image_url || "https://placehold.co/60x60/CCCCCC/666666?text=?"}
                      alt={product.name}
                      className="cart-line-image"
                    />
                    <div className="cart-line-info">
                      <div className="cart-line-name">{product.name}</div>
                      <div className="qty-control">
                        <button onClick={() => setQty(product.id, qty - step(product.unit_type))}>-</button>
                        <span>{qty} {product.unit_type}</span>
                        <button onClick={() => setQty(product.id, qty + step(product.unit_type))}>+</button>
                      </div>
                    </div>
                    <div className="cart-line-total">₹{lineTotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>
              <div className="cart-summary-row">
                <span>{itemCount} item(s)</span>
                <strong>₹{total.toFixed(2)}</strong>
              </div>
              <button className="place-order-btn" onClick={placeOrder} disabled={placing}>
                {placing ? "Placing..." : "Place Order"}
              </button>
            </>
          )}
        </div>
      </div>

      {itemCount > 0 && (
        <div className="total-bar mobile-only">
          <span>{itemCount} item(s) · ₹{total.toFixed(2)}</span>
          <button onClick={placeOrder} disabled={placing}>
            {placing ? "Placing..." : "Place Order"}
          </button>
        </div>
      )}
    </div>
  );
}
