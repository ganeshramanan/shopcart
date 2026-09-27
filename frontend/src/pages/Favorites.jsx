import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Typography, Empty, Button, Row, Col, Image, message, Popconfirm } from "antd";
import { HeartFilled, ShoppingOutlined } from "@ant-design/icons";
import api from "../api";

const { Title, Text } = Typography;

// Customer's starred products across all shops they've favorited from.
// Kept intentionally simple: view + remove + jump to that product's shop
// catalog to actually order it (no separate mini-cart here, to avoid
// duplicating Catalog.jsx's cart logic).
export default function Favorites() {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.get("/favorites").then((res) => setFavorites(res.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const removeFavorite = async (productId) => {
    await api.delete(`/favorites/${productId}`);
    message.success("Removed from favorites");
    load();
  };

  return (
    <div>
      <Title level={3} style={{ marginBottom: 0 }}>❤️ My Favorites</Title>
      <Text type="secondary">Products you've starred for quick access</Text>

      <div style={{ marginTop: 20 }}>
        {!loading && favorites.length === 0 && (
          <Empty description="No favorites yet — tap the heart on any product to save it here." style={{ marginTop: 40 }} />
        )}
        <Row gutter={[14, 14]}>
          {favorites.map((f) => (
            <Col key={f.id} xs={12} sm={8} md={6}>
              <Card
                className="catalog-product-card"
                size="small"
                cover={
                  <Image
                    src={f.product?.image_url || "https://placehold.co/300x300/CCCCCC/666666?text=No+Image"}
                    alt={f.product?.name}
                    height={140}
                    style={{ objectFit: "cover" }}
                    preview={false}
                  />
                }
              >
                <Text strong className="catalog-product-name">{f.product?.name || "Product removed"}</Text>
                {f.product && (
                  <div className="catalog-price-pill">₹{f.product.price} <span>/ {f.product.unit_type}</span></div>
                )}
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  {f.product && (
                    <Button
                      size="small"
                      className="catalog-add-btn"
                      icon={<ShoppingOutlined />}
                      style={{ flex: 1 }}
                      onClick={() => navigate(`/shop/${f.product.business_id}`)}
                    >
                      Go to Shop
                    </Button>
                  )}
                  <Popconfirm title="Remove from favorites?" onConfirm={() => removeFavorite(f.product_id)}>
                    <Button size="small" icon={<HeartFilled style={{ color: "#ef4444" }} />} />
                  </Popconfirm>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
}
