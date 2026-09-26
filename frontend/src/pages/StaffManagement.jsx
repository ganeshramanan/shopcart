import { useEffect, useState } from "react";
import api from "../api";

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", password: "" });
  const [error, setError] = useState("");

  const load = () => {
    api.get("/staff").then((res) => setStaff(res.data)).catch((e) => setError(e.response?.data?.detail || "Failed to load"));
  };

  useEffect(() => { load(); }, []);

  const addStaff = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("/staff", form);
      setForm({ name: "", phone: "", password: "" });
      load();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not add staff member");
    }
  };

  const toggleActive = async (id) => {
    await api.patch(`/staff/${id}/toggle-active`);
    load();
  };

  const removeStaff = async (id, name) => {
    if (!window.confirm(`Remove ${name}? They will no longer be able to log in.`)) return;
    await api.delete(`/staff/${id}`);
    load();
  };

  return (
    <div>
      <div className="card" style={{ maxWidth: 480, marginBottom: 20 }}>
        <h3>Add Staff (Sales/POS access only)</h3>
        <p className="dashboard-subtitle">
          Staff accounts can only use the "New Sale" billing screen — they
          cannot see customer details, pricing controls, analytics, or other
          shop data. No approval needed from Cartbi, this is fully controlled by you.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={addStaff}>
          <input placeholder="Staff name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Phone number" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d]/g, "") })} required />
          <input type="password" placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <button type="submit">Add Staff</button>
        </form>
      </div>

      <h3>Your Staff</h3>
      {staff.length === 0 && <p className="empty-state">No staff added yet.</p>}
      {staff.map((s) => (
        <div key={s.id} className="card row">
          <div>
            <strong>{s.name}</strong>
            {!s.is_active && <span className="badge" style={{ background: "#fee2e2", color: "#dc2626", marginLeft: 8 }}>Disabled</span>}
            <div className="inventory-meta">{s.phone}</div>
          </div>
          <div className="row" style={{ gap: 8, width: "auto" }}>
            <button className={s.is_active ? "secondary" : ""} onClick={() => toggleActive(s.id)}>
              {s.is_active ? "Disable" : "Enable"}
            </button>
            <button className="secondary" onClick={() => removeStaff(s.id, s.name)}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}
