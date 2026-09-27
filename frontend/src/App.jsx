import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { Layout, Menu, Button, Space, Typography } from "antd";
import { ShoppingOutlined, SettingOutlined, LogoutOutlined } from "@ant-design/icons";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import BusinessList from "./pages/BusinessList.jsx";
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

function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isBoundCustomer = user?.role === "customer" && user?.business_id;
  const isShopOwner = user?.role === "shop_owner";
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "staff";

  const navItems = [];
  if (isAdmin) navItems.push({ key: "/admin", label: <Link to="/admin">Platform Overview</Link> });
  if (isShopOwner) {
    navItems.push({ key: "/dashboard", label: <Link to="/dashboard">Dashboard</Link> });
    if (user.business_id) navItems.push({ key: `/shop/${user.business_id}`, label: <Link to={`/shop/${user.business_id}`}>Preview My Shop</Link> });
  }
  if (isStaff) navItems.push({ key: "/pos", label: <Link to="/pos">New Sale</Link> });
  if (isBoundCustomer) {
    navItems.push({ key: `/shop/${user.business_id}`, label: <Link to={`/shop/${user.business_id}`}>Catalog</Link> });
    navItems.push({ key: "/orders", label: <Link to="/orders">My Orders</Link> });
    navItems.push({ key: "/favorites", label: <Link to="/favorites">Favorites</Link> });
    navItems.push({ key: "/addresses", label: <Link to="/addresses">Addresses</Link> });
  }
  if (!user) navItems.push({ key: "/", label: <Link to="/">Shops</Link> });
  if (user && !isShopOwner && !isBoundCustomer && !isAdmin && !isStaff) {
    navItems.push({ key: "/", label: <Link to="/">Shops</Link> });
    navItems.push({ key: "/orders", label: <Link to="/orders">My Orders</Link> });
    navItems.push({ key: "/favorites", label: <Link to="/favorites">Favorites</Link> });
    navItems.push({ key: "/addresses", label: <Link to="/addresses">Addresses</Link> });
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
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff" }}>
          {isAdmin ? <SettingOutlined style={{ fontSize: 20 }} /> : <ShoppingOutlined style={{ fontSize: 20 }} />}
          <Text strong style={{ color: "#fff", fontSize: 17 }}>{isAdmin ? "Cartbi" : "ShopCart"}</Text>
        </Link>
        <Menu
          theme="dark"
          mode="horizontal"
          items={navItems}
          style={{ background: "transparent", borderBottom: "none", minWidth: 300 }}
          selectedKeys={[]}
        />
      </div>
      <div>
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
  return <BusinessList />;
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
