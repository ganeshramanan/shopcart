import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Signup() {
  const [searchParams] = useSearchParams();
  const shopId = searchParams.get("shop");
  const [form, setForm] = useState({ name: "", phone: "", password: "", role: shopId ? "customer" : "shop_owner" });
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = { ...form, business_id: shopId || null };
      const user = await signup(payload);
      if (user.role === "customer" && user.business_id) {
        navigate(`/shop/${user.business_id}`);
      } else if (user.role === "shop_owner") {
        navigate("/dashboard");
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Signup failed");
    }
  };

  // Customer signup requires a shop-specific link (e.g. shared via WhatsApp/QR
  // by the shop owner) — we never show a "pick your shop" dropdown to customers.
  if (!shopId) {
    return (
      <div className="card" style={{ maxWidth: 460, margin: "0 auto" }}>
        <h2>Sign up</h2>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          To sign up as a <strong>customer</strong>, please use the signup link
          shared by your shop (via WhatsApp or a QR code at the counter).
        </p>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          If you're a <strong>shop owner</strong> setting up your store, you can
          create your account below.
        </p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={submit}>
          <input placeholder="Name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input placeholder="Phone number" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
          <input type="password" placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          <input value="Shop Owner" disabled style={{ background: "#f3f4f6" }} />
          <button type="submit">Create Shop Owner Account</button>
        </form>
        <p>Already have an account? <Link to="/login">Login</Link></p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Sign up</h2>
      <p style={{ color: "#6b7280", fontSize: 13 }}>You're signing up as a customer of this shop.</p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <input placeholder="Name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="Phone number" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        <input type="password" placeholder="Password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        <button type="submit">Create account</button>
      </form>
      <p>Already have an account? <Link to="/login">Login</Link></p>
    </div>
  );
}
