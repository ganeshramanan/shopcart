import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";

const ORDER_STATUSES = ["placed", "confirmed", "packing", "ready", "dispatched", "delivered", "cancelled"];

export default function ShopDashboard() {
  const { user, refreshUser } = useAuth();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [newProduct, setNewProduct] = useState({ name: "", unit_type: "kg", price: "" });
  const [editing, setEditing] = useState({}); // productId -> price being edited
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");

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

  if (!businessId) {
    return <NoBusinessYet onCreated={refreshUser} />;
  }

  const addProduct = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/products?business_id=${businessId}`, {
        ...newProduct,
        price: parseFloat(newProduct.price),
      });
      setNewProduct({ name: "", unit_type: "kg", price: "" });
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
    }
  };

  const updateStatus = async (orderId, status) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    loadOrders();
  };

  return (
    <div>
      <h2>Shop Dashboard</h2>
      {error && <div className="error">{error}</div>}

      <div className="card">
        <h3>Bulk Import (Excel/CSV rate list)</h3>
        <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} />
        {importResult && (
          <p>
            Created: {importResult.created}, Updated: {importResult.updated}
            {importResult.errors?.length > 0 && `, Errors: ${importResult.errors.length}`}
          </p>
        )}
      </div>

      <div className="card">
        <h3>Add Product</h3>
        <form onSubmit={addProduct}>
          <input placeholder="Name" value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} required />
          <input placeholder="Unit (kg, piece, litre...)" value={newProduct.unit_type}
            onChange={(e) => setNewProduct({ ...newProduct, unit_type: e.target.value })} required />
          <input type="number" step="0.01" placeholder="Price" value={newProduct.price}
            onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })} required />
          <button type="submit">Add</button>
        </form>
      </div>

      <h3>Catalog</h3>
      {products.map((p) => (
        <div key={p.id} className="card row">
          <div>
            <strong>{p.name}</strong> ({p.unit_type})
          </div>
          <div className="qty-control">
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

      <h3>Orders</h3>
      {orders.map((o) => (
        <div key={o.id} className="card">
          <div className="row">
            <strong>#{o.id.slice(0, 8)} — ₹{o.total_amount}</strong>
            <select value={o.status} onChange={(e) => updateStatus(o.id, e.target.value)}>
              {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <ul>
            {o.items.map((it) => (
              <li key={it.id}>{it.product_name_snapshot} — {it.quantity} {it.unit_type_snapshot}</li>
            ))}
          </ul>
        </div>
      ))}
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
    <div className="card">
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
