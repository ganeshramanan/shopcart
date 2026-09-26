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
  return (
    <div className="topbar">
      <div>
        <Link to="/">Shops</Link>
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

export default function App() {
  return (
    <AuthProvider>
      <TopBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<BusinessList />} />
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
