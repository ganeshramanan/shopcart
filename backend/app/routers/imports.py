import io
import pandas as pd
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app import models
from app.deps import require_role

router = APIRouter(prefix="/products", tags=["import"])

# Common header aliases we try to auto-map from a shop's Excel/CSV
COLUMN_ALIASES = {
    "name": ["name", "item", "item name", "product", "product name"],
    "unit_type": ["unit", "unit_type", "uom", "measure"],
    "price": ["price", "rate", "mrp", "amount", "cost"],
    "image_url": ["image_url", "image", "image url", "photo", "picture"],
    "category": ["category", "cat", "type", "group"],
}


def _map_columns(columns: list[str]) -> dict:
    normalized = {c.lower().strip(): c for c in columns}
    mapping = {}
    for field, aliases in COLUMN_ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                mapping[field] = normalized[alias]
                break
    return mapping


@router.post("/import")
async def import_products(
    business_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    """Bulk import products from an Excel/CSV rate list.
    Auto-maps common column names; unmatched columns are stored as flexible
    attributes (JSONB) so it works across provision/pharmacy/laundry alike.
    """
    if user.role == "shop_owner" and str(user.business_id) != str(business_id):
        raise HTTPException(status_code=403, detail="Not authorized for this business")

    content = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(content))
        else:
            df = pd.read_excel(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse file: {e}")

    mapping = _map_columns(list(df.columns))
    missing = [f for f in ("name", "price") if f not in mapping]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Could not detect required columns: {missing}. Found columns: {list(df.columns)}",
        )

    created, updated, errors = 0, 0, []

    for idx, row in df.iterrows():
        try:
            name = str(row[mapping["name"]]).strip()
            if not name or name.lower() == "nan":
                continue
            price = float(row[mapping["price"]])
            unit_type = str(row[mapping["unit_type"]]).strip() if "unit_type" in mapping else "unit"
            image_url = str(row[mapping["image_url"]]).strip() if "image_url" in mapping and pd.notna(row[mapping["image_url"]]) else None
            category = str(row[mapping["category"]]).strip() if "category" in mapping and pd.notna(row[mapping["category"]]) else None

            # extra columns -> attributes JSON
            used_cols = set(mapping.values())
            extra = {
                col: row[col] for col in df.columns
                if col not in used_cols and pd.notna(row[col])
            }

            existing = (
                db.query(models.Product)
                .filter(
                    models.Product.business_id == business_id,
                    models.Product.name == name,
                    models.Product.unit_type == unit_type,
                )
                .first()
            )

            if existing:
                if existing.price != price:
                    db.add(models.PriceHistory(
                        product_id=existing.id, old_price=existing.price, new_price=price
                    ))
                existing.price = price
                existing.is_active = True
                existing.attributes = extra
                if image_url:
                    existing.image_url = image_url
                if category:
                    existing.category = category
                updated += 1
            else:
                db.add(models.Product(
                    business_id=business_id, name=name, unit_type=unit_type,
                    price=price, attributes=extra, image_url=image_url, category=category,
                ))
                created += 1
        except Exception as e:
            errors.append({"row": int(idx) + 2, "error": str(e)})  # +2 = header + 0-index offset

    db.commit()
    return {"created": created, "updated": updated, "errors": errors, "detected_columns": mapping}
