import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, Boolean, ForeignKey, DateTime, Enum, Integer, Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship

from app.core.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class ApprovalStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class RoleEnum(str, enum.Enum):
    admin = "admin"          # platform owner (you)
    shop_owner = "shop_owner"
    staff = "staff"           # limited-privilege POS-only account, managed by shop_owner
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
    logo_url = Column(String, nullable=True)
    min_order_value = Column(Float, nullable=False, default=0)  # 0 = no minimum
    created_at = Column(DateTime, default=datetime.utcnow)

    products = relationship("Product", back_populates="business", cascade="all, delete-orphan")
    users = relationship("User", back_populates="business")
    orders = relationship("Order", back_populates="business", cascade="all, delete-orphan")


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    name = Column(String, nullable=False)
    phone = Column(String, unique=True, nullable=True, index=True)
    password_hash = Column(String, nullable=True)
    is_guest = Column(Boolean, default=False, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.customer)
    business_id = Column(UUID(as_uuid=False), ForeignKey("businesses.id"), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    approval_status = Column(Enum(ApprovalStatusEnum), nullable=False, default=ApprovalStatusEnum.approved)
    can_view_orders = Column(Boolean, default=False, nullable=False)      # staff-only permission
    can_share_signup_link = Column(Boolean, default=False, nullable=False)  # staff-only permission
    created_at = Column(DateTime, default=datetime.utcnow)

    business = relationship("Business", back_populates="users")
    orders = relationship("Order", back_populates="customer")
    addresses = relationship("Address", back_populates="customer", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="customer", cascade="all, delete-orphan")


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
    barcode = Column(String, nullable=True, index=True)  # unique per shop, not globally — see UniqueConstraint below
    attributes = Column(JSONB, nullable=True, default=dict)  # flexible per-vertical fields
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    business = relationship("Business", back_populates="products")
    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")

    __table_args__ = (
        # Barcode only needs to be unique WITHIN a shop, not globally.
        # Real manufacturer barcodes (e.g. a Britannia biscuit's EAN) are
        # identical across every shop that stocks that product — a global
        # unique constraint would make it impossible for a second shop to
        # ever add the same branded product. Internal auto-generated
        # barcodes remain effectively unique in practice since they're
        # randomly generated per shop anyway.
        UniqueConstraint("business_id", "barcode", name="uq_product_business_barcode"),
    )


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

    @property
    def customer_name(self):
        return self.customer.name if self.customer else None

    @property
    def customer_phone(self):
        return self.customer.phone if self.customer else None

    @property
    def customer_address(self):
        """Customer's currently-saved default delivery address, if any.
        Not snapshotted at order time (unlike price) — shows their latest
        saved address so shop owner/staff always see where to actually
        deliver right now. If the customer never saved one, or has
        several with none marked default, falls back to the most
        recently added address."""
        if not self.customer or not self.customer.addresses:
            return None
        addresses = self.customer.addresses
        default = next((a for a in addresses if a.is_default), None)
        return default or addresses[0]


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


class Address(Base):
    """Customer's saved delivery addresses — a customer can have several
    (home, work, etc.) and pick one at checkout. Brand new table, so it's
    created automatically by Base.metadata.create_all() on next deploy —
    no manual Neon migration needed."""
    __tablename__ = "addresses"

    id = Column(UUID(as_uuid=False), primary_key=True, default=gen_uuid)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    label = Column(String, nullable=False, default="Home")  # Home, Work, Other...
    line1 = Column(String, nullable=False)
    line2 = Column(String, nullable=True)
    city = Column(String, nullable=True)
    pincode = Column(String, nullable=True)
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("User", back_populates="addresses")


class Favorite(Base):
    """A customer starring a product for quick access later. Brand new
    table — no manual Neon migration needed, create_all() handles it."""
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    product_id = Column(UUID(as_uuid=False), ForeignKey("products.id"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("User", back_populates="favorites")
    product = relationship("Product")
