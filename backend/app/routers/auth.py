from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=schemas.Token)
def signup(payload: schemas.UserSignup, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.phone == payload.phone).first()

    if existing:
        # A walk-in/guest customer (captured by a shop owner at POS billing,
        # no password ever set) is allowed to "claim" their account by
        # signing up with the same phone number — this upgrades them to a
        # real customer who can log in and order remotely, while keeping
        # their name and order history intact. Any account that already
        # has a password is a real registered user — still blocked as a
        # duplicate in that case.
        if existing.is_guest and not existing.password_hash:
            existing.password_hash = hash_password(payload.password)
            existing.is_guest = False
            # Keep their original name if they already had one from the
            # walk-in sale; only overwrite if it was left as the default.
            if payload.name and existing.name in (None, "", "Walk-in Customer"):
                existing.name = payload.name
            if payload.business_id and not existing.business_id:
                existing.business_id = payload.business_id
            db.commit()
            db.refresh(existing)

            token = create_access_token({"sub": existing.id, "role": existing.role})
            return schemas.Token(access_token=token, user=existing)

        raise HTTPException(status_code=400, detail="Phone number already registered")

    if payload.business_id:
        biz = db.query(models.Business).filter(models.Business.id == payload.business_id).first()
        if not biz:
            raise HTTPException(status_code=400, detail="Selected shop not found")

    # New shop owners require Cartbi's approval before they can create a
    # business. Customers are approved by default (they're just joining an
    # existing shop via a signup link).
    approval_status = (
        models.ApprovalStatusEnum.pending
        if payload.role == "shop_owner"
        else models.ApprovalStatusEnum.approved
    )

    user = models.User(
        name=payload.name,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role=payload.role,
        business_id=payload.business_id,
        approval_status=approval_status,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return schemas.Token(access_token=token, user=user)


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.phone == payload.phone).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid phone or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been disabled. Contact the platform admin.")

    token = create_access_token({"sub": user.id, "role": user.role})
    return schemas.Token(access_token=token, user=user)


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    """Lets the frontend refresh its cached user (e.g. after business_id gets linked)."""
    return user
