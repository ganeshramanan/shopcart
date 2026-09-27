import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { Button, Input, Space, Tag, Typography, Divider } from "antd";
import { ArrowLeftOutlined, PrinterOutlined, DownloadOutlined, WhatsAppOutlined } from "@ant-design/icons";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatDate } from "../utils.js";

const { Title, Text } = Typography;
const STATUS_COLORS = {
  placed: "gold", confirmed: "blue", packing: "purple", ready: "cyan",
  dispatched: "geekblue", delivered: "green", cancelled: "red",
};

export default function Invoice() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [business, setBusiness] = useState(null);
  const [error, setError] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [sharing, setSharing] = useState(false);

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

  // "Back" should return to wherever the user actually came from — the
  // shop owner's Orders tab, the customer's My Orders page, etc. — not a
  // hardcoded route. Browser history covers that; if there's no history
  // (e.g. invoice opened directly via a shared link), fall back to a
  // sensible destination based on the viewer's role.
  const goBack = () => {
    if (window.history.length > 2) {
      navigate(-1);
    } else if (user?.role === "shop_owner") {
      navigate("/dashboard?tab=overview");
    } else if (user?.role === "staff") {
      navigate("/pos?tab=orders");
    } else {
      navigate("/orders");
    }
  };

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

  const buildPdfDoc = () => {
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

    return doc;
  };

  const downloadPdf = () => {
    buildPdfDoc().save(`invoice-${order.id.slice(0, 8)}.pdf`);
  };

  const sharePdfOnWhatsApp = async () => {
    const doc = buildPdfDoc();
    const blob = doc.output("blob");
    const fileName = `invoice-${order.id.slice(0, 8)}.pdf`;
    const file = new File([blob], fileName, { type: "application/pdf" });

    // Web Share API with files is also present on desktop Safari/Chrome, but
    // there it opens the OS-level share sheet (Mail, AirDrop, etc.) — WhatsApp
    // Desktop isn't registered as a share target there, so it never shows up.
    // Only use the native file-share flow on actual mobile devices, where the
    // WhatsApp app IS registered as a share target. Everywhere else, go
    // straight to the text-only wa.me link.
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
      setSharing(true);
      try {
        await navigator.share({
          files: [file],
          title: `${business?.name || "ShopCart"} — Bill`,
          text: `Bill from ${business?.name || "ShopCart"} — Order #${order.id.slice(0, 8)}`,
        });
      } catch (err) {
        // User cancelled the share sheet — not an error worth surfacing
      } finally {
        setSharing(false);
      }
    } else {
      shareOnWhatsApp();
    }
  };

  return (
    <div>
      <div className="no-print" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<ArrowLeftOutlined />} onClick={goBack}>Back</Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()}>Print</Button>
          <Button icon={<DownloadOutlined />} onClick={downloadPdf}>Download PDF</Button>
          <Input
            placeholder="Customer's WhatsApp number"
            value={waPhone}
            onChange={(e) => setWaPhone(e.target.value.replace(/[^\d]/g, ""))}
            style={{ width: 200 }}
          />
          <Button icon={<WhatsAppOutlined />} loading={sharing} onClick={sharePdfOnWhatsApp}>
            Send Bill on WhatsApp
          </Button>
        </Space>
        <div style={{ marginTop: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            On mobile, "Send Bill" attaches the actual PDF via your phone's share sheet. On desktop, it opens WhatsApp Web with a text summary (WhatsApp Desktop apps can't receive files from browsers).
          </Text>
        </div>
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
