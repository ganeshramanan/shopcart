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
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/products?business_id=${businessId}`).then((res) => setProducts(res.data));
  }, [businessId]);

  const setQty = (productId, qty) => {
    setCart((prev) => ({ ...prev, [productId]: Math.max(0, qty) }));
  };

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
      {products.map((p) => (
        <div key={p.id} className="card row">
          <div>
            <strong>{p.name}</strong>
            <div>₹{p.price} / {p.unit_type}</div>
          </div>
          <div className="qty-control">
            <button onClick={() => setQty(p.id, (cart[p.id] || 0) - 0.5)}>-</button>
            <span>{cart[p.id] || 0}</span>
            <button onClick={() => setQty(p.id, (cart[p.id] || 0) + 0.5)}>+</button>
          </div>
        </div>
      ))}
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
