"""One-off script to add newly-introduced columns to an already-deployed
Postgres DB, since we use Base.metadata.create_all() (which only creates
NEW tables, never alters existing ones). Run manually whenever the model
gains a new column on a table that already exists in production.

Usage: DATABASE_URL=<neon-connection-string> python scripts/migrate_add_columns.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from sqlalchemy import create_engine, text

db_url = os.environ.get("DATABASE_URL")
if not db_url:
    print("Set DATABASE_URL env var (your Neon connection string) and re-run.")
    sys.exit(1)

if "sslmode" not in db_url and "neon.tech" in db_url:
    db_url += ("&" if "?" in db_url else "?") + "sslmode=require"

engine = create_engine(db_url)

statements = [
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url VARCHAR;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS category VARCHAR;",
    "CREATE INDEX IF NOT EXISTS ix_products_category ON products (category);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR NOT NULL DEFAULT 'approved';",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN NOT NULL DEFAULT false;",
    "ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;",
    "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;",
    "ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR;",
    "CREATE UNIQUE INDEX IF NOT EXISTS ix_products_barcode ON products (barcode) WHERE barcode IS NOT NULL;",
]

# Adding an enum value must run outside a transaction block in Postgres <12,
# and cannot be combined with other DDL in the same statement — run separately.
enum_statements = [
    "ALTER TYPE roleenum ADD VALUE IF NOT EXISTS 'staff';",
]

with engine.begin() as conn:
    for stmt in statements:
        print(f"Running: {stmt}")
        conn.execute(text(stmt))

# ALTER TYPE ... ADD VALUE must autocommit (no surrounding transaction)
with engine.connect() as conn:
    conn.execute(text("COMMIT"))
    for stmt in enum_statements:
        print(f"Running: {stmt}")
        conn.execute(text(stmt))

print("Migration complete.")
