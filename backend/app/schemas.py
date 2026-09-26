from datetime import datetime
from typing import Optional, Any

from pydantic import BaseModel, ConfigDict


# ---------- Auth ----------
class UserSignup(BaseModel):
    name: str
    phone: str
    password: str
    role: str = "customer"  # customer | shop_owner
    business_id: Optional[str] = None


class UserLogin(BaseModel):
    phone: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    phone: str
    role: str
    business_id: Optional[str] = None
    is_active: bool = True
    approval_status: str = "approved"


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------- Business ----------
class BusinessCreate(BaseModel):
    name: str
    type: str
    contact_phone: Optional[str] = None
    address: Optional[str] = None


class BusinessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    type: str
    contact_phone: Optional[str] = None
    address: Optional[str] = None


# ---------- Product ----------
class ProductCreate(BaseModel):
    name: str
    unit_type: str
    price: float
    image_url: Optional[str] = None
    category: Optional[str] = None
    attributes: Optional[dict[str, Any]] = {}


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    unit_type: Optional[str] = None
    price: Optional[float] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    attributes: Optional[dict[str, Any]] = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    business_id: str
    name: str
    unit_type: str
    price: float
    is_active: bool
    image_url: Optional[str] = None
    category: Optional[str] = None
    attributes: Optional[dict[str, Any]] = {}


# ---------- Order ----------
class OrderItemCreate(BaseModel):
    product_id: str
    quantity: float


class OrderCreate(BaseModel):
    business_id: str
    items: list[OrderItemCreate]
    notes: Optional[str] = None


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: str
    product_name_snapshot: str
    unit_type_snapshot: str
    quantity: float
    unit_price_snapshot: float
    line_total: float


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    business_id: str
    customer_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    status: str
    total_amount: float
    notes: Optional[str] = None
    created_at: datetime
    items: list[OrderItemOut] = []


class OrderStatusUpdate(BaseModel):
    status: str
