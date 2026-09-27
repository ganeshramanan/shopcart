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


@router.delete("/shop-owners/{owner_id}")
def delete_shop_owner(
    owner_id: str,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_role("admin")),
):
    """Super-admin only: permanently delete a shop owner's account.
    Only allowed if they have no business attached — delete their business
    first (which also unlinks them) if they've already onboarded."""
    owner = db.query(models.User).filter(models.User.id == owner_id, models.User.role == "shop_owner").first()
    if not owner:
        raise HTTPException(status_code=404, detail="Shop owner not found")
    if owner.business_id:
        raise HTTPException(
            status_code=400,
            detail="This shop owner still has a business attached. Delete their business first.",
        )
    db.delete(owner)
    db.commit()
    return {"detail": "Shop owner deleted"}


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


@router.get("/users")
def list_all_users(db: Session = Depends(get_db), _admin: models.User = Depends(require_role("admin"))):
    """Super-admin only: every user account on the platform, regardless of
    role — useful for finding/cleaning up orphaned or misconfigured accounts
    that don't show up in the role-specific lists (e.g. shop-owners list)."""
    users = db.query(models.User).order_by(models.User.created_at.desc()).all()
    result = []
    for u in users:
        biz = db.query(models.Business).filter(models.Business.id == u.business_id).first() if u.business_id else None
        order_count = db.query(models.Order).filter(models.Order.customer_id == u.id).count()
        result.append({
            "id": u.id,
            "name": u.name,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "is_guest": u.is_guest,
            "approval_status": u.approval_status,
            "business_id": u.business_id,
            "business_name": biz.name if biz else None,
            "order_count": order_count,
            "created_at": u.created_at,
        })
    return result


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_role("admin")),
):
    """Super-admin only: permanently delete ANY user account, regardless of
    role. Blocked if the account still has a business attached (delete the
    business first) or has order history (deleting would break past bills'
    customer references) — use toggle-active/disable instead for those cases."""
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.business_id:
        raise HTTPException(status_code=400, detail="This user still has a business attached. Delete their business first.")

    order_count = db.query(models.Order).filter(models.Order.customer_id == user.id).count()
    if order_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"This user has {order_count} order(s) on record. Deleting would break that order history — disable the account instead.",
        )

    db.delete(user)
    db.commit()
    return {"detail": "User deleted"}


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    payload: dict,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_role("admin")),
):
    """Super-admin only: reset any user's password (e.g. a shop owner who's
    locked out). No email/SMS infrastructure needed — Cartbi sets a new
    password directly and communicates it to the account holder off-platform
    (phone call, WhatsApp, etc.)."""
    from app.core.security import hash_password

    new_password = payload.get("new_password")
    if not new_password or len(new_password) < 4:
        raise HTTPException(status_code=400, detail="new_password must be at least 4 characters")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(new_password)
    db.commit()
    return {"detail": "Password reset"}
