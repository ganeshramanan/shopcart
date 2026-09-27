import { Typography } from "antd";

const { Title, Text } = Typography;

// Shared banner shown on the shop owner's dashboard, the customer catalog,
// and the staff POS view — keeping this in one place so all three surfaces
// stay visually consistent and never drift out of sync.
export default function ShopBanner({ business, compact = false }) {
  if (!business) return null;

  return (
    <div
      style={{
        background: business.logo_url
          ? `linear-gradient(135deg, rgba(37,99,235,0.85), rgba(30,27,75,0.85)), url(${business.logo_url})`
          : "linear-gradient(135deg, #2563eb, #1e1b4b)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        padding: compact ? "18px 20px" : "28px 24px",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        gap: 16,
        borderRadius: 12,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          width: compact ? 48 : 64, height: compact ? 48 : 64, borderRadius: 12, background: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {business.logo_url ? (
          <img src={business.logo_url} alt={business.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Text strong style={{ fontSize: compact ? 18 : 22, color: "#2563eb" }}>
            {business.name?.charAt(0)?.toUpperCase() || "S"}
          </Text>
        )}
      </div>
      <div>
        <Title level={compact ? 4 : 3} style={{ color: "#fff", margin: 0 }}>{business.name}</Title>
        <Text style={{ color: "rgba(255,255,255,0.85)" }}>{business.type}</Text>
      </div>
    </div>
  );
}
