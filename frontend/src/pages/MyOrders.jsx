import { useEffect, useState } from "react";
import api from "../api";

export default function MyOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get("/orders").then((res) => setOrders(res.data));
  }, []);

  return (
    <div>
      <h2>My Orders</h2>
      {orders.length === 0 && <p>No orders yet.</p>}
      {orders.map((o) => (
        <div key={o.id} className="card">
          <div className="row">
            <strong>Order #{o.id.slice(0, 8)}</strong>
            <span className="badge">{o.status}</span>
          </div>
          <ul>
            {o.items.map((it) => (
              <li key={it.id}>
                {it.product_name_snapshot} — {it.quantity} {it.unit_type_snapshot} × ₹{it.unit_price_snapshot} = ₹{it.line_total}
              </li>
            ))}
          </ul>
          <strong>Total: ₹{o.total_amount}</strong>
        </div>
      ))}
    </div>
  );
}
