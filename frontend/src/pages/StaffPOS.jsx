import { useEffect, useState } from "react";
import api from "../api";
import { useAuth } from "../auth/AuthContext.jsx";
import NewSale from "./NewSale.jsx";

export default function StaffPOS() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    if (user?.business_id) {
      api.get(`/products?business_id=${user.business_id}`).then((res) => setProducts(res.data));
    }
  }, [user?.business_id]);

  return (
    <div>
      <h2>🧾 New Sale</h2>
      <p className="dashboard-subtitle">Billing counter — search or scan a product to add it, then generate the bill.</p>
      <NewSale products={products} businessId={user?.business_id} />
    </div>
  );
}
