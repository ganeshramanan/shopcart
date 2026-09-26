import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import BarcodeScanner from "../components/BarcodeScanner.jsx";

export default function NewSale({ products, businessId }) {
  const [cart, setCart] = useState({}); // product_id -> quantity
  const [search, setSearch] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState("");
  const navigate = useNavigate();

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

  const visibleProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const cartLines = Object.entries(cart)
    .map(([productId, qty]) => {
      const product = products.find((p) => p.id === productId);
      if (!product) return null;
      return { product, qty, lineTotal: product.price * qty };
    })
    .filter(Boolean);

  const total = cartLines.reduce((sum, l) => sum + l.lineTotal, 0);

  const handleScan = (barcode) => {
    const product = products.find((p) => p.barcode === barcode);
    if (product) {
      setQty(product.id, (cart[product.id] || 0) + step(product.unit_type));
      setScanMessage(`✓ Added: ${product.name}`);
    } else {
      setScanMessage(`⚠ No product found for barcode ${barcode}`);
    }
    setTimeout(() => setScanMessage(""), 2500);
  };

  const generateBill = async () => {
    if (cartLines.length === 0) {
      setError("Add at least one item before generating a bill.");
      return;
    }
    setError("");
    setPlacing(true);
    try {
      const items = cartLines.map((l) => ({ product_id: l.product.id, quantity: l.qty }));
      const { data } = await api.post("/orders/walk-in", {
        items,
        customer_name: customerName || "Walk-in Customer",
        customer_phone: customerPhone || null,
      });
      navigate(`/invoice/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate bill");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div>
      {error && <div className="error">{error}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <strong>Walk-in Customer Details (optional)</strong>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <input placeholder="Customer name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
          <input placeholder="Phone (optional)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value.replace(/[^\d]/g, ""))} />
        </div>
      </div>

      <input
        className="catalog-search"
        placeholder="Search products to add..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <button onClick={() => setScannerOpen(true)}>📷 Scan Barcode</button>
        {scanMessage && <span style={{ fontSize: 13, fontWeight: 600 }}>{scanMessage}</span>}
      </div>

      {scannerOpen && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <div className="catalog-layout">
        <div className="product-grid">
          {visibleProducts.length === 0 && (
            <p className="empty-state" style={{ gridColumn: "1 / -1" }}>No products match your search.</p>
          )}
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
          <h3>Bill Summary</h3>
          {cartLines.length === 0 ? (
            <p className="cart-empty">No items added yet.</p>
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
                <span>{cartLines.length} item(s)</span>
                <strong>₹{total.toFixed(2)}</strong>
              </div>
              <button className="place-order-btn" onClick={generateBill} disabled={placing}>
                {placing ? "Generating..." : "Generate Bill"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
