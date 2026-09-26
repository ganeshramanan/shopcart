import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import api from "../api";
import { formatDate } from "../utils.js";

export default function Invoice() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then((res) => {
        setOrder(res.data);
        return api.get(`/businesses/${res.data.business_id}`);
      })
      .then((res) => setBusiness(res.data))
      .catch((err) => setError(err.response?.data?.detail || "Could not load invoice"));
  }, [orderId]);

  if (error) return <div className="error">{error}</div>;
  if (!order) return <p>Loading...</p>;

  const buildWhatsAppText = () => {
    const lines = order.items.map(
      (it) => `${it.product_name_snapshot} — ${it.quantity} ${it.unit_type_snapshot} × ₹${it.unit_price_snapshot} = ₹${it.line_total}`
    );
    const text = [
      `*${business?.name || "ShopCart"} — Bill*`,
      `Order #${order.id.slice(0, 8)} · ${formatDate(order.created_at)}`,
      "",
      ...lines,
      "",
      `*Total: ₹${order.total_amount}*`,
      "",
      `Status: ${order.status}`,
    ].join("\n");
    return encodeURIComponent(text);
  };

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${buildWhatsAppText()}`, "_blank");
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text(business?.name || "ShopCart", 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(business?.type || "", 14, y);
    doc.setTextColor(0);
    y += 10;

    doc.setFontSize(11);
    doc.text(`Order #${order.id.slice(0, 8)}`, 14, y);
    doc.text(formatDate(order.created_at), 140, y);
    y += 6;
    if (order.customer_name) {
      doc.text(`Customer: ${order.customer_name}${order.customer_phone ? " · " + order.customer_phone : ""}`, 14, y);
      y += 6;
    }
    doc.text(`Status: ${order.status}`, 14, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Item", 14, y);
    doc.text("Qty", 100, y);
    doc.text("Price", 130, y);
    doc.text("Total", 165, y);
    doc.setFont(undefined, "normal");
    y += 4;
    doc.line(14, y, 196, y);
    y += 6;

    order.items.forEach((it) => {
      doc.text(it.product_name_snapshot, 14, y);
      doc.text(`${it.quantity} ${it.unit_type_snapshot}`, 100, y);
      doc.text(`₹${it.unit_price_snapshot}`, 130, y);
      doc.text(`₹${it.line_total}`, 165, y);
      y += 7;
    });

    y += 4;
    doc.line(14, y, 196, y);
    y += 8;
    doc.setFontSize(13);
    doc.setFont(undefined, "bold");
    doc.text(`Total: ₹${order.total_amount}`, 140, y);

    doc.save(`invoice-${order.id.slice(0, 8)}.pdf`);
  };

  return (
    <div>
      <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <Link to="/orders"><button className="secondary">← Back</button></Link>
        <button onClick={() => window.print()}>Print</button>
        <button onClick={downloadPdf}>Download PDF</button>
        <button className="secondary" onClick={shareOnWhatsApp}>Share on WhatsApp</button>
      </div>

      <div className="invoice-sheet">
        <div className="invoice-header">
          <div>
            <h2 style={{ margin: 0 }}>{business?.name || "ShopCart"}</h2>
            <p style={{ margin: "2px 0", color: "#6b7280" }}>{business?.type}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div><strong>Order #{order.id.slice(0, 8)}</strong></div>
            <div style={{ color: "#6b7280", fontSize: 13 }}>{formatDate(order.created_at)}</div>
            <span className="badge" style={{ marginTop: 4, display: "inline-block" }}>{order.status}</span>
          </div>
        </div>

        {order.customer_name && (
          <p style={{ color: "#374151" }}>
            <strong>Billed to:</strong> {order.customer_name}
            {order.customer_phone && ` · ${order.customer_phone}`}
          </p>
        )}

        <table className="invoice-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id}>
                <td>{it.product_name_snapshot}</td>
                <td>{it.quantity} {it.unit_type_snapshot}</td>
                <td>₹{it.unit_price_snapshot}</td>
                <td>₹{it.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-total-row">
          <span>Total</span>
          <strong>₹{order.total_amount}</strong>
        </div>

        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 12, marginTop: 30 }}>
          Generated by ShopCart — Order Simple, Bill Right
        </p>
      </div>
    </div>
  );
}
