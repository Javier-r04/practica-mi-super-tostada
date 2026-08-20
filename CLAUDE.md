# Mi Súper Tostada

Sistema de pedidos y cobranza. El dominio gana sobre el diseño si hay conflicto.

## UI

- Tokens e import único: `apps/web/src/styles/styles.css` (trae `tokens/`).
- Mapeo Tailwind: `apps/web/tailwind.config.ts` (DESIGN.md §1).
- Marca estática: `apps/web/public/brand/`.
- Cómo construir pantallas: `docs/design/DESIGN.md`.
- Marca, tono, iconografía: `docs/design/readme.md`.
- Skill de diseño: `docs/design/SKILL.md`.
- Referencia visual (no compila): `docs/design/components/`, `docs/design/ui_kits/`.

Primitivas de producción, en este orden: `Button`, `Money`, `EstadoBadge`. Ningún hex, radio ni sombra literal en pantallas.

Tipografía de producto: IBM Plex Sans + IBM Plex Mono vía `@fontsource`. Anton y Kaushan Script son solo promo y no se cargan.
