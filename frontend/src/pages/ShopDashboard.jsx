import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";

const ORDER_STATUSES = ["placed", "confirmed", "packing", "ready", "dispatched", "delivered", "cancelled"];
const STATUS_COLORS = {
  placed: "#f59e0b", confirmed: "#3b82f6", packing: "#8b5cf6", ready: "#06b6d4",
  dispatched: "#6366f1", delivered: "#10b981", cancelled: "#ef4444",
};

export default function ShopDashboard() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState("overview");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: "", unit_type: "kg", price: "", category: "", image_url: "" });
  const [editing, setEditing] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const businessId = user?.business_id;

  const loadProducts = () => {
    if (!businessId) return;
    api.get(`/products?business_id=${businessId}`).then((res) => setProducts(res.data));
  };
  const loadOrders = () => api.get("/orders").then((res) => setOrders(res.data));

  useEffect(() => {
    loadProducts();
    loadOrders();
  }, [businessId]);

  if (!businessId) return <NoBusinessYet onCreated={refreshUser} />;

  const addProduct = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/products?business_id=${businessId}`, {
        ...newProduct,
        price: parseFloat(newProduct.price),
      });
      setNewProduct({ name: "", unit_type: "kg", price: "", category: "", image_url: "" });
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add product");
    }
  };

  const savePrice = async (productId) => {
    const price = parseFloat(editing[productId]);
    if (isNaN(price)) return;
    await api.put(`/products/${productId}`, { price });
    setEditing((prev) => ({ ...prev, [productId]: undefined }));
    loadProducts();
  };

  const deleteProduct = async (productId) => {
    await api.delete(`/products/${productId}`);
    loadProducts();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    setImportResult(null);
    setImporting(true);
    try {
      const { data } = await api.post(
        `/products/import?business_id=${businessId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setImportResult(data);
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const updateStatus = async (orderId, status) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    loadOrders();
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total_amount, 0);

  return (
    <div>
      <div className="dashboard-header">
        <div>
          <h2>Shop Dashboard</h2>
          <p className="dashboard-subtitle">Manage your catalog, prices, and incoming orders</p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeOrders.length}</div>
          <div className="stat-label">Active Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{orders.length}</div>
          <div className="stat-label">Total Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₹{totalRevenue.toFixed(0)}</div>
          <div className="stat-label">Revenue (Delivered)</div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button className={tab === "overview" ? "tab active" : "tab"} onClick={() => setTab("overview")}>
          Orders {activeOrders.length > 0 && <span className="tab-badge">{activeOrders.length}</span>}
        </button>
        <button className={tab === "inventory" ? "tab active" : "tab"} onClick={() => setTab("inventory")}>
          Inventory
        </button>
        <button className={tab === "add" ? "tab active" : "tab"} onClick={() => setTab("add")}>
          Add Product
        </button>
        <button className={tab === "import" ? "tab active" : "tab"} onClick={() => setTab("import")}>
          Bulk Import
        </button>
      </div>

      {tab === "overview" && (
        <div>
          {orders.length === 0 && <p className="empty-state">No orders yet.</p>}
          {orders.map((o) => (
            <div key={o.id} className="card order-card">
              <div className="row">
                <strong>#{o.id.slice(0, 8)} — ₹{o.total_amount}</strong>
                <select
                  value={o.status}
                  onChange={(e) => updateStatus(o.id, e.target.value)}
                  style={{
                    width: "auto",
                    borderColor: STATUS_COLORS[o.status],
                    color: STATUS_COLORS[o.status],
                    fontWeight: 600,
                  }}
                >
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <ul className="order-items-list">
                {o.items.map((it) => (
                  <li key={it.id}>{it.product_name_snapshot} — {it.quantity} {it.unit_type_snapshot}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {tab === "inventory" && (
        <div>
          <input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />
          {filteredProducts.length === 0 && <p className="empty-state">No products found.</p>}
          {filteredProducts.map((p) => (
            <div key={p.id} className="card row inventory-row">
              <div className="row" style={{ gap: 10, flex: 1 }}>
                <img
                  src={p.image_url || "https://placehold.co/60x60/CCCCCC/666666?text=?"}
                  alt={p.name}
                  className="inventory-thumb"
                />
                <div>
                  <strong>{p.name}</strong>
                  <div className="inventory-meta">{p.category || "Uncategorized"} · {p.unit_type}</div>
                </div>
              </div>
              <div className="qty-control">
                <span>₹</span>
                <input
                  style={{ width: 80 }}
                  type="number"
                  step="0.01"
                  value={editing[p.id] ?? p.price}
                  onChange={(e) => setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
                <button onClick={() => savePrice(p.id)}>Save</button>
                <button className="secondary" onClick={() => deleteProduct(p.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "add" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3>Add Product</h3>
          <form onSubmit={addProduct}>
            <input placeholder="Name" value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
            <input placeholder="Unit (kg, piece, litre...)" value={newProduct.unit_type}
              onChange={(e) => setNewProduct({ ...newProduct, unit_type: e.target.value })} required />
            <input type="number" step="0.01" placeholder="Price" value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} required />
            <input placeholder="Category (optional)" value={newProduct.category}
              onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} />
            <input placeholder="Image URL (optional)" value={newProduct.image_url}
              onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} />
            <button type="submit">Add Product</button>
          </form>
        </div>
      )}

      {tab === "import" && (
        <div className="card" style={{ maxWidth: 480 }}>
          <h3>Bulk Import (Excel/CSV rate list)</h3>
          <p className="dashboard-subtitle">
            Upload a spreadsheet with columns like Name, Category, Unit, Price, Image_URL.
            Existing items are matched by name+unit and updated automatically.
          </p>
          <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} disabled={importing} />
          {importing && <p>Importing…</p>}
          {importResult && (
            <p>
              Created: {importResult.created}, Updated: {importResult.updated}
              {importResult.errors?.length > 0 && `, Errors: ${importResult.errors.length}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NoBusinessYet({ onCreated }) {
  const [form, setForm] = useState({ name: "", type: "provision" });
  const [error, setError] = useState("");

  const createBusiness = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/businesses", form);
      await onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create business");
    }
  };

  return (
    <div className="card" style={{ maxWidth: 480 }}>
      <h3>Create your business first</h3>
      {error && <div className="error">{error}</div>}
      <form onSubmit={createBusiness}>
        <input placeholder="Business name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="provision">Provision Store</option>
          <option value="pharmacy">Pharmacy</option>
          <option value="laundry">Laundry</option>
          <option value="other">Other</option>
        </select>
        <button type="submit">Create Business</button>
      </form>
    </div>
  );
}
