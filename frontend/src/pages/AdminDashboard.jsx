import { useEffect, useState } from "react";
import api from "../api";

export default function AdminDashboard() {
  const [owners, setOwners] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Cartbi — Platform Admin";
    return () => { document.title = "ShopCart — Order Simple, Bill Right"; };
  }, []);

  const load = () => {
    api.get("/admin/shop-owners").then((res) => setOwners(res.data)).catch((e) => setError(e.response?.data?.detail || "Failed to load"));
    api.get("/admin/businesses").then((res) => setBusinesses(res.data)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (ownerId) => {
    await api.patch(`/admin/shop-owners/${ownerId}/toggle-active`);
    load();
  };

  const approve = async (ownerId) => {
    await api.patch(`/admin/shop-owners/${ownerId}/approve`);
    load();
  };

  const reject = async (ownerId) => {
    if (!window.confirm("Reject this shop owner's registration? They will not be able to create a business.")) return;
    await api.patch(`/admin/shop-owners/${ownerId}/reject`);
    load();
  };

  const deleteBusiness = async (businessId, name) => {
    if (!window.confirm(`Delete "${name}"? This permanently removes all its products and orders. This cannot be undone.`)) return;
    await api.delete(`/businesses/${businessId}`);
    load();
  };

  const deleteOwner = async (ownerId, name) => {
    if (!window.confirm(`Permanently delete ${name}'s account? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/shop-owners/${ownerId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.detail || "Could not delete this shop owner");
    }
  };

  const pendingOwners = owners.filter((o) => o.approval_status === "pending");
  const decidedOwners = owners.filter((o) => o.approval_status !== "pending");

  return (
    <div>
      <div className="dashboard-header">
        <h2>Cartbi Platform Overview</h2>
        <p className="dashboard-subtitle">Manage every shop and shop owner running on ShopCart</p>
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
          <div className="stat-value">{pendingOwners.length}</div>
          <div className="stat-label">Pending Approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{owners.filter((o) => !o.is_active).length}</div>
          <div className="stat-label">Disabled</div>
        </div>
      </div>

      {pendingOwners.length > 0 && (
        <>
          <h3>Pending Requests</h3>
          {pendingOwners.map((o) => (
            <div key={o.id} className="card row">
              <div>
                <strong>{o.name}</strong>
                <span className="badge" style={{ background: "#fef3c7", color: "#b45309", marginLeft: 8 }}>Pending</span>
                <div className="inventory-meta">{o.phone} · Registered {new Date(o.created_at).toLocaleDateString()}</div>
              </div>
              <div className="row" style={{ gap: 8, width: "auto" }}>
                <button onClick={() => approve(o.id)}>Approve</button>
                <button className="secondary" onClick={() => reject(o.id)}>Reject</button>
              </div>
            </div>
          ))}
        </>
      )}

      <h3 style={{ marginTop: 28 }}>Shop Owners</h3>
      {decidedOwners.length === 0 && <p className="empty-state">No approved/rejected shop owners yet.</p>}
      {decidedOwners.map((o) => (
        <div key={o.id} className="card row">
          <div>
            <strong>{o.name}</strong>
            {!o.is_active && <span className="badge" style={{ background: "#fee2e2", color: "#dc2626", marginLeft: 8 }}>Disabled</span>}
            {o.approval_status === "rejected" && <span className="badge" style={{ background: "#fee2e2", color: "#dc2626", marginLeft: 8 }}>Rejected</span>}
            <div className="inventory-meta">
              {o.phone} · {o.business_name ? `${o.business_name} (${o.business_type})` : "No business yet"}
            </div>
          </div>
          <div className="row" style={{ gap: 8, width: "auto" }}>
            {o.approval_status === "approved" && (
              <button className={o.is_active ? "secondary" : ""} onClick={() => toggleActive(o.id)}>
                {o.is_active ? "Disable" : "Enable"}
              </button>
            )}
            {!o.business_id && (
              <button className="secondary" onClick={() => deleteOwner(o.id, o.name)}>Delete</button>
            )}
          </div>
        </div>
      ))}

      <h3 style={{ marginTop: 28 }}>All Businesses</h3>
      {businesses.map((b) => (
        <div key={b.id} className="card row">
          <div>
            <strong>{b.name}</strong>
            <div className="inventory-meta">{b.type} · {b.product_count} products · {b.order_count} orders</div>
          </div>
          <button className="secondary" onClick={() => deleteBusiness(b.id, b.name)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
