import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { List, Card, Tag, Typography, Empty } from "antd";
import { RightOutlined } from "@ant-design/icons";
import api from "../api";

const { Title } = Typography;

export default function BusinessList() {
  const [businesses, setBusinesses] = useState([]);

  useEffect(() => {
    api.get("/businesses").then((res) => setBusinesses(res.data));
  }, []);

  return (
    <div>
      <Title level={3}>Shops</Title>
      {businesses.length === 0 && <Empty description="No shops yet. Ask a shop owner to sign up and create one." />}
      <List
        dataSource={businesses}
        renderItem={(b) => (
          <Link to={`/shop/${b.id}`}>
            <Card style={{ marginBottom: 12 }} hoverable>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{b.name}</strong>
                  <div><Tag>{b.type}</Tag></div>
                </div>
                <RightOutlined />
              </div>
            </Card>
          </Link>
        )}
      />
    </div>
  );
}
