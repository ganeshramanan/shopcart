import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";
import api from "../api";

export default function Signup() {
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: "customer", business_id: "" });
  const [businesses, setBusinesses] = useState([]);
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (form.role === "customer") {
      api.get("/businesses").then((res) => setBusinesses(res.data));
    }
  }, [form.role]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...form, business_id: form.business_id || null };
      const user = await signup(payload);
      if (user.role === "customer" && user.business_id) {
        navigate(`/shop/${user.business_id}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed");
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Sign up</h2>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <input placeholder="Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Phone number" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        <input type="password" placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, business_id: "" })}>
          <option value="customer">Customer</option>
          <option value="shop_owner">Shop Owner</option>
        </select>

        {form.role === "customer" && (
          <>
            <select
              value={form.business_id}
              onChange={(e) => setForm({ ...form, business_id: e.target.value })}
              required
            >
              <option value="">Select your shop...</option>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
              ))}
            </select>
            {businesses.length === 0 && (
              <p style={{ fontSize: 13, color: "#6b7280" }}>
                No shops available yet — ask your shop owner to sign up first.
              </p>
            )}
          </>
        )}

        <button type="submit">Create account</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
