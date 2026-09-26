import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Boolean, ForeignKey, DateTime, Enum, Integer, Text
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class RoleEnum(str, enum.Enum):
    admin = "admin"          # platform owner (you)
    shop_owner = "shop_owner"
    customer = "customer"


class OrderStatusEnum(str, enum.Enum):
    placed = "placed"
    confirmed = "confirmed"
    packing = "packing"
    ready = "ready"
    dispatched = "dispatched"
    delivered = "delivered"
    cancelled = "cancelled"


class Business(Base):
    __tablename__ = "businesses"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    type = Column(String, nullable=False)  # provision, pharmacy, laundry, etc.
    contact_phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    users = relationship("User", back_populates="business")
    orders = relationship("Order", back_populates="business")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.customer)
    business_id = Column(UUID(as_uuid=False), ForeignKey("businesses.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="users")
    orders = relationship("Order", back_populates="customer")


class Product(Base):
    __tablename__ = "products"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    business_id = Column(UUID(as_uuid=False), ForeignKey("businesses.id"), nullable=False, index=True)
    name = Column(String, nullable=False)
    unit_type = Column(String, nullable=False)  # kg, piece, litre, load, strip, etc.
    price = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    image_url = Column(String, nullable=True)
    category = Column(String, nullable=True, index=True)
    attributes = Column(JSONB, nullable=True, default=dict)  # flexible per-vertical fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="products")
    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")


class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=False, index=True)
    old_price = Column(Float, nullable=False)
    new_price = Column(Float, nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="price_history")


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    business_id = Column(UUID(as_uuid=False), ForeignKey("businesses.id"), nullable=False, index=True)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    status = Column(Enum(OrderStatusEnum), nullable=False, default=OrderStatusEnum.placed)
    total_amount = Column(Float, nullable=False, default=0)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="orders")
    customer = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(UUID(as_uuid=False), ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=False)
    product_name_snapshot = Column(String, nullable=False)  # in case product later renamed/deleted
    unit_type_snapshot = Column(String, nullable=False)
    quantity = Column(Float, nullable=False)
    unit_price_snapshot = Column(Float, nullable=False)  # price locked at order time
    line_total = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")
