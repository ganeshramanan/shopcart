import { Link } from "react-router-dom";
import { Button, Row, Col, Typography, Card, Space } from "antd";
import {
  ShoppingOutlined, BarcodeOutlined, WhatsAppOutlined, MobileOutlined,
  BarChartOutlined, TeamOutlined, CheckCircleFilled, RocketOutlined,
} from "@ant-design/icons";

const { Title, Text, Paragraph } = Typography;

const FEATURES = [
  {
    icon: <BarcodeOutlined />,
    title: "Billing without the guesswork",
    desc: "Price-snapshot billing locks in the price at order time — no more \"customer said half kg, bill said 1kg\" mix-ups. Scan branded products once, scan forever after.",
  },
  {
    icon: <MobileOutlined />,
    title: "Your own ordering app",
    desc: "Customers browse your catalog, order from their phone, and get notified on WhatsApp — no separate app to install, no commission to a delivery platform.",
  },
  {
    icon: <WhatsAppOutlined />,
    title: "WhatsApp, both ways",
    desc: "Customers notify you the moment they order. You notify them the moment it's packed, ready, or dispatched. All free, no SMS gateway needed.",
  },
  {
    icon: <TeamOutlined />,
    title: "Staff accounts, your rules",
    desc: "Give trusted staff a POS-only login — bill customers without handing over your full dashboard. You decide what they can see.",
  },
  {
    icon: <BarChartOutlined />,
    title: "Know your numbers",
    desc: "Revenue trends, top products, order history — exportable to CSV whenever you need it for your own records or your accountant.",
  },
  {
    icon: <ShoppingOutlined />,
    title: "Built for your kind of shop",
    desc: "Provision store, pharmacy, laundry — one flexible catalog adapts to how you actually sell, not a one-size-fits-all template.",
  },
];

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, #2563eb, #1e1b4b)",
          borderRadius: 16,
          padding: "56px 32px",
          textAlign: "center",
          color: "#fff",
          marginBottom: 40,
        }}
      >
        <Title level={1} style={{ color: "#fff", marginBottom: 12, fontSize: "clamp(28px, 5vw, 42px)" }}>
          Billing and online ordering,<br />built for your shop
        </Title>
        <Paragraph style={{ color: "rgba(255,255,255,0.88)", fontSize: 17, maxWidth: 640, margin: "0 auto 28px" }}>
          ShopCart helps provision stores, pharmacies, and laundries bill accurately,
          take orders online, and stay organized — without juggling five different apps.
        </Paragraph>
        <Space size="middle" wrap style={{ justifyContent: "center" }}>
          <Link to="/signup">
            <Button type="primary" size="large" icon={<RocketOutlined />} style={{ background: "#16a34a", borderColor: "#16a34a", fontWeight: 600 }}>
              Try it with your shop
            </Button>
          </Link>
          <a href="#how-it-works">
            <Button size="large" ghost>See how it works</Button>
          </a>
        </Space>
        <Paragraph style={{ color: "rgba(255,255,255,0.7)", fontSize: 13, marginTop: 20, marginBottom: 0 }}>
          Set up your shop and use it free — if it genuinely helps, we'll talk pricing. No card, no catch.
        </Paragraph>
      </div>

      {/* Trust strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 48, textAlign: "center" }}>
        {[
          "No commission on your orders",
          "Your data, your shop, your rules",
          "Free to try — talk to us before you pay anything",
        ].map((line) => (
          <Col xs={24} md={8} key={line}>
            <Space>
              <CheckCircleFilled style={{ color: "#16a34a" }} />
              <Text strong>{line}</Text>
            </Space>
          </Col>
        ))}
      </Row>

      {/* Features */}
      <div id="how-it-works" style={{ marginBottom: 48 }}>
        <Title level={2} style={{ textAlign: "center", marginBottom: 8 }}>Everything your shop actually needs</Title>
        <Text type="secondary" style={{ display: "block", textAlign: "center", marginBottom: 32, fontSize: 15 }}>
          No bloated enterprise features you'll never touch — just the tools that fix real, everyday shop problems.
        </Text>
        <Row gutter={[20, 20]}>
          {FEATURES.map((f) => (
            <Col xs={24} sm={12} lg={8} key={f.title}>
              <Card style={{ height: "100%", borderRadius: 12 }} bodyStyle={{ padding: 22 }}>
                <div
                  style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: "linear-gradient(135deg, #3b82f6, #1e1b4b)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: 20, marginBottom: 14,
                  }}
                >
                  {f.icon}
                </div>
                <Title level={5} style={{ marginBottom: 6 }}>{f.title}</Title>
                <Text type="secondary">{f.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* How to try it */}
      <Card
        style={{ marginBottom: 48, borderRadius: 16, background: "#f0fdf4", border: "1px solid #bbf7d0" }}
        bodyStyle={{ padding: 32, textAlign: "center" }}
      >
        <Title level={3} style={{ marginBottom: 8 }}>Try it with your shop — genuinely free, no pressure</Title>
        <Paragraph style={{ fontSize: 15, maxWidth: 600, margin: "0 auto 20px", color: "#166534" }}>
          Set up your catalog, bill a few real customers, see how it feels for a few weeks.
          If it's actually useful for your shop, we'll figure out pricing together — not before.
        </Paragraph>
        <Link to="/signup">
          <Button type="primary" size="large" icon={<RocketOutlined />} style={{ background: "#16a34a", borderColor: "#16a34a", fontWeight: 600 }}>
            Create Your Shop Account
          </Button>
        </Link>
      </Card>
    </div>
  );
}
