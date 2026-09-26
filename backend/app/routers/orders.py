from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app import models, schemas
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=schemas.OrderOut)
def create_order(
    payload: schemas.OrderCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    """Customer places an order. Prices are snapshotted from the live catalog
    at this exact moment — this is what prevents billing mismatches later
    even if the shop changes prices afterwards."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    order = models.Order(business_id=payload.business_id, customer_id=user.id, notes=payload.notes)
    db.add(order)
    db.flush()  # get order.id

    total = 0.0
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product or not product.is_active:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} unavailable")
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero")

        line_total = round(product.price * item.quantity, 2)
        total += line_total

        db.add(models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name_snapshot=product.name,
            unit_type_snapshot=product.unit_type,
            quantity=item.quantity,
            unit_price_snapshot=product.price,
            line_total=line_total,
        ))

    order.total_amount = round(total, 2)
    db.commit()
    db.refresh(order)
    return order


@router.get("", response_model=list[schemas.OrderOut])
def list_orders(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
    business_id: str | None = None,
):
    """Customers see their own orders; shop owners see all orders for their business."""
    q = db.query(models.Order).options(joinedload(models.Order.items), joinedload(models.Order.customer))
    if user.role == "customer":
        q = q.filter(models.Order.customer_id == user.id)
    elif user.role == "shop_owner":
        q = q.filter(models.Order.business_id == user.business_id)
    elif business_id:
        q = q.filter(models.Order.business_id == business_id)
    return q.order_by(models.Order.created_at.desc()).all()


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role == "customer" and order.customer_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    if user.role == "shop_owner" and str(order.business_id) != str(user.business_id):
        raise HTTPException(status_code=403, detail="Not authorized")
    return order


@router.patch("/{order_id}/status", response_model=schemas.OrderOut)
def update_order_status(
    order_id: str,
    payload: schemas.OrderStatusUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    """Shop owner moves the order through: placed -> confirmed -> packing -> ready -> dispatched -> delivered"""
    order = db.query(models.Order).options(joinedload(models.Order.items)).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if user.role == "shop_owner" and str(order.business_id) != str(user.business_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order


@router.post("/walk-in", response_model=schemas.OrderOut)
def create_walk_in_order(
    payload: schemas.WalkInOrderCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner", "staff")),
):
    """Shop owner OR staff creates a POS-style order for a walk-in customer
    who never used the app. If a phone is given and matches an existing
    customer of this shop, that account is reused; otherwise a lightweight
    guest record is created (no password, is_guest=True). Order defaults to
    'delivered' since it's an instant in-person transaction."""
    if not user.business_id:
        raise HTTPException(status_code=400, detail="You need a business set up first")
    if not payload.items:
        raise HTTPException(status_code=400, detail="Order must have at least one item")

    customer = None
    if payload.customer_phone:
        customer = (
            db.query(models.User)
            .filter(models.User.phone == payload.customer_phone, models.User.business_id == user.business_id)
            .first()
        )

    if not customer:
        customer = models.User(
            name=payload.customer_name or "Walk-in Customer",
            phone=payload.customer_phone,
            role=models.RoleEnum.customer,
            business_id=user.business_id,
            is_guest=True,
        )
        db.add(customer)
        db.flush()

    order = models.Order(
        business_id=user.business_id,
        customer_id=customer.id,
        notes=payload.notes,
        status=models.OrderStatusEnum.delivered,
    )
    db.add(order)
    db.flush()

    total = 0.0
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product or not product.is_active:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} unavailable")
        if item.quantity <= 0:
            raise HTTPException(status_code=400, detail="Quantity must be greater than zero")

        line_total = round(product.price * item.quantity, 2)
        total += line_total

        db.add(models.OrderItem(
            order_id=order.id,
            product_id=product.id,
            product_name_snapshot=product.name,
            unit_type_snapshot=product.unit_type,
            quantity=item.quantity,
            unit_price_snapshot=product.price,
            line_total=line_total,
        ))

    order.total_amount = round(total, 2)
    db.commit()
    db.refresh(order)
    return order
