import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    api.get("/businesses").then((res) => setBusinesses(res.data));
  }, []);

  return (
    <div>
      <h2>Shops</h2>
      {businesses.length === 0 && <p>No shops yet. Ask a shop owner to sign up and create one.</p>}
      {businesses.map((b) => (
        <Link key={b.id} to={`/shop/${b.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div className="card row">
            <div>
              <strong>{b.name}</strong>
              <div><span className="badge">{b.type}</span></div>
            </div>
            <span>→</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
