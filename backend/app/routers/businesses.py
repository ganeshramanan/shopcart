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
def delete_business(
    business_id: str,
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
