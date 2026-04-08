Place Nano Banana product vial PNGs in this folder.

Default naming convention:
- /public/product-vials/<slug>.png

Examples:
- tirzepatide.png
- tesofensine.png
- cjc-1295-ipamorelin-blend.png
- aa-water-bacteriostatic-water.png

How the UI resolves images:
1. If a product has an `imageUrl` field in Firebase, the UI uses that first.
2. Otherwise it tries `/product-vials/<slug>.png`.
3. If that file is missing, it falls back to the built-in generated vial render.

Slug rules:
- lowercase
- letters and numbers only
- spaces and symbols become `-`
