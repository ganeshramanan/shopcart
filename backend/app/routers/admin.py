from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import models
from app.deps import require_role

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/shop-owners")
def list_shop_owners(db: Session = Depends(get_db), _admin: models.User = Depends(require_role("admin"))):
    """Super-admin only: list every shop owner across the whole platform,
    along with the business they own."""
    owners = db.query(models.User).filter(models.User.role == "shop_owner").all()
    result = []
    for o in owners:
        biz = db.query(models.Business).filter(models.Business.id == o.business_id).first() if o.business_id else None
        result.append({
            "id": o.id,
            "name": o.name,
            "phone": o.phone,
            "is_active": o.is_active,
            "approval_status": o.approval_status,
            "created_at": o.created_at,
            "business_id": o.business_id,
            "business_name": biz.name if biz else None,
            "business_type": biz.type if biz else None,
        })
    return result


@router.patch("/shop-owners/{owner_id}/approve")
def approve_shop_owner(
    owner_id: str,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_role("admin")),
):
    """Super-admin only: approve a pending shop owner so they can create their business."""
    owner = db.query(models.User).filter(models.User.id == owner_id, models.User.role == "shop_owner").first()
    if not owner:
        raise HTTPException(status_code=404, detail="Shop owner not found")
    owner.approval_status = models.ApprovalStatusEnum.approved
    db.commit()
    return {"detail": "Approved", "approval_status": owner.approval_status}


@router.patch("/shop-owners/{owner_id}/reject")
def reject_shop_owner(
    owner_id: str,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_role("admin")),
):
    """Super-admin only: reject a pending shop owner's registration."""
    owner = db.query(models.User).filter(models.User.id == owner_id, models.User.role == "shop_owner").first()
    if not owner:
        raise HTTPException(status_code=404, detail="Shop owner not found")
    owner.approval_status = models.ApprovalStatusEnum.rejected
    db.commit()
    return {"detail": "Rejected", "approval_status": owner.approval_status}


@router.patch("/shop-owners/{owner_id}/toggle-active")
def toggle_shop_owner_active(
    owner_id: str,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_role("admin")),
):
    """Super-admin only: enable/disable a shop owner's login access.
    Disabling never deletes their business or data — it's fully reversible."""
    owner = db.query(models.User).filter(models.User.id == owner_id, models.User.role == "shop_owner").first()
    if not owner:
        raise HTTPException(status_code=404, detail="Shop owner not found")

    owner.is_active = not owner.is_active
    db.commit()
    return {"detail": "Updated", "is_active": owner.is_active}


@router.get("/businesses")
def list_all_businesses(db: Session = Depends(get_db), _admin: models.User = Depends(require_role("admin"))):
    """Super-admin only: full platform overview of every business."""
    businesses = db.query(models.Business).all()
    result = []
    for b in businesses:
        product_count = db.query(models.Product).filter(models.Product.business_id == b.id).count()
        order_count = db.query(models.Order).filter(models.Order.business_id == b.id).count()
        result.append({
            "id": b.id,
            "name": b.name,
            "type": b.type,
            "product_count": product_count,
            "order_count": order_count,
        })
    return result
