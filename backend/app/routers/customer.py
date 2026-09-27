from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app import models, schemas
from app.deps import require_role

router = APIRouter(tags=["customer"])


# ---------- Addresses ----------
# Customer-only saved delivery addresses. Simple CRUD scoped to the logged-in
# customer — no cross-customer access is possible since every query filters
# by customer_id == user.id.

@router.get("/addresses", response_model=list[schemas.AddressOut])
def list_addresses(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("customer")),
):
    return (
        db.query(models.Address)
        .filter(models.Address.customer_id == user.id)
        .order_by(models.Address.is_default.desc(), models.Address.created_at.desc())
        .all()
    )


@router.post("/addresses", response_model=schemas.AddressOut)
def create_address(
    payload: schemas.AddressCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("customer")),
):
    if payload.is_default:
        db.query(models.Address).filter(models.Address.customer_id == user.id).update({"is_default": False})

    address = models.Address(customer_id=user.id, **payload.model_dump())
    db.add(address)
    db.commit()
    db.refresh(address)
    return address


@router.patch("/addresses/{address_id}", response_model=schemas.AddressOut)
def update_address(
    address_id: str,
    payload: schemas.AddressUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("customer")),
):
    address = db.query(models.Address).filter(
        models.Address.id == address_id, models.Address.customer_id == user.id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")

    updates = payload.model_dump(exclude_unset=True)
    if updates.get("is_default"):
        db.query(models.Address).filter(models.Address.customer_id == user.id).update({"is_default": False})

    for field, value in updates.items():
        setattr(address, field, value)

    db.commit()
    db.refresh(address)
    return address


@router.delete("/addresses/{address_id}")
def delete_address(
    address_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("customer")),
):
    address = db.query(models.Address).filter(
        models.Address.id == address_id, models.Address.customer_id == user.id
    ).first()
    if not address:
        raise HTTPException(status_code=404, detail="Address not found")
    db.delete(address)
    db.commit()
    return {"status": "deleted"}


# ---------- Favorites ----------
# Star/unstar a product for quick access later. Deliberately simple —
# toggle-style: POST adds, DELETE removes, GET lists (with product details
# joined in so the frontend doesn't need a second round-trip).

@router.get("/favorites", response_model=list[schemas.FavoriteOut])
def list_favorites(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("customer")),
):
    return (
        db.query(models.Favorite)
        .options(joinedload(models.Favorite.product))
        .filter(models.Favorite.customer_id == user.id)
        .order_by(models.Favorite.created_at.desc())
        .all()
    )


@router.post("/favorites", response_model=schemas.FavoriteOut)
def add_favorite(
    payload: schemas.FavoriteCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("customer")),
):
    existing = db.query(models.Favorite).filter(
        models.Favorite.customer_id == user.id, models.Favorite.product_id == payload.product_id
    ).first()
    if existing:
        return existing

    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    fav = models.Favorite(customer_id=user.id, product_id=payload.product_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/favorites/{product_id}")
def remove_favorite(
    product_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("customer")),
):
    fav = db.query(models.Favorite).filter(
        models.Favorite.customer_id == user.id, models.Favorite.product_id == product_id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    db.delete(fav)
    db.commit()
    return {"status": "removed"}
