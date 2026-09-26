from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app import models
from app.deps import require_role

router = APIRouter(prefix="/businesses", tags=["analytics"])


def _ensure_owns_business(user: models.User, business_id: str):
    if user.role == "admin":
        return
    if user.role != "shop_owner" or str(user.business_id) != str(business_id):
        raise HTTPException(status_code=403, detail="Not authorized for this business")


@router.get("/{business_id}/analytics")
def get_analytics(
    business_id: str,
    days: int = 30,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_role("admin", "shop_owner")),
):
    """Aggregated sales analytics for a business over the last N days.
    Pure read/aggregation over existing Order/OrderItem data — no new tables."""
    _ensure_owns_business(user, business_id)

    since = datetime.utcnow() - timedelta(days=days)

    # Only count orders that represent completed sales (excludes cancelled)
    base_q = (
        db.query(models.Order)
        .filter(
            models.Order.business_id == business_id,
            models.Order.created_at >= since,
            models.Order.status != models.OrderStatusEnum.cancelled,
        )
    )
    orders = base_q.all()

    total_revenue = sum(o.total_amount for o in orders)
    total_orders = len(orders)
    avg_order_value = round(total_revenue / total_orders, 2) if total_orders else 0

    # Revenue trend by day
    daily = {}
    for o in orders:
        day_key = o.created_at.strftime("%Y-%m-%d")
        daily.setdefault(day_key, {"date": day_key, "revenue": 0.0, "orders": 0})
        daily[day_key]["revenue"] += o.total_amount
        daily[day_key]["orders"] += 1
    daily_trend = sorted(daily.values(), key=lambda d: d["date"])
    for d in daily_trend:
        d["revenue"] = round(d["revenue"], 2)

    # Top products by quantity sold and by revenue
    item_rows = (
        db.query(
            models.OrderItem.product_name_snapshot,
            func.sum(models.OrderItem.quantity).label("total_qty"),
            func.sum(models.OrderItem.line_total).label("total_revenue"),
            func.count(models.OrderItem.id).label("times_ordered"),
        )
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(
            models.Order.business_id == business_id,
            models.Order.created_at >= since,
            models.Order.status != models.OrderStatusEnum.cancelled,
        )
        .group_by(models.OrderItem.product_name_snapshot)
        .order_by(func.sum(models.OrderItem.line_total).desc())
        .limit(10)
        .all()
    )
    top_products = [
        {
            "name": row.product_name_snapshot,
            "quantity": row.total_qty,
            "revenue": round(row.total_revenue, 2),
            "times_ordered": row.times_ordered,
        }
        for row in item_rows
    ]

    # New vs repeat customers (based on when they first ordered from this shop)
    customer_ids_in_window = {o.customer_id for o in orders}
    new_customers = 0
    repeat_customers = 0
    for cid in customer_ids_in_window:
        first_order = (
            db.query(models.Order)
            .filter(models.Order.customer_id == cid, models.Order.business_id == business_id)
            .order_by(models.Order.created_at.asc())
            .first()
        )
        if first_order and first_order.created_at >= since:
            new_customers += 1
        else:
            repeat_customers += 1

    return {
        "period_days": days,
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "avg_order_value": avg_order_value,
        "unique_customers": len(customer_ids_in_window),
        "new_customers": new_customers,
        "repeat_customers": repeat_customers,
        "daily_trend": daily_trend,
        "top_products": top_products,
    }
