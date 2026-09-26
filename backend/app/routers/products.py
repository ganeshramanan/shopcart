from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import models, schemas
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/products", tags=["products"])


def _ensure_owns_business(user: models.User, business_id: str):
    if user.role == "admin":
        return
    if user.role != "shop_owner" or str(user.business_id) != str(business_id):
        raise HTTPException(status_code=403, detail="Not authorized for this business")


@router.get("", response_model=list[schemas.ProductOut])
def list_products(business_id: str, db: Session = Depends(get_db)):
    """Customer-facing catalog for a given shop — only active products."""
    return (
        db.query(models.Product)
        .filter(models.Product.business_id == business_id, models.Product.is_active == True)  # noqa: E712
        .order_by(models.Product.name)
        .all()
    )


@router.post("", response_model=schemas.ProductOut)
def create_product(
    business_id: str,
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    _ensure_owns_business(user, business_id)
    product = models.Product(business_id=business_id, **payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: str,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _ensure_owns_business(user, product.business_id)

    data = payload.model_dump(exclude_unset=True)

    # Track price change history automatically
    if "price" in data and data["price"] != product.price:
        db.add(models.PriceHistory(
            product_id=product.id, old_price=product.price, new_price=data["price"]
        ))

    for field, value in data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}")
def delete_product(
    product_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    """Soft delete — keeps history of past orders intact."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    _ensure_owns_business(user, product.business_id)

    product.is_active = False
    db.commit()
    return {"detail": "Product deactivated"}
