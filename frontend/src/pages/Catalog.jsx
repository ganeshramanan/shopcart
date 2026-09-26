import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Catalog() {
  const { businessId } = useParams();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({}); // product_id -> quantity
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/products?business_id=${businessId}`).then((res) => setProducts(res.data));
  }, [businessId]);

  const setQty = (productId, qty) => {
    setCart((prev) => ({ ...prev, [productId]: Math.max(0, Math.round(qty * 100) / 100) }));
  };

  const categories = ["All", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const visibleProducts =
    activeCategory === "All" ? products : products.filter((p) => p.category === activeCategory);

  const total = products.reduce((sum, p) => sum + (cart[p.id] || 0) * p.price, 0);
  const itemCount = Object.values(cart).filter((q) => q > 0).length;

  const placeOrder = async () => {
    if (!user) return navigate("/login");
    setError("");
    setPlacing(true);
    try {
      const items = Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([product_id, quantity]) => ({ product_id, quantity }));
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
      <h2>Catalog</h2>
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
                  <button onClick={() => setQty(p.id, (cart[p.id] || 0) - (p.unit_type === "kg" || p.unit_type === "litre" ? 0.5 : 1))}>-</button>
                  <span>{cart[p.id]}</span>
                  <button onClick={() => setQty(p.id, (cart[p.id] || 0) + (p.unit_type === "kg" || p.unit_type === "litre" ? 0.5 : 1))}>+</button>
                </div>
              ) : (
                <button
                  className="add-btn"
                  onClick={() => setQty(p.id, p.unit_type === "kg" || p.unit_type === "litre" ? 0.5 : 1)}
                >
                  + Add
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {itemCount > 0 && (
        <div className="total-bar">
          <span>{itemCount} item(s) · ₹{total.toFixed(2)}</span>
          <button onClick={placeOrder} disabled={placing}>
            {placing ? "Placing..." : "Place Order"}
          </button>
        </div>
      )}
    </div>
  );
}
