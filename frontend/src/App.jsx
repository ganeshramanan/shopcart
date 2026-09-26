import { Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import BusinessList from "./pages/BusinessList.jsx";
import Catalog from "./pages/Catalog.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import ShopDashboard from "./pages/ShopDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

function TopBar() {
  const { user, logout } = useAuth();
  const isBoundCustomer = user?.role === "customer" && user?.business_id;
  const isShopOwner = user?.role === "shop_owner";
  const isAdmin = user?.role === "admin";

  return (
    <div className={isAdmin ? "topbar topbar-admin" : "topbar"}>
      <div className="topbar-left">
        <Link to="/" className="brand">
          {isAdmin ? (
            <>
              <span className="brand-mark">⚙️</span>
              <span className="brand-name">Cartbi</span>
            </>
          ) : (
            <>
              <span className="brand-mark">🛒</span>
              <span className="brand-name">ShopCart</span>
            </>
          )}
        </Link>
        <nav className="topbar-links">
          {isAdmin && <Link to="/admin">Platform Overview</Link>}
          {isShopOwner && (
            <>
              <Link to="/dashboard">Dashboard</Link>
              {user.business_id && <Link to={`/shop/${user.business_id}`}>Preview My Shop</Link>}
            </>
          )}
          {isBoundCustomer && (
            <>
              <Link to={`/shop/${user.business_id}`}>Catalog</Link>
              <Link to="/orders">My Orders</Link>
            </>
          )}
          {!user && <Link to="/">Shops</Link>}
          {user && !isShopOwner && !isBoundCustomer && !isAdmin && (
            <>
              <Link to="/">Shops</Link>
              <Link to="/orders">My Orders</Link>
            </>
          )}
        </nav>
      </div>
      <div>
        {user ? (
          <button className="secondary" onClick={logout}>Logout ({user.name})</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </div>
    </div>
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
      <TopBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<HomeRoute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/shop/:businessId" element={<Catalog />} />
          <Route path="/orders" element={<Protected><MyOrders /></Protected>} />
          <Route path="/dashboard" element={<Protected><ShopDashboard /></Protected>} />
          <Route path="/admin" element={<Protected role="admin"><AdminDashboard /></Protected>} />
        </Routes>
      </div>
    </AuthProvider>
  );
}
