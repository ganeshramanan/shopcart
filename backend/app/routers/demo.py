from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, create_access_token
from app import models, schemas

router = APIRouter(prefix="/demo", tags=["demo"])

# Fixed identifiers so this is idempotent — calling it repeatedly (every
# "Try Demo" click) finds and reuses the same demo business/customer
# instead of creating duplicates. The phone number is deliberately
# unrealistic (never collides with a real signup) and the business name
# is distinct enough to never be confused with a real pilot shop.
DEMO_BUSINESS_NAME = "Cartbi Demo Store"
DEMO_CUSTOMER_PHONE = "0000000001"
DEMO_CUSTOMER_PASSWORD = "demo1234"  # not secret — this is a public demo account by design

DEMO_PRODUCTS = [
    # (name, unit_type, price, category, image_url)
    ("Basmati Rice", "kg", 120, "Grains & Rice", "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=300"),
    ("Toor Dal", "kg", 140, "Pulses & Dals", "https://images.unsplash.com/photo-1612257999691-72f5698735c7?w=300"),
    ("Sunflower Oil", "litre", 140, "Cooking Oil", "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=300"),
    ("Turmeric Powder", "kg", 180, "Spices & Masala", "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=300"),
    ("Milk", "litre", 60, "Dairy", "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=300"),
    ("Bread (Brown)", "pack", 45, "Bakery", "https://images.unsplash.com/photo-1549931319-a545177afb13?w=300"),
    ("Banana", "kg", 50, "Fruits", "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=300"),
    ("Tomato", "kg", 40, "Vegetables", "https://images.unsplash.com/photo-1546470427-e5ac89cd0b31?w=300"),
    ("Tea Powder", "kg", 420, "Beverages", "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=300"),
    ("Biscuits (Glucose)", "pack", 20, "Snacks", "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300"),
]


def _ensure_demo_data(db: Session):
    """Creates the demo business + sample catalog on first use, and tops
    up any missing sample products on later calls (e.g. if the list above
    grows). Fully idempotent — safe to call on every /demo/start request."""
    business = db.query(models.Business).filter(models.Business.name == DEMO_BUSINESS_NAME).first()
    if not business:
        business = models.Business(
            name=DEMO_BUSINESS_NAME,
            type="provision",
            contact_phone="9999999999",
        )
        db.add(business)
        db.flush()

    existing_names = {
        p.name for p in db.query(models.Product).filter(models.Product.business_id == business.id).all()
    }
    for name, unit_type, price, category, image_url in DEMO_PRODUCTS:
        if name in existing_names:
            continue
        db.add(models.Product(
            business_id=business.id,
            name=name,
            unit_type=unit_type,
            price=price,
            category=category,
            image_url=image_url,
        ))

    db.commit()
    db.refresh(business)
    return business


def _ensure_demo_customer(db: Session, business_id: str):
    """Same fixed demo customer every time, bound to the demo shop."""
    customer = db.query(models.User).filter(models.User.phone == DEMO_CUSTOMER_PHONE).first()
    if not customer:
        customer = models.User(
            name="Demo Customer",
            phone=DEMO_CUSTOMER_PHONE,
            password_hash=hash_password(DEMO_CUSTOMER_PASSWORD),
            role=models.RoleEnum.customer,
            business_id=business_id,
        )
        db.add(customer)
        db.commit()
        db.refresh(customer)
    elif not customer.business_id:
        customer.business_id = business_id
        db.commit()
        db.refresh(customer)
    return customer


@router.post("/start", response_model=schemas.Token)
def start_demo(db: Session = Depends(get_db)):
    """One-click 'Try Demo' entry point from the Landing page. Seeds (or
    reuses) a fixed demo shop with a sample catalog and logs straight into
    a fixed demo customer account bound to it — no signup form, no real
    phone number needed. Safe to call repeatedly; never creates
    duplicates. This is a real account, so demo orders are real rows in
    the DB — harmless, since nothing here is a real shop/customer."""
    business = _ensure_demo_data(db)
    customer = _ensure_demo_customer(db, business.id)

    token = create_access_token({"sub": customer.id, "role": customer.role})
    return schemas.Token(access_token=token, user=customer)
