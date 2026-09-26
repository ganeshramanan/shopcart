from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import models, schemas
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/businesses", tags=["businesses"])


@router.post("", response_model=schemas.BusinessOut)
def create_business(
    payload: schemas.BusinessCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    """Create a new business (a new 'tenant' — provision shop, pharmacy, laundry, etc.).
    If the creator is a shop_owner with no business yet, auto-link them as its owner."""
    if user.role == "shop_owner" and user.approval_status != models.ApprovalStatusEnum.approved:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=403,
            detail="Your shop registration is pending Cartbi's approval. You'll be able to create your business once approved.",
        )

    biz = models.Business(**payload.model_dump())
    db.add(biz)
    db.flush()

    if user.role == "shop_owner" and not user.business_id:
        user.business_id = biz.id

    db.commit()
    db.refresh(biz)
    return biz


@router.get("", response_model=list[schemas.BusinessOut])
def list_businesses(db: Session = Depends(get_db)):
    """Public list — customers browse available shops (like Zepto's store list)."""
    return db.query(models.Business).all()


@router.get("/{business_id}", response_model=schemas.BusinessOut)
def get_business(business_id: str, db: Session = Depends(get_db)):
    biz = db.query(models.Business).filter(models.Business.id == business_id).first()
    if not biz:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Business not found")
    return biz


@router.delete("/{business_id}")
def delete_business(    business_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    """Admin/owner cleanup tool — deletes a business and its products/orders (cascades)."""
    biz = db.query(models.Business).filter(models.Business.id == business_id).first()
    if not biz:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Business not found")
    if user.role == "shop_owner" and str(user.business_id) != str(business_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized")

    # Unlink any users pointing at this business (don't delete user accounts)
    db.query(models.User).filter(models.User.business_id == business_id).update({"business_id": None})

    db.delete(biz)
    db.commit()
    return {"detail": "Business deleted"}


@router.get("/{business_id}/customers")
def list_customers(
    business_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    """List everyone who has ordered from this shop — both registered
    customers (signed up via the shop's link) and walk-in/guest customers
    captured at POS billing. Walk-ins are flagged via is_guest so the
    frontend can label them, and their phone is included so the shop owner
    can search/recognize repeat walk-in customers too."""
    if user.role == "shop_owner" and str(user.business_id) != str(business_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Not authorized")

    customers = (
        db.query(models.User)
        .filter(
            models.User.business_id == business_id,
            models.User.role == "customer",
        )
        .all()
    )
    result = []
    for c in customers:
        orders = db.query(models.Order).filter(models.Order.customer_id == c.id).all()
        # Skip guest customers with zero orders and no phone — these are
        # noise (e.g. a walk-in sale that failed after the guest record was
        # created) rather than a real customer worth showing.
        if c.is_guest and not orders and not c.phone:
            continue
        result.append({
            "id": c.id,
            "name": c.name,
            "phone": c.phone,
            "is_guest": c.is_guest,
            "created_at": c.created_at,
            "order_count": len(orders),
            "total_spent": round(sum(o.total_amount for o in orders), 2),
        })
    return result


@router.delete("/{business_id}/customers/{customer_id}")
def remove_customer(
    business_id: str,
    customer_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    """Unlink a customer from this shop (soft removal). Their account and past
    order history are preserved — they just can no longer see/order from this
    shop unless re-invited via a fresh signup link."""
    from fastapi import HTTPException
    if user.role == "shop_owner" and str(user.business_id) != str(business_id):
        raise HTTPException(status_code=403, detail="Not authorized")

    customer = (
        db.query(models.User)
        .filter(models.User.id == customer_id, models.User.business_id == business_id)
        .first()
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found for this shop")

    customer.business_id = None
    db.commit()
    return {"detail": "Customer removed from shop"}
