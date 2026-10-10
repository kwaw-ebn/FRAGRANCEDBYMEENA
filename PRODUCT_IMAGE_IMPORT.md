# FragrancedByMeena product image import

The 20 optimized WebP photographs are supplied separately in `fragrancedbymeena-catalogue-assets.zip`.

1. Extract the ZIP at the repository root, preserving `frontend/public/products/`.
2. Run `python backend/sync_catalogue_images.py` with the same `DATABASE_URL` as the backend, after installing backend requirements.
3. Redeploy the frontend/backend on Render.

Prices remain unset. Existing prices and stock quantities are never overwritten by the image-sync script. Two photos of Nebras and Rose Gourmand are grouped under their respective product listings. The combined Cherry Temptation / Hibiscus reference image is not assigned to either individual product because it contains both products.

Do not enable `INCLUDE_REFERENCE_IMAGES` to substitute shared reference images for real product photos.
