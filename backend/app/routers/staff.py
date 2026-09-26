from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password
from app import models
from app.deps import require_role

router = APIRouter(prefix="/staff", tags=["staff"])


@router.get("")
def list_staff(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("shop_owner")),
):
    """Shop owner lists their own staff accounts. No Cartbi/admin involvement —
    staff are entirely managed by the shop owner who created them."""
    if not user.business_id:
        raise HTTPException(status_code=400, detail="You need a business set up first")

    staff = (
        db.query(models.User)
        .filter(models.User.business_id == user.business_id, models.User.role == models.RoleEnum.staff)
        .all()
    )
    return [
        {
            "id": s.id,
            "name": s.name,
            "phone": s.phone,
            "is_active": s.is_active,
            "created_at": s.created_at,
        }
        for s in staff
    ]


@router.post("")
def create_staff(
    payload: dict,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("shop_owner")),
):
    """Shop owner creates a staff account directly — no approval workflow
    needed since this is internal to their own business, not a new tenant."""
    if not user.business_id:
        raise HTTPException(status_code=400, detail="You need a business set up first")

    name = payload.get("name")
    phone = payload.get("phone")
    password = payload.get("password")
    if not name or not phone or not password:
        raise HTTPException(status_code=400, detail="name, phone, and password are required")

    existing = db.query(models.User).filter(models.User.phone == phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    staff = models.User(
        name=name,
        phone=phone,
        password_hash=hash_password(password),
        role=models.RoleEnum.staff,
        business_id=user.business_id,
        is_active=True,
    )
    db.add(staff)
    db.commit()
    db.refresh(staff)
    return {"id": staff.id, "name": staff.name, "phone": staff.phone, "is_active": staff.is_active}


@router.patch("/{staff_id}/toggle-active")
def toggle_staff_active(
    staff_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("shop_owner")),
):
    """Enable/disable a staff member's login access. Fully reversible,
    no data is deleted."""
    staff = (
        db.query(models.User)
        .filter(
            models.User.id == staff_id,
            models.User.business_id == user.business_id,
            models.User.role == models.RoleEnum.staff,
        )
        .first()
    )
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    staff.is_active = not staff.is_active
    db.commit()
    return {"detail": "Updated", "is_active": staff.is_active}


@router.delete("/{staff_id}")
def delete_staff(
    staff_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("shop_owner")),
):
    """Permanently remove a staff account."""
    staff = (
        db.query(models.User)
        .filter(
            models.User.id == staff_id,
            models.User.business_id == user.business_id,
            models.User.role == models.RoleEnum.staff,
        )
        .first()
    )
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    db.delete(staff)
    db.commit()
    return {"detail": "Staff member removed"}
