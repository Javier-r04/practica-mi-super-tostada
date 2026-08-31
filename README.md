# Mi Súper Tostada — pedidos y cobranza

Sistema web para la fábrica de tortillas, tostadas y frituras. Reemplaza el pedido nocturno por WhatsApp y el cuaderno de cobros.

## Requisitos

- [Bun](https://bun.sh) 1.3+
- Postgres nativo en marcha (en esta máquina: Homebrew). El desarrollo local **no usa Docker**.
- Node.js LTS solo para correr la API en producción (`node dist/main.js`). En local, Nest se levanta con `nest start`.
- Producción en VPS: ver **`DEPLOY.md`** (Openship desde el Mac). El loop de abajo no usa Docker.

## Arranque local

Crea la base `misupertostada` en tu Postgres nativo (Homebrew / Postgres.app). **No hace falta Docker** para desarrollar.

```bash
cp .env.example .env
bun install
bun run db:setup
bun test
bun run dev:all
```

`db:setup` = crear la base si no existe + migrar + seed.

O paso a paso:

```bash
bun run db:create
bun run db:migrate
bun run db:seed
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Salud: `GET http://localhost:3001/health` — reporta `db: ok|down` sin tumbar el proceso. Un `.env` incompleto sí es fatal al boot.

`db:seed` es idempotente: se puede correr dos veces. No inventa precios (`precio_centavos` queda nulo hasta que Cristian los cargue). En desarrollo crea cuatro cuentas (`cristian` ADMIN_JEFE, `alex`, `carla`, `tony`) con `SEED_ADMIN_PASSWORD` (default `dev-local-only`). Login: `POST /auth/login` con `{ username, password }` y cookie `httpOnly`.

## Scripts

| Script | Qué hace |
|---|---|
| `bun run db:create` | Crea la base `misupertostada` si no existe |
| `bun run db:migrate` | Aplica migraciones Drizzle contra `DATABASE_URL` |
| `bun run db:seed` | Datos de `CONTEXT.md` §5 |
| `bun run db:setup` | create + migrate + seed |
| `bun test` | Tests (calendario, dinero, esquema) |
| `bun run typecheck` | `tsc --noEmit` en api y web |
| `bun run lint` | ESLint del frontend |
| `bun run dev:all` | Web + API + tests en watch |
| `bun run db:up` | **Empaquetado** — Compose con Postgres 18. No forma parte del loop local. |

## Qué no está en este hito

Pantallas de operación (E1), WhatsApp y PWA. Auth, outbox/pg-boss y storage R2 ya están en la API.
