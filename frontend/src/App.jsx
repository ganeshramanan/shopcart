import { Routes, Route, Navigate, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext.jsx";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";
import BusinessList from "./pages/BusinessList.jsx";
import Catalog from "./pages/Catalog.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import ShopDashboard from "./pages/ShopDashboard.jsx";

function TopBar() {
  const { user, logout } = useAuth();
  const isBoundCustomer = user?.role === "customer" && user?.business_id;

  return (
    <div className="topbar">
      <div>
        {!isBoundCustomer && <Link to="/">Shops</Link>}
        {isBoundCustomer && <Link to={`/shop/${user.business_id}`}>Catalog</Link>}
        {user && <Link to="/orders">My Orders</Link>}
        {user?.role === "shop_owner" && <Link to="/dashboard">Dashboard</Link>}
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

function Protected({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return children;
}

function HomeRoute() {
  const { user } = useAuth();
  // A customer bound to a single shop never sees the multi-shop browse list —
  // they're taken straight to their shop's catalog.
  if (user?.role === "customer" && user?.business_id) {
    return <Navigate to={`/shop/${user.business_id}`} replace />;
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
        </Routes>
      </div>
    </AuthProvider>
  );
}
