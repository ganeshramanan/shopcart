import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Layout, Menu, Card, Row, Col, Button, Input, Select, DatePicker,
  Table, Tag, Space, Badge, Form, Upload, message, Popconfirm, Empty, Typography,
  notification, Modal, Collapse, AutoComplete,
} from "antd";
import {
  HomeOutlined, ShoppingCartOutlined, InboxOutlined, PlusCircleOutlined,
  UploadOutlined, TeamOutlined, TagsOutlined, BarChartOutlined, UserOutlined,
  CopyOutlined, WhatsAppOutlined, QrcodeOutlined, MenuOutlined, ReloadOutlined,
  AppstoreOutlined, ThunderboltOutlined, ShoppingOutlined, WalletOutlined,
  DownloadOutlined, ScanOutlined, EditOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import { formatDate, normalizeIndianPhone, COMMON_UNITS } from "../utils.js";
import NewSale from "./NewSale.jsx";
import PrintLabels from "./PrintLabels.jsx";
import Analytics from "./Analytics.jsx";
import StaffManagement from "./StaffManagement.jsx";
import SignupLinkCard from "../components/SignupLinkCard.jsx";
import ShopBanner from "../components/ShopBanner.jsx";
import StatCard from "../components/StatCard.jsx";
import BarcodeScanner from "../components/BarcodeScanner.jsx";

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

const ORDER_STATUSES = ["placed", "confirmed", "packing", "ready", "dispatched", "delivered", "cancelled"];
const STATUS_COLORS = {
  placed: "gold", confirmed: "blue", packing: "purple", ready: "cyan",
  dispatched: "geekblue", delivered: "green", cancelled: "red",
};

const NAV_ITEMS = [
  { key: "home", icon: <HomeOutlined />, label: "Home" },
  { key: "newsale", icon: <ShoppingCartOutlined />, label: "New Sale" },
  { key: "overview", icon: <InboxOutlined />, label: "Orders" },
  { key: "inventory", icon: <InboxOutlined />, label: "Inventory" },
  { key: "add", icon: <PlusCircleOutlined />, label: "Add Product" },
  { key: "import", icon: <UploadOutlined />, label: "Bulk Import" },
  { key: "customers", icon: <TeamOutlined />, label: "Customers" },
  { key: "labels", icon: <TagsOutlined />, label: "Print Labels" },
  { key: "analytics", icon: <BarChartOutlined />, label: "Analytics" },
  { key: "staff", icon: <UserOutlined />, label: "Staff" },
];

const PAGE_TITLES = {
  home: ["Home", "Quick overview of your shop"],
  newsale: ["New Sale", "Billing counter — search or scan a product to add it"],
  overview: ["Orders", "Track and update order status"],
  inventory: ["Inventory", "Manage your catalog and prices"],
  add: ["Add Product", "Add a single item to your catalog"],
  import: ["Bulk Import", "Upload an Excel/CSV rate list"],
  customers: ["Customers", "Everyone who signed up to your shop"],
  labels: ["Print Labels", "Generate scannable barcode stickers"],
  analytics: ["Analytics", "Sales performance over time"],
  staff: ["Staff", "Manage POS-only staff accounts"],
};

export default function ShopDashboard() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  // Allow deep-linking to a specific tab via ?tab=overview (used by
  // Invoice.jsx's "Back" button so it returns to the Orders tab specifically,
  // not just the dashboard's default Home tab). Kept in sync both ways:
  // reading it on mount, and writing it back whenever the tab changes, so
  // browser back/forward and shared links both land on the right tab.
  const [tab, setTab] = useState(searchParams.get("tab") || "home");
  const [collapsed, setCollapsed] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [search, setSearch] = useState("");
  const [showQr, setShowQr] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [orderDateRange, setOrderDateRange] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [signupWaPhone, setSignupWaPhone] = useState("");
  const [business, setBusiness] = useState(null);
  const [contactPhoneInput, setContactPhoneInput] = useState("");
  const [savingContact, setSavingContact] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState("");
  const [savingLogo, setSavingLogo] = useState(false);
  const [minOrderValueInput, setMinOrderValueInput] = useState("");
  const [savingMinOrderValue, setSavingMinOrderValue] = useState(false);
  const [customerResetTarget, setCustomerResetTarget] = useState(null);
  const [customerNewPassword, setCustomerNewPassword] = useState("");
  const [resettingCustomer, setResettingCustomer] = useState(false);
  const [addForm] = Form.useForm();
  const [addScannerOpen, setAddScannerOpen] = useState(false);
  const [lookingUpBarcode, setLookingUpBarcode] = useState(false);
  const [editProductTarget, setEditProductTarget] = useState(null); // product object being edited, or null
  const [editForm] = Form.useForm();
  const [savingEditProduct, setSavingEditProduct] = useState(false);

  const businessId = user?.business_id;
  const signupLink = businessId ? `${window.location.origin}/signup?shop=${businessId}` : "";

  const loadProducts = () => {
    if (!businessId) return;
    api.get(`/products?business_id=${businessId}`).then((res) => setProducts(res.data));
  };
  const loadOrders = () => api.get("/orders").then((res) => setOrders(res.data));
  const loadCustomers = () => {
    if (!businessId) return;
    api.get(`/businesses/${businessId}/customers`).then((res) => setCustomers(res.data));
  };

  // Poll for new orders every 30s so the shop owner doesn't have to manually
  // refresh the page to notice a customer just placed an order. Plays a short
  // beep + shows a toast for each newly-seen order. Free — no push
  // infrastructure needed, just periodic polling of our existing endpoint.
  const knownOrderIds = useRef(new Set());
  const firstLoadDone = useRef(false);

  const playNotifySound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {
      // Audio not available/allowed — silently skip, toast still shows
    }
  };

  const pollOrders = () => {
    api.get("/orders").then((res) => {
      const incoming = res.data;
      if (firstLoadDone.current) {
        const newOnes = incoming.filter((o) => !knownOrderIds.current.has(o.id));
        newOnes.forEach((o) => {
          notification.success({
            message: "New Order!",
            description: `#${o.id.slice(0, 8)} — ₹${o.total_amount} from ${o.customer_name || "a customer"}`,
            placement: "topRight",
          });
        });
        if (newOnes.length > 0) playNotifySound();
      }
      knownOrderIds.current = new Set(incoming.map((o) => o.id));
      firstLoadDone.current = true;
      setOrders(incoming);
    });
  };

  const loadBusiness = () => {
    if (!businessId) return;
    api.get(`/businesses/${businessId}`).then((res) => {
      setBusiness(res.data);
      setContactPhoneInput(res.data.contact_phone || "");
      setLogoUrlInput(res.data.logo_url || "");
      setMinOrderValueInput(res.data.min_order_value ? String(res.data.min_order_value) : "");
    });
  };

  useEffect(() => {
    loadProducts();
    pollOrders();
    loadCustomers();
    loadBusiness();

    const interval = setInterval(pollOrders, 30000);
    return () => clearInterval(interval);
  }, [businessId]);

  if (!businessId) return <NoBusinessYet onCreated={refreshUser} approvalStatus={user?.approval_status} />;

  const addProduct = async (values) => {
    try {
      await api.post(`/products?business_id=${businessId}`, {
        ...values,
        price: parseFloat(values.price),
      });
      addForm.resetFields();
      message.success("Product added");
      loadProducts();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not add product");
    }
  };

  // "Scan to Add" — shop owner scans a branded product's real factory
  // barcode (same barcode on every unit of that SKU, e.g. every Britannia
  // Good Day 100g packet) once when it first arrives. We save that real
  // barcode on the product so every future unit scans straight to it at
  // POS — no sticker needed for branded goods, only for loose/unbranded
  // items that still go through the existing auto-generate+print flow.
  //
  // As a free bonus, we look up the scanned barcode against Open Food
  // Facts (no API key, no cost) to auto-fill the product name — shop
  // owner just confirms/edits it and sets their own price, since price is
  // always a business decision, never pulled from the barcode itself.
  const handleAddScan = async (decodedText) => {
    setAddScannerOpen(false);
    addForm.setFieldsValue({ barcode: decodedText });
    message.success(`Barcode scanned: ${decodedText}`);

    setLookingUpBarcode(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${decodedText}.json`);
      const data = await res.json();
      if (data?.status === 1 && data.product?.product_name) {
        addForm.setFieldsValue({ name: data.product.product_name });
        message.info("Product name auto-filled from barcode — review before saving.");
      } else {
        message.info("Barcode saved, but no product name found online — please enter it manually.");
      }
    } catch (err) {
      // Lookup is a nice-to-have only — never block the shop owner from
      // continuing just because the free lookup service is unreachable.
      message.info("Barcode saved. Couldn't reach the product lookup service — enter the name manually.");
    } finally {
      setLookingUpBarcode(false);
    }
  };

  const savePrice = async (productId) => {
    const price = parseFloat(editing[productId]);
    if (isNaN(price)) return;
    await api.put(`/products/${productId}`, { price });
    setEditing((prev) => ({ ...prev, [productId]: undefined }));
    message.success("Price updated");
    loadProducts();
  };

  const deleteProduct = async (productId) => {
    await api.delete(`/products/${productId}`);
    message.success("Product removed");
    loadProducts();
  };

  // Full Edit Product modal — the inline Inventory row only ever let a
  // shop owner tweak price. Name/unit/category/image/barcode had no edit
  // path at all other than delete + recreate (which also loses barcode
  // continuity). This reuses the same PUT /products/{id} endpoint, which
  // already supports partial updates — no backend change needed.
  const openEditProduct = (product) => {
    setEditProductTarget(product);
    editForm.setFieldsValue({
      name: product.name,
      unit_type: product.unit_type,
      price: product.price,
      category: product.category,
      image_url: product.image_url,
      barcode: product.barcode,
    });
  };

  const saveEditProduct = async (values) => {
    setSavingEditProduct(true);
    try {
      await api.put(`/products/${editProductTarget.id}`, {
        ...values,
        price: parseFloat(values.price),
      });
      message.success("Product updated");
      setEditProductTarget(null);
      loadProducts();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not update product");
    } finally {
      setSavingEditProduct(false);
    }
  };

  const handleImport = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    setImportResult(null);
    setImporting(true);
    try {
      const { data } = await api.post(
        `/products/import?business_id=${businessId}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setImportResult(data);
      loadProducts();
      message.success(`Imported: ${data.created} created, ${data.updated} updated`);
    } catch (err) {
      message.error(err.response?.data?.detail || "Import failed");
    } finally {
      setImporting(false);
    }
    return false; // prevent antd Upload's default upload behavior
  };

  const updateStatus = async (orderId, status) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    loadOrders();
  };

  // Status update -> customer WhatsApp notification. Mirrors the existing
  // customer -> shop WhatsApp notify (Catalog.jsx) but in the other
  // direction, so customers know their order moved without having to poll
  // MyOrders themselves. Opens wa.me with a pre-filled message; nothing is
  // sent automatically (WhatsApp requires a user tap to actually send —
  // this keeps it free, no WhatsApp Business API needed).
  const STATUS_MESSAGES = {
    confirmed: "Your order has been confirmed and we're getting it ready!",
    packing: "Your order is being packed right now.",
    ready: "Your order is ready for pickup!",
    dispatched: "Your order is on its way to you!",
    delivered: "Your order has been delivered. Thank you for shopping with us!",
    cancelled: "Your order has been cancelled. Contact us if you have questions.",
  };

  const notifyCustomerOnWhatsApp = (order) => {
    if (!order.customer_phone) {
      message.warning("No phone number on file for this customer");
      return;
    }
    const lines = order.items.map((it) => `${it.product_name_snapshot} — ${it.quantity} ${it.unit_type_snapshot}`);
    const text = [
      `Update on your order #${order.id.slice(0, 8)} from ${business?.name || "us"}:`,
      "",
      STATUS_MESSAGES[order.status] || `Status: ${order.status}`,
      "",
      ...lines,
      "",
      `Total: ₹${order.total_amount}`,
    ].join("\n");
    const target = `https://wa.me/${normalizeIndianPhone(order.customer_phone)}?text=${encodeURIComponent(text)}`;
    window.open(target, "_blank");
  };

  const removeCustomer = async (customerId) => {
    await api.delete(`/businesses/${businessId}/customers/${customerId}`);
    message.success("Customer removed");
    loadCustomers();
  };

  const submitCustomerPasswordReset = async () => {
    if (!customerNewPassword || customerNewPassword.length < 4) {
      message.error("Password must be at least 4 characters");
      return;
    }
    setResettingCustomer(true);
    try {
      await api.post(
        `/businesses/${businessId}/customers/${customerResetTarget.id}/reset-password`,
        { new_password: customerNewPassword }
      );
      message.success(`Password reset for ${customerResetTarget.name}. Let them know their new password directly.`);
      setCustomerResetTarget(null);
      setCustomerNewPassword("");
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not reset password");
    } finally {
      setResettingCustomer(false);
    }
  };

  const saveContactPhone = async () => {
    setSavingContact(true);
    try {
      await api.patch(`/businesses/${businessId}`, { contact_phone: contactPhoneInput });
      message.success("Contact number saved");
      loadBusiness();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not save contact number");
    } finally {
      setSavingContact(false);
    }
  };

  const saveLogoUrl = async () => {
    setSavingLogo(true);
    try {
      await api.patch(`/businesses/${businessId}`, { logo_url: logoUrlInput });
      message.success("Banner updated");
      loadBusiness();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not save banner image");
    } finally {
      setSavingLogo(false);
    }
  };

  const saveMinOrderValue = async () => {
    const value = parseFloat(minOrderValueInput);
    if (minOrderValueInput !== "" && (isNaN(value) || value < 0)) {
      message.error("Enter a valid amount (0 or more)");
      return;
    }
    setSavingMinOrderValue(true);
    try {
      await api.patch(`/businesses/${businessId}`, { min_order_value: minOrderValueInput === "" ? 0 : value });
      message.success("Minimum order value updated");
      loadBusiness();
    } catch (err) {
      message.error(err.response?.data?.detail || "Could not save minimum order value");
    } finally {
      setSavingMinOrderValue(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const totalRevenue = orders
    .filter((o) => o.status === "delivered")
    .reduce((sum, o) => sum + o.total_amount, 0);

  const filteredOrders = orders.filter((o) => {
    const q = orderSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.includes(q)) ||
      o.id.toLowerCase().includes(q);
    const matchesStatus = orderStatusFilter === "all" || o.status === orderStatusFilter;
    const orderDay = o.created_at.slice(0, 10);
    const matchesRange =
      !orderDateRange ||
      (orderDay >= orderDateRange[0].format("YYYY-MM-DD") && orderDay <= orderDateRange[1].format("YYYY-MM-DD"));
    return matchesSearch && matchesStatus && matchesRange;
  });

  // CSV export — respects whatever search/status/date filters are
  // currently applied, so a shop owner doing e.g. end-of-day reconciliation
  // can filter to today's delivered orders first, then export just those.
  // One row per order line item (not one row per order) so quantities/
  // prices are visible per product, matching how a bookkeeper would want it.
  const exportOrdersCsv = () => {
    if (filteredOrders.length === 0) {
      message.info("No orders to export with the current filters");
      return;
    }
    const headers = ["Order ID", "Date", "Customer Name", "Customer Phone", "Status", "Product", "Quantity", "Unit", "Unit Price", "Line Total", "Order Total"];
    const escapeCsv = (val) => {
      const s = String(val ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [headers];
    filteredOrders.forEach((o) => {
      o.items.forEach((it) => {
        rows.push([
          o.id, formatDate(o.created_at), o.customer_name || "", o.customer_phone || "", o.status,
          it.product_name_snapshot, it.quantity, it.unit_type_snapshot, it.unit_price_snapshot, it.line_total, o.total_amount,
        ]);
      });
    });
    const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const [pageTitle, pageSubtitle] = PAGE_TITLES[tab] || ["", ""];

  const selectTab = (key) => {
    setTab(key);
    setSearchParams(key === "home" ? {} : { tab: key }, { replace: false });
  };

  const inventoryColumns = [
    {
      title: "Product", dataIndex: "name", key: "name",
      render: (name, p) => (
        <Space>
          <img src={p.image_url || "https://placehold.co/40x40/CCCCCC/666666?text=?"} alt={name}
            style={{ width: 36, height: 36, borderRadius: 6, objectFit: "cover" }} />
          <div>
            <div style={{ fontWeight: 600 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{p.category || "Uncategorized"} · {p.unit_type}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: "Price", dataIndex: "price", key: "price", width: 280,
      render: (price, p) => (
        <Space>
          <Input
            style={{ width: 90 }}
            prefix="₹"
            type="number"
            value={editing[p.id] ?? price}
            onChange={(e) => setEditing((prev) => ({ ...prev, [p.id]: e.target.value }))}
          />
          <Button size="small" onClick={() => savePrice(p.id)}>Save</Button>
          <Button size="small" icon={<EditOutlined />} onClick={() => openEditProduct(p)}>Edit</Button>
          <Popconfirm title="Remove this product?" onConfirm={() => deleteProduct(p.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const customerColumns = [
    {
      title: "Name", dataIndex: "name", key: "name",
      render: (name, c) => (
        <span>
          <Text strong>{name}</Text>{" "}
          {c.is_guest && <Tag color="default">Walk-in</Tag>}
        </span>
      ),
    },
    { title: "Phone", dataIndex: "phone", key: "phone", render: (p) => p ? <a href={`tel:${p}`}>{p}</a> : <Text type="secondary">—</Text> },
    { title: "Orders", dataIndex: "order_count", key: "order_count", width: 90 },
    { title: "Total Spent", dataIndex: "total_spent", key: "total_spent", width: 120, render: (v) => `₹${v}` },
    {
      title: "", key: "actions", width: 180,
      render: (_, c) => (
        !c.is_guest && (
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="small" onClick={() => { setCustomerResetTarget(c); setCustomerNewPassword(""); }}>Reset PW</Button>
            <Popconfirm title={`Remove ${c.name}?`} onConfirm={() => removeCustomer(c.id)}>
              <Button size="small" danger>Remove</Button>
            </Popconfirm>
          </div>
        )
      ),
    },
  ];

  return (
    <Layout className="shop-dashboard-root" style={{ background: "transparent", minHeight: "calc(100vh - 64px)" }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        breakpoint="lg"
        collapsedWidth={80}
        trigger={null}
        className="dash-sider"
        style={{ background: "#fff", borderRadius: 12, marginRight: 16, overflow: "hidden" }}
        width={220}
      >
        <div style={{ padding: 12, textAlign: collapsed ? "center" : "left" }}>
          <Button
            type="text"
            className="dash-collapse-btn"
            icon={<MenuOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ marginBottom: 8 }}
          />
        </div>
        <Menu
          mode="inline"
          selectedKeys={[tab]}
          onClick={({ key }) => selectTab(key)}
          items={NAV_ITEMS}
          className="dash-nav-menu"
          style={{ border: "none" }}
        />
      </Sider>

      <Content>
        <Title level={3} style={{ marginBottom: 0 }}>{pageTitle}</Title>
        <Text type="secondary">{pageSubtitle}</Text>

        <div style={{ marginTop: 20 }}>
          {tab === "home" && (
            <>
              <Card style={{ marginBottom: 16, overflow: "hidden", padding: 0 }} bodyStyle={{ padding: 0 }}>
                <ShopBanner business={business || { name: "Your Shop" }} />
                <div style={{ padding: "12px 24px" }}>
                  <Space wrap>
                    <Input
                      placeholder="Paste a direct image URL"
                      value={logoUrlInput}
                      onChange={(e) => setLogoUrlInput(e.target.value)}
                      style={{ width: 320 }}
                    />
                    <Button loading={savingLogo} onClick={saveLogoUrl}>Save Banner</Button>
                  </Space>
                  <Collapse
                    ghost
                    size="small"
                    style={{ marginTop: 8 }}
                    items={[{
                      key: "howto",
                      label: <Text type="secondary" style={{ fontSize: 12 }}>How to get an image link (one-time setup) →</Text>,
                      children: (
                        <div style={{ fontSize: 12, color: "#6b7280" }}>
                          <Text type="warning" style={{ display: "block", marginBottom: 6 }}>
                            Note: Google Drive/Photos links don't work here — Google blocks their
                            images from being shown on other websites. Use a free image host instead:
                          </Text>
                          <ol style={{ paddingLeft: 18, margin: 0 }}>
                            <li>Go to <a href="https://postimages.org" target="_blank" rel="noreferrer">postimages.org</a> (free, no signup needed)</li>
                            <li>Click <strong>Choose images</strong> and upload your shop's photo/logo</li>
                            <li>After upload, find the <strong>"Direct link"</strong> field on the results page</li>
                            <li>Copy that Direct link and paste it into the field above</li>
                          </ol>
                        </div>
                      ),
                    }]}
                  />
                </div>
              </Card>

              <div style={{ marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                  Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
                </Title>
                <Text type="secondary">Here's how {business?.name || "your shop"} is doing today.</Text>
              </div>

              <Row gutter={16}>
                <Col xs={12} md={6}>
                  <StatCard icon={<AppstoreOutlined />} color="blue" title="Products" value={products.length} />
                </Col>
                <Col xs={12} md={6}>
                  <StatCard icon={<ThunderboltOutlined />} color="orange" title="Active Orders" value={activeOrders.length} />
                </Col>
                <Col xs={12} md={6}>
                  <StatCard icon={<ShoppingOutlined />} color="purple" title="Total Orders" value={orders.length} />
                </Col>
                <Col xs={12} md={6}>
                  <StatCard icon={<WalletOutlined />} color="green" title="Revenue (Delivered)" value={totalRevenue} prefix="₹" />
                </Col>
              </Row>

              {!business?.contact_phone && (
                <Card title="⚠️ Set your WhatsApp contact number" style={{ marginTop: 16, borderColor: "#f59e0b" }}>
                  <Text type="secondary">
                    Customers will use this number to notify you instantly on WhatsApp when they place an order.
                    Without it set, they'll have to pick your contact manually.
                  </Text>
                  <Space style={{ marginTop: 12 }}>
                    <Input
                      placeholder="Your WhatsApp number"
                      value={contactPhoneInput}
                      onChange={(e) => setContactPhoneInput(e.target.value.replace(/[^\d]/g, ""))}
                      style={{ width: 200 }}
                    />
                    <Button type="primary" className="dash-gradient-btn" loading={savingContact} onClick={saveContactPhone}>Save</Button>
                  </Space>
                </Card>
              )}

              <Card title="🛒 Minimum Order Value" style={{ marginTop: 16 }}>
                <Text type="secondary">
                  Customers must reach this amount before they can place an order. Leave at 0 (or empty) for no minimum.
                </Text>
                <Space style={{ marginTop: 12 }}>
                  <Input
                    placeholder="e.g. 100"
                    prefix="₹"
                    type="number"
                    min={0}
                    value={minOrderValueInput}
                    onChange={(e) => setMinOrderValueInput(e.target.value)}
                    style={{ width: 160 }}
                  />
                  <Button type="primary" className="dash-gradient-btn" loading={savingMinOrderValue} onClick={saveMinOrderValue}>Save</Button>
                </Space>
              </Card>

              <div style={{ marginTop: 16 }}>
                <SignupLinkCard businessId={businessId} />
              </div>

              <Card title="Recent Active Orders" style={{ marginTop: 16 }}>
                {activeOrders.length === 0 ? (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="No active orders right now — new orders will show up here."
                    style={{ padding: "12px 0" }}
                  />
                ) : (
                  <>
                    {activeOrders.slice(0, 5).map((o) => (
                      <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f0f0f0" }}>
                        <span>#{o.id.slice(0, 8)} — ₹{o.total_amount}</span>
                        <Tag color={STATUS_COLORS[o.status]}>{o.status}</Tag>
                      </div>
                    ))}
                    <Button type="link" onClick={() => selectTab("overview")} style={{ marginTop: 8, padding: 0 }}>
                      View All Orders →
                    </Button>
                  </>
                )}
              </Card>
            </>
          )}

          {tab === "newsale" && <NewSale products={products} businessId={businessId} />}
          {tab === "labels" && <PrintLabels products={products} businessId={businessId} onRefresh={loadProducts} />}
          {tab === "analytics" && <Analytics businessId={businessId} />}
          {tab === "staff" && <StaffManagement />}

          {tab === "overview" && (
            <>
              <Card style={{ marginBottom: 16 }}>
                <Space wrap>
                  <Input
                    placeholder="Search by customer name, phone, or order ID..."
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    style={{ width: 280 }}
                  />
                  <Select
                    value={orderStatusFilter}
                    onChange={setOrderStatusFilter}
                    style={{ width: 160 }}
                    options={[{ value: "all", label: "All statuses" }, ...ORDER_STATUSES.map((s) => ({ value: s, label: s }))]}
                  />
                  <DatePicker.RangePicker value={orderDateRange} onChange={setOrderDateRange} />
                  {(orderSearch || orderStatusFilter !== "all" || orderDateRange) && (
                    <Button onClick={() => { setOrderSearch(""); setOrderStatusFilter("all"); setOrderDateRange(null); }}>
                      Clear
                    </Button>
                  )}
                  <Button icon={<ReloadOutlined />} onClick={pollOrders}>Refresh</Button>
                  <Button icon={<DownloadOutlined />} onClick={exportOrdersCsv}>Download CSV</Button>
                </Space>
              </Card>

              {filteredOrders.length === 0 && <Empty description="No orders match your filters" />}
              {filteredOrders.map((o) => (
                <Card key={o.id} size="small" style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <Text strong>#{o.id.slice(0, 8)} — ₹{o.total_amount}</Text>
                      <div><Text type="secondary" style={{ fontSize: 12 }}>{formatDate(o.created_at)}</Text></div>
                      {o.customer_name && (
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {o.customer_name}
                            {o.customer_phone && <> · <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a></>}
                          </Text>
                        </div>
                      )}
                      {o.customer_address && (
                        <div style={{ marginTop: 2 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            📍 {o.customer_address.label}: {o.customer_address.line1}
                            {o.customer_address.line2 ? `, ${o.customer_address.line2}` : ""}
                            {o.customer_address.city ? `, ${o.customer_address.city}` : ""}
                            {o.customer_address.pincode ? ` - ${o.customer_address.pincode}` : ""}
                          </Text>
                        </div>
                      )}
                    </div>
                    <Select
                      value={o.status}
                      onChange={(val) => updateStatus(o.id, val)}
                      style={{ width: 140 }}
                      options={ORDER_STATUSES.map((s) => ({ value: s, label: <Tag color={STATUS_COLORS[s]}>{s}</Tag> }))}
                    />
                  </div>
                  <ul style={{ marginTop: 8, marginBottom: 8, paddingLeft: 18, fontSize: 13, color: "#374151" }}>
                    {o.items.map((it) => (
                      <li key={it.id}>{it.product_name_snapshot} — {it.quantity} {it.unit_type_snapshot}</li>
                    ))}
                  </ul>
                  <Space>
                    <Link to={`/invoice/${o.id}`}><Button size="small">View Bill</Button></Link>
                    {o.customer_phone && (
                      <Button size="small" icon={<WhatsAppOutlined />} onClick={() => notifyCustomerOnWhatsApp(o)}>
                        Notify Customer
                      </Button>
                    )}
                  </Space>
                </Card>
              ))}
            </>
          )}

          {tab === "inventory" && (
            <>
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: 12, maxWidth: 320 }}
              />
              <Table
                dataSource={filteredProducts}
                columns={inventoryColumns}
                rowKey="id"
                pagination={{ pageSize: 15 }}
              />
            </>
          )}

          {tab === "add" && (
            <Card style={{ maxWidth: 480 }}>
              <div style={{ marginBottom: 16 }}>
                <Button
                  icon={<ScanOutlined />}
                  loading={lookingUpBarcode}
                  onClick={() => setAddScannerOpen(true)}
                  block
                >
                  📷 Scan to Add (branded product)
                </Button>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                  Scan the barcode already printed on a packaged product (e.g. a biscuit packet) —
                  every unit of that same product shares the same barcode, so you only scan once per
                  item ever. We'll try to auto-fill the name; you set the price. For loose/unbranded
                  items without a barcode, just fill the form below and use Print Labels afterwards.
                </Text>
              </div>

              {addScannerOpen && (
                <BarcodeScanner onScan={handleAddScan} onClose={() => setAddScannerOpen(false)} requireConfirmation />
              )}

              <Form form={addForm} layout="vertical" onFinish={addProduct}>
                <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                  <Input placeholder="e.g. Basmati Rice" />
                </Form.Item>
                <Form.Item name="unit_type" label="Unit" rules={[{ required: true }]} initialValue="kg">
                  <AutoComplete
                    options={COMMON_UNITS.map((u) => ({ value: u }))}
                    filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
                  >
                    <Input placeholder="kg, piece, litre..." />
                  </AutoComplete>
                </Form.Item>
                <Form.Item name="price" label="Price" rules={[{ required: true }]}>
                  <Input type="number" step="0.01" prefix="₹" />
                </Form.Item>
                <Form.Item name="category" label="Category (optional)">
                  <Input />
                </Form.Item>
                <Form.Item name="image_url" label="Image URL (optional)">
                  <Input />
                </Form.Item>
                <Form.Item name="barcode" label="Barcode (optional)">
                  <Input placeholder="Scanned automatically, or leave blank to auto-generate one for printing" />
                </Form.Item>
                <Button type="primary" className="dash-gradient-btn" htmlType="submit">Add Product</Button>
              </Form>
            </Card>
          )}

          {tab === "import" && (
            <Card style={{ maxWidth: 480 }}>
              <Text type="secondary">
                Upload a spreadsheet with columns like Name, Category, Unit, Price, Image_URL.
                Existing items are matched by name+unit and updated automatically.
              </Text>
              <div style={{ marginTop: 16 }}>
                <Upload beforeUpload={handleImport} showUploadList={false} accept=".csv,.xlsx,.xls">
                  <Button icon={<UploadOutlined />} loading={importing}>Upload CSV/Excel</Button>
                </Upload>
              </div>
              {importResult && (
                <div style={{ marginTop: 12 }}>
                  <Tag color="green">Created: {importResult.created}</Tag>
                  <Tag color="blue">Updated: {importResult.updated}</Tag>
                  {importResult.errors?.length > 0 && <Tag color="red">Errors: {importResult.errors.length}</Tag>}
                </div>
              )}
            </Card>
          )}

          {tab === "customers" && (
            <>
              <Input
                placeholder="Search by name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ marginBottom: 12, maxWidth: 320 }}
                allowClear
              />
              <Table
                dataSource={customers.filter((c) => {
                  const q = customerSearch.trim().toLowerCase();
                  return !q || c.name.toLowerCase().includes(q) || (c.phone && c.phone.includes(q));
                })}
                columns={customerColumns}
                rowKey="id"
                pagination={{ pageSize: 15 }}
                locale={{ emptyText: <Empty description="No customers yet. Share your signup link to invite them." /> }}
              />
            </>
          )}
        </div>
      </Content>

      <Modal
        title={`Reset password for ${customerResetTarget?.name || ""}`}
        open={!!customerResetTarget}
        onCancel={() => setCustomerResetTarget(null)}
        onOk={submitCustomerPasswordReset}
        okText="Reset Password"
        confirmLoading={resettingCustomer}
      >
        <Text type="secondary">
          Set a new password for this customer. Let them know it directly — there's no automatic notification.
        </Text>
        <Input.Password
          placeholder="New password"
          value={customerNewPassword}
          onChange={(e) => setCustomerNewPassword(e.target.value)}
          style={{ marginTop: 12 }}
        />
      </Modal>

      <Modal
        title={`Edit ${editProductTarget?.name || "Product"}`}
        open={!!editProductTarget}
        onCancel={() => setEditProductTarget(null)}
        onOk={() => editForm.submit()}
        okText="Save Changes"
        confirmLoading={savingEditProduct}
      >
        <Form form={editForm} layout="vertical" onFinish={saveEditProduct}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Basmati Rice" />
          </Form.Item>
          <Form.Item name="unit_type" label="Unit" rules={[{ required: true }]}>
            <AutoComplete
              options={COMMON_UNITS.map((u) => ({ value: u }))}
              filterOption={(input, option) => option.value.toLowerCase().includes(input.toLowerCase())}
            >
              <Input placeholder="kg, piece, litre..." />
            </AutoComplete>
          </Form.Item>
          <Form.Item name="price" label="Price" rules={[{ required: true }]}>
            <Input type="number" step="0.01" prefix="₹" />
          </Form.Item>
          <Form.Item name="category" label="Category (optional)">
            <Input />
          </Form.Item>
          <Form.Item name="image_url" label="Image URL (optional)">
            <Input />
          </Form.Item>
          <Form.Item name="barcode" label="Barcode (optional)">
            <Input placeholder="Leave as-is unless you need to fix a scan or correct a typo" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

function NoBusinessYet({ onCreated, approvalStatus }) {
  const [form] = Form.useForm();
  const [error, setError] = useState("");

  const createBusiness = async (values) => {
    setError("");
    try {
      await api.post("/businesses", values);
      await onCreated();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not create business");
    }
  };

  if (approvalStatus === "pending") {
    return (
      <Card style={{ maxWidth: 480, margin: "40px auto" }}>
        <Title level={4}>⏳ Pending Approval</Title>
        <Text type="secondary">
          Thanks for registering with Cartbi! Your shop registration is currently
          under review. You'll be able to set up your business as soon as Cartbi approves your account.
        </Text>
      </Card>
    );
  }

  if (approvalStatus === "rejected") {
    return (
      <Card style={{ maxWidth: 480, margin: "40px auto" }}>
        <Title level={4}>Registration Not Approved</Title>
        <Text type="secondary">
          Your shop registration was not approved. Please contact Cartbi support if you believe this is a mistake.
        </Text>
      </Card>
    );
  }

  return (
    <Card style={{ maxWidth: 480, margin: "40px auto" }} title="Create your business first">
      {error && <Text type="danger">{error}</Text>}
      <Form form={form} layout="vertical" onFinish={createBusiness} initialValues={{ type: "provision" }}>
        <Form.Item name="name" label="Business name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="type" label="Type">
          <Select options={[
            { value: "provision", label: "Provision Store" },
            { value: "pharmacy", label: "Pharmacy" },
            { value: "laundry", label: "Laundry" },
            { value: "other", label: "Other" },
          ]} />
        </Form.Item>
        <Button type="primary" className="dash-gradient-btn" htmlType="submit">Create Business</Button>
      </Form>
    </Card>
  );
}
