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
