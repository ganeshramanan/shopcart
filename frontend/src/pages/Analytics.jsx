import { useEffect, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar,
} from "recharts";
import api from "../api";

export default function Analytics({ businessId }) {
  const [data, setData] = useState(null);
  const [days, setDays] = useState(30);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!businessId) return;
    api.get(`/businesses/${businessId}/analytics?days=${days}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load analytics"));
  }, [businessId, days]);

  if (error) return <div className="error">{error}</div>;
  if (!data) return <p>Loading analytics...</p>;

  const formatShortDate = (isoDay) => {
    const d = new Date(isoDay);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  return (
    <div>
      <div className="row" style={{ marginBottom: 16 }}>
        <p className="dashboard-subtitle" style={{ margin: 0 }}>
          Sales performance over the last {days} days
        </p>
        <select style={{ width: "auto" }} value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-value">₹{data.total_revenue.toFixed(0)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.total_orders}</div>
          <div className="stat-label">Orders</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₹{data.avg_order_value.toFixed(0)}</div>
          <div className="stat-label">Avg Order Value</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{data.unique_customers}</div>
          <div className="stat-label">Customers ({data.new_customers} new)</div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Revenue Trend</h3>
        {data.daily_trend.length === 0 ? (
          <p className="empty-state">No orders in this period yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.daily_trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="date" tickFormatter={formatShortDate} fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip labelFormatter={formatShortDate} formatter={(v) => [`₹${v}`, "Revenue"]} />
              <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Top Products (by revenue)</h3>
        {data.top_products.length === 0 ? (
          <p className="empty-state">No sales data yet.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(200, data.top_products.length * 36)}>
              <BarChart data={data.top_products} layout="vertical" margin={{ left: 20 }}>
                <XAxis type="number" fontSize={12} />
                <YAxis type="category" dataKey="name" width={140} fontSize={12} />
                <Tooltip formatter={(v) => [`₹${v}`, "Revenue"]} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </div>
  );
}
