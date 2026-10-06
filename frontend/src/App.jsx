import { Routes, Route, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { Layout, Button, Typography } from "antd";
import {
  ShoppingOutlined, SettingOutlined, LogoutOutlined, ShopOutlined,
  UnorderedListOutlined, HeartOutlined, HomeOutlined as PinOutlined,
  DashboardOutlined, EyeOutlined, ShoppingCartOutlined,
} from "@ant-design/icons";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import BusinessList from "./pages/BusinessList.jsx";
import Landing from "./pages/Landing.jsx";
import Catalog from "./pages/Catalog.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import Favorites from "./pages/Favorites.jsx";
import AddressBook from "./pages/AddressBook.jsx";
import ShopDashboard from "./pages/ShopDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Invoice from "./pages/Invoice.jsx";
import StaffPOS from "./pages/StaffPOS.jsx";

const { Header, Content } = Layout;
const { Text } = Typography;

// Plain always-visible nav links, deliberately NOT using Ant Design's
// horizontal <Menu> — Menu auto-collapses low-priority items into a
// hidden "..." overflow dropdown once it runs out of horizontal space,
// which silently buried Favorites/Addresses behind an easy-to-miss
// affordance during testing. A flex row of icon+label buttons has no
// such overflow behavior — every link stays visible (icon-only on very
// narrow screens via CSS, but never hidden in a dropdown).
function NavLink({ to, icon, label, active }) {
  return (
    <Link to={to} className={`topnav-link ${active ? "topnav-link-active" : ""}`}>
      {icon}
      <span className="topnav-link-label">{label}</span>
    </Link>
  );
}

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isBoundCustomer = user?.role === "customer" && user?.business_id;
  const isShopOwner = user?.role === "shop_owner";
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";
  const isPlainCustomer = user && !isShopOwner && !isBoundCustomer && !isAdmin && !isStaff;

  const isActive = (path) => location.pathname === path;

  const navLinks = [];
  if (isAdmin) {
    navLinks.push({ to: "/admin", icon: <SettingOutlined />, label: "Platform Overview" });
  }
  if (isShopOwner) {
    navLinks.push({ to: "/dashboard", icon: <DashboardOutlined />, label: "Dashboard" });
    if (user.business_id) navLinks.push({ to: `/shop/${user.business_id}`, icon: <EyeOutlined />, label: "Preview My Shop" });
  }
  if (isStaff) {
    navLinks.push({ to: "/pos", icon: <ShoppingCartOutlined />, label: "New Sale" });
  }
  if (isBoundCustomer) {
    navLinks.push({ to: `/shop/${user.business_id}`, icon: <ShopOutlined />, label: "Catalog" });
  }
  if (!user || isPlainCustomer) {
    navLinks.push({ to: "/", icon: <ShopOutlined />, label: "Shops" });
  }
  if (isBoundCustomer || isPlainCustomer) {
    navLinks.push({ to: "/orders", icon: <UnorderedListOutlined />, label: "My Orders" });
    navLinks.push({ to: "/favorites", icon: <HeartOutlined />, label: "Favorites" });
    navLinks.push({ to: "/addresses", icon: <PinOutlined />, label: "Addresses" });
  }

  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: isAdmin ? "#1e1b4b" : "#111827",
        padding: "0 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20, minWidth: 0, flex: 1 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", flexShrink: 0 }}>
          <ShoppingOutlined style={{ fontSize: 20 }} />
          <Text strong style={{ color: "#fff", fontSize: 17 }}>Cartbi</Text>
        </Link>
        <nav className="topnav-links">
          {navLinks.map((link) => (
            <NavLink key={link.to + link.label} to={link.to} icon={link.icon} label={link.label} active={isActive(link.to)} />
          ))}
        </nav>
      </div>
      <div style={{ flexShrink: 0 }}>
        {user ? (
          <Button icon={<LogoutOutlined />} onClick={() => { logout(); navigate("/login"); }}>
            Logout ({user.name})
          </Button>
        ) : (
          <Link to="/login"><Button type="primary">Login</Button></Link>
        )}
      </div>
    </Header>
  );
}

function Protected({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
}

function HomeRoute() {
  const { user } = useAuth();
  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (user?.role === "staff") return <Navigate to="/pos" replace />;
  if (user?.role === "customer" && user?.business_id) {
    return <Navigate to={`/shop/${user.business_id}`} replace />;
  }
  if (user?.role === "shop_owner") {
    return <Navigate to="/dashboard" replace />;
  }
  // Logged-in customer with no shop yet (e.g. registered but hasn't picked
  // one) — skip the marketing landing page, go straight to the shop
  // directory so they can pick one.
  if (user) return <BusinessList />;
  return <Landing />;
}

export default function App() {
  return (
    <AuthProvider>
      <Layout style={{ minHeight: "100vh", background: "#f6f7f9" }}>
        <TopBar />
        <Content style={{ maxWidth: 1240, margin: "0 auto", padding: 20, width: "100%" }}>
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/shop/:businessId" element={<Catalog />} />
            <Route path="/orders" element={<Protected><MyOrders /></Protected>} />
            <Route path="/favorites" element={<Protected><Favorites /></Protected>} />
            <Route path="/addresses" element={<Protected><AddressBook /></Protected>} />
            <Route path="/dashboard" element={<Protected role="shop_owner"><ShopDashboard /></Protected>} />
            <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
            <Route path="/pos" element={<Protected role="staff"><StaffPOS /></Protected>} />
            <Route path="/invoice/:orderId" element={<Protected><Invoice /></Protected>} />
          </Routes>
        </Content>
      </Layout>
    </AuthProvider>
  );
}
