import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatDate } from "../utils.js";
import NewSale from "./NewSale.jsx";

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
  const [linkCopied, setLinkCopied] = useState(false);
  const [customers, setCustomers] = useState([]);

  const businessId = user?.business_id;
  const signupLink = businessId ? `${window.location.origin}/signup?shop=${businessId}` : "";

  const loadProducts = () => {
    if (!businessId) return;
    api.get(`/products?business_id=${businessId}`).then((res) => setProducts(res.data));
  };
  const loadOrders = () => api.get("/orders").then((res) => setOrders(res.data));
  const loadCustomers = () => {
    if (!businessId) return;
    api.get(`/businesses/${businessId}/customers`).then((res) => setCustomers(res.data));
  };

  useEffect(() => {
    loadProducts();
    loadOrders();
    loadCustomers();
  }, [businessId]);

  if (!businessId) return <NoBusinessYet onCreated={refreshUser} approvalStatus={user?.approval_status} />;

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

  const removeCustomer = async (customerId, name) => {
    if (!window.confirm(`Remove ${name} from your shop? They will need a new signup link to order again. Their past orders are kept.`)) {
      return;
    }
    await api.delete(`/businesses/${businessId}/customers/${customerId}`);
    loadCustomers();
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

      <div className="card" style={{ marginBottom: 20 }}>
        <strong>Your customer signup link</strong>
        <p className="dashboard-subtitle">
          Share this with your customers (WhatsApp, or print as a QR code) so they can
          sign up directly to your shop — they'll never see other shops on the platform.
        </p>
        <div className="row" style={{ gap: 8 }}>
          <input readOnly value={signupLink} onFocus={(e) => e.target.select()} />
          <button
            className="secondary"
            onClick={() => {
              navigator.clipboard.writeText(signupLink);
              setLinkCopied(true);
              setTimeout(() => setLinkCopied(false), 1500);
            }}
          >
            {linkCopied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button className={tab === "newsale" ? "tab active" : "tab"} onClick={() => setTab("newsale")}>
          🧾 New Sale
        </button>
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
        <button className={tab === "customers" ? "tab active" : "tab"} onClick={() => setTab("customers")}>
          Customers {customers.length > 0 && <span className="tab-badge" style={{ background: "#6b7280" }}>{customers.length}</span>}
        </button>
      </div>

      {tab === "newsale" && <NewSale products={products} businessId={businessId} />}

      {tab === "overview" && (
        <div>
          {orders.length === 0 && <p className="empty-state">No orders yet.</p>}
          {orders.map((o) => (
            <div key={o.id} className="card order-card">
              <div className="row">
                <div>
                  <strong>#{o.id.slice(0, 8)} — ₹{o.total_amount}</strong>
                  <div className="order-timestamp">{formatDate(o.created_at)}</div>
                  {o.customer_name && (
                    <div className="order-customer">
                      {o.customer_name}
                      {o.customer_phone && (
                        <> · <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></>
                      )}
                    </div>
                  )}
                </div>
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
              <Link to={`/invoice/${o.id}`}><button className="secondary" style={{ marginTop: 8 }}>View Bill</button></Link>
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

      {tab === "customers" && (
        <div>
          {customers.length === 0 && <p className="empty-state">No customers yet. Share your signup link to invite them.</p>}
          {customers.map((c) => (
            <div key={c.id} className="card row">
              <div>
                <strong>{c.name}</strong>
                <div className="inventory-meta">
                  <a href={`tel:${c.phone}`}>{c.phone}</a> · {c.order_count} order{c.order_count !== 1 ? "s" : ""}
                </div>
              </div>
              <button className="secondary" onClick={() => removeCustomer(c.id, c.name)}>
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NoBusinessYet({ onCreated, approvalStatus }) {
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

  if (approvalStatus === "pending") {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h3>⏳ Pending Approval</h3>
        <p className="dashboard-subtitle">
          Thanks for registering with Cartbi! Your shop registration is currently
          under review. You'll be able to set up your business as soon as
          Cartbi approves your account.
        </p>
      </div>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <div className="card" style={{ maxWidth: 480 }}>
        <h3>Registration Not Approved</h3>
        <p className="dashboard-subtitle">
          Your shop registration was not approved. Please contact Cartbi support
          if you believe this is a mistake.
        </p>
      </div>
    );
  }

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
