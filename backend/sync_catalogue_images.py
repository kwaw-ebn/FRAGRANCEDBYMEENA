"""Attach uploaded product photographs to existing catalogue rows.

Run from repository root after copying frontend/public/products/*.webp.
Requires DATABASE_URL and backend dependencies. Does not modify prices or stock.
"""
import os
from pathlib import Path
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from app.main import Product

PHOTOS = {
    ("ZARA", "Rose Gourmand"): ["zara-rose-gourmand.webp", "zara-rose-gourmand-duo.webp", "zara-rose-gourmand-additional.webp"],
    ("ZARA", "Red Temptation Elixir"): ["zara-red-temptation-elixir.webp"],
    ("LATTAFA", "Eclaire"): ["lattafa-eclaire.webp"],
    ("LATTAFA", "Fakhar Rose"): ["lattafa-fakhar-rose.webp"],
    ("LATTAFA", "Honor & Glory"): ["lattafa-honor-and-glory.webp"],
    ("LATTAFA", "Khamrah Qahwa"): ["lattafa-khamrah-qahwa.webp"],
    ("LATTAFA", "Nebras"): ["lattafa-nebras-bottle.webp", "lattafa-nebras-packaging.webp"],
    ("LATTAFA", "Qaed Al Fursan Unlimited"): ["lattafa-qaed-al-fursan-unlimited.webp"],
    ("LATTAFA", "Qimmah"): ["lattafa-qimmah-for-women.webp"],
    ("KHADLAJ", "Café Latte"): ["khadlaj-cafe-latte.webp"],
    ("RAYHAAN", "Floriana"): ["rayhaan-floriana.webp"],
    ("BATH & BODY WORKS", "Dream Bright"): ["bath-body-works-dream-bright.webp"],
    ("BATH & BODY WORKS", "Midnight Addiction"): ["bath-body-works-midnight-addiction.webp"],
    ("BATH & BODY WORKS", "Vanilla Romance"): ["bath-body-works-vanilla-romance.webp"],
    ("BATH & BODY WORKS", "Warm Vanilla"): ["bath-body-works-warm-vanilla-sugar.webp"],
    ("BATH & BODY WORKS", "You’re The One"): ["bath-body-works-youre-the-one.webp"],
}
def main():
    assets = Path(__file__).resolve().parents[1] / "frontend" / "public" / "products"
    url = os.environ["DATABASE_URL"].replace("postgres://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    engine = create_engine(url, pool_pre_ping=True)
    with Session(engine) as db:
        count = 0
        for (brand, name), names in PHOTOS.items():
            missing = [n for n in names if not (assets / n).is_file()]
            if missing:
                print(f"SKIP {brand} {name}: missing {', '.join(missing)}")
                continue
            product = db.scalar(select(Product).where(Product.brand == brand, Product.name == name))
            if not product:
                print(f"SKIP {brand} {name}: catalogue record not found")
                continue
            product.images = ["/products/" + n for n in names]
            product.alt = f"{brand} {name} perfume product photograph at FragrancedByMeena Ghana"
            count += 1
        db.commit()
        print(f"Updated {count} products. Prices and stock unchanged.")
if __name__ == "__main__":
    main()
