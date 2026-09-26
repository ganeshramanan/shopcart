import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { jsPDF } from "jspdf";
import { Button, Input, Space, Tag, Typography, Divider } from "antd";
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined, WhatsAppOutlined } from "@ant-design/icons";
import api from "../api";
import { formatDate } from "../utils.js";

const { Title, Text } = Typography;
const STATUS_COLORS = {
  placed: "gold", confirmed: "blue", packing: "purple", ready: "cyan",
  dispatched: "geekblue", delivered: "green", cancelled: "red",
};

export default function Invoice() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");
  const [waPhone, setWaPhone] = useState("");

  useEffect(() => {
    api.get(`/orders/${orderId}`)
      .then((res) => {
        setOrder(res.data);
        if (res.data.customer_phone) setWaPhone(res.data.customer_phone);
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

  // Normalizes an Indian 10-digit number to the international format
  // wa.me needs (country code, no +, no spaces/dashes).
  const normalizePhone = (raw) => {
    const digits = raw.replace(/[^\d]/g, "");
    if (digits.length === 10) return `91${digits}`;
    return digits;
  };

  const shareOnWhatsApp = () => {
    const text = buildWhatsAppText();
    if (waPhone.trim()) {
      const phone = normalizePhone(waPhone);
      window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
    } else {
      // No number entered — fall back to WhatsApp's contact picker
      window.open(`https://wa.me/?text=${text}`, "_blank");
    }
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
      <div className="no-print" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Link to="/orders"><Button icon={<ArrowLeftOutlined />}>Back</Button></Link>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
          <Button icon={<DownloadOutlined />} onClick={downloadPdf}>Download PDF</Button>
          <Input
            placeholder="Customer's WhatsApp number"
            value={waPhone}
            onChange={(e) => setWaPhone(e.target.value.replace(/[^\d]/g, ""))}
            style={{ width: 200 }}
          />
          <Button icon={<WhatsAppOutlined />} onClick={shareOnWhatsApp}>Send on WhatsApp</Button>
        </Space>
      </div>

      <div className="invoice-sheet">
        <div className="invoice-header">
          <div>
            <Title level={3} style={{ margin: 0 }}>{business?.name || "ShopCart"}</Title>
            <Text type="secondary">{business?.type}</Text>
          </div>
          <div style={{ textAlign: "right" }}>
            <Text strong>Order #{order.id.slice(0, 8)}</Text>
            <div><Text type="secondary" style={{ fontSize: 13 }}>{formatDate(order.created_at)}</Text></div>
            <Tag color={STATUS_COLORS[order.status]} style={{ marginTop: 4 }}>{order.status}</Tag>
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
