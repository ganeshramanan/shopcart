import { useEffect, useState } from "react";
import api from "../api";

export default function AdminDashboard() {
  const [owners, setOwners] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState("");

  const load = () => {
    api.get("/admin/shop-owners").then((res) => setOwners(res.data)).catch((e) => setError(e.response?.data?.detail || "Failed to load"));
    api.get("/admin/businesses").then((res) => setBusinesses(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (ownerId) => {
    await api.patch(`/admin/shop-owners/${ownerId}/toggle-active`);
    load();
  };

  return (
    <div>
      <div className="dashboard-header">
        <h2>Super Admin</h2>
        <p className="dashboard-subtitle">Platform-wide view of every shop and its owner</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">{businesses.length}</div>
          <div className="stat-label">Businesses</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{owners.length}</div>
          <div className="stat-label">Shop Owners</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{owners.filter((o) => o.is_active).length}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{owners.filter((o) => !o.is_active).length}</div>
          <div className="stat-label">Disabled</div>
        </div>
      </div>

      <h3>Shop Owners</h3>
      {owners.length === 0 && <p className="empty-state">No shop owners yet.</p>}
      {owners.map((o) => (
        <div key={o.id} className="card row">
          <div>
            <strong>{o.name}</strong>
            {!o.is_active && <span className="badge" style={{ background: "#fee2e2", color: "#dc2626", marginLeft: 8 }}>Disabled</span>}
            <div className="inventory-meta">
              {o.phone} · {o.business_name ? `${o.business_name} (${o.business_type})` : "No business yet"}
            </div>
          </div>
          <button
            className={o.is_active ? "secondary" : ""}
            onClick={() => toggleActive(o.id)}
          >
            {o.is_active ? "Disable" : "Enable"}
          </button>
        </div>
      ))}

      <h3 style={{ marginTop: 28 }}>All Businesses</h3>
      {businesses.map((b) => (
        <div key={b.id} className="card row">
          <div>
            <strong>{b.name}</strong>
            <div className="inventory-meta">{b.type}</div>
          </div>
          <div className="inventory-meta">{b.product_count} products · {b.order_count} orders</div>
        </div>
      ))}
    </div>
  );
}
