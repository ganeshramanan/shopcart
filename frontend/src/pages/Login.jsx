import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6,15}$/.test(phone)) {
      setError("Please enter a valid phone number (digits only, no name or spaces).");
      return;
    }
    try {
      const user = await login(phone, password);
      if (user.role === "customer" && user.business_id) {
        navigate(`/shop/${user.business_id}`);
      } else {
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed");
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
      <h2>Login</h2>
      <p style={{ color: "#6b7280", fontSize: 13, marginTop: -8 }}>
        Log in with the <strong>phone number</strong> you signed up with — not your name.
      </p>
      {error && <div className="error">{error}</div>}
      <form onSubmit={submit}>
        <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Phone Number</label>
        <input
          placeholder="e.g. 9876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          maxLength={15}
          required
        />
        <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Password</label>
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Login</button>
      </form>
      <p>No account? <Link to="/signup">Sign up</Link></p>
    </div>
  );
}
