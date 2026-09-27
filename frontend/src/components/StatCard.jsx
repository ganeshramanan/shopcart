import { Typography } from "antd";
import { ArrowUpOutlined, ArrowDownOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;

// Color themes shared across every stat card on the platform. Kept as a
// lookup here (not per-page) so shop-owner, staff, and admin dashboards can
// all reuse the same visual language without drifting apart.
export const STAT_THEMES = {
  blue: { gradient: "linear-gradient(135deg, #3b82f6, #1d4ed8)", tint: "#eff6ff" },
  green: { gradient: "linear-gradient(135deg, #22c55e, #15803d)", tint: "#f0fdf4" },
  purple: { gradient: "linear-gradient(135deg, #a855f7, #7e22ce)", tint: "#faf5ff" },
  orange: { gradient: "linear-gradient(135deg, #f59e0b, #b45309)", tint: "#fffbeb" },
  red: { gradient: "linear-gradient(135deg, #ef4444, #b91c1c)", tint: "#fef2f2" },
  cyan: { gradient: "linear-gradient(135deg, #06b6d4, #0e7490)", tint: "#ecfeff" },
};

// Shared, icon-based, gradient-accented stat card. Extracted so every
// dashboard (shop owner, staff, admin) can reuse the same look instead of
// each rolling its own plain Card + Statistic.
export default function StatCard({
  icon,
  title,
  value,
  prefix,
  color = "blue",
  trend, // optional: e.g. { value: 12, label: "vs last week" } — positive = up, negative = down
}) {
  const theme = STAT_THEMES[color] || STAT_THEMES.blue;
  const trendUp = trend != null && trend.value >= 0;

  return (
    <div
      className="stat-card-v2"
      style={{ "--stat-accent": theme.gradient }}
    >
      <div className="stat-card-v2-icon" style={{ background: theme.gradient }}>
        {icon}
      </div>
      <Text type="secondary" className="stat-card-v2-label">{title}</Text>
      <Title level={3} className="stat-card-v2-value">
        {prefix}{typeof value === "number" ? value.toLocaleString("en-IN") : value}
      </Title>
      {trend && (
        <span className={`stat-card-v2-trend ${trendUp ? "up" : "down"}`}>
          {trendUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(trend.value)}%
          {trend.label && <span className="stat-card-v2-trend-label"> {trend.label}</span>}
        </span>
      )}
    </div>
  );
}
