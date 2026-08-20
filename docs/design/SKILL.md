---
name: mi-super-tostada-design
description: Use this skill to generate well-branded interfaces and assets for Mi Súper Tostada (fábrica de tortillas, tostadas y frituras en Quetzaltenango, Guatemala) and for its sistema de pedidos y cobranza, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.
If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.
If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

Notes specific to this system: copy is written in Guatemalan Spanish (usted for clients, direct imperatives for staff, no emoji); money is always shown as `Q 1,240.50` and stored as integer cents; state colors come from the `--estado-*` tokens, never improvised. Product UI type is IBM Plex Sans + IBM Plex Mono via `@fontsource` (14 px body, weight max 600). Do not load Anton, Barlow, or Kaushan Script in the app.
