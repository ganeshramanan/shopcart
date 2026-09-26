from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import Base, engine
from app.routers import auth, businesses, products, orders, imports, admin, analytics

# Create tables on startup (fine for learning/MVP; use Alembic migrations later)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ShopCart API",
    description="Generic multi-tenant ordering & billing platform — provisions, pharmacy, laundry, etc.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend domain once deployed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(businesses.router)
app.include_router(products.router)
app.include_router(imports.router)
app.include_router(orders.router)
app.include_router(admin.router)
app.include_router(analytics.router)


@app.get("/")
def root():
    return {"status": "ok", "service": "ShopCart API"}


@app.get("/health")
def health():
    return {"status": "healthy"}
