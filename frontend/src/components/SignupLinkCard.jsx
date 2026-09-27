import { useState } from "react";
import { Card, Input, Space, Button, Typography, message } from "antd";
import { CopyOutlined, WhatsAppOutlined, QrcodeOutlined } from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { normalizeIndianPhone } from "../utils.js";

const { Text } = Typography;

// Shared by the shop owner's Home tab and the staff POS view's Signup Link
// tab — keeping this in one place means both always stay in sync (they used
// to drift, e.g. only one had the "send to a specific number" input).
export default function SignupLinkCard({ businessId, title = "Your customer signup link" }) {
  const [showQr, setShowQr] = useState(false);
  const [waPhone, setWaPhone] = useState("");
  const signupLink = `${window.location.origin}/signup?shop=${businessId}`;

  return (
    <Card title={title}>
      <Text type="secondary">
        Share this with your customers via WhatsApp or let them scan the QR code
        so they can sign up directly to your shop — they'll never see other shops on the platform.
      </Text>
      <Space wrap style={{ marginTop: 12 }}>
        <Input readOnly value={signupLink} style={{ width: 320 }} onFocus={(e) => e.target.select()} />
        <Button icon={<CopyOutlined />} onClick={() => {
          navigator.clipboard.writeText(signupLink);
          message.success("Copied!");
        }}>Copy</Button>
        <Button icon={<QrcodeOutlined />} onClick={() => setShowQr((v) => !v)}>
          {showQr ? "Hide QR" : "Show QR Code"}
        </Button>
      </Space>

      <div style={{ marginTop: 16 }}>
        <Text strong style={{ fontSize: 13 }}>Send directly to a customer's number</Text>
        <div><Text type="secondary" style={{ fontSize: 12 }}>No need to search/save their contact first — opens WhatsApp chat with them directly.</Text></div>
        <Space wrap style={{ marginTop: 8 }}>
          <Input
            placeholder="Customer's WhatsApp number"
            value={waPhone}
            onChange={(e) => setWaPhone(e.target.value.replace(/[^\d]/g, ""))}
            style={{ width: 200 }}
          />
          <Button
            type="primary"
            icon={<WhatsAppOutlined />}
            onClick={() => {
              const text = encodeURIComponent(`Join our shop on ShopCart to place orders directly: ${signupLink}`);
              const target = waPhone.trim()
                ? `https://wa.me/${normalizeIndianPhone(waPhone)}?text=${text}`
                : `https://wa.me/?text=${text}`;
              window.open(target, "_blank");
            }}
          >
            {waPhone.trim() ? "Send to this number" : "Share on WhatsApp"}
          </Button>
        </Space>
      </div>

      {showQr && (
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <div style={{ display: "inline-block", background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #f0f0f0" }}>
            <QRCodeSVG value={signupLink} size={180} />
          </div>
          <p style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
            Print this and stick it at your counter — customers can scan to sign up.
          </p>
        </div>
      )}
    </Card>
  );
}
