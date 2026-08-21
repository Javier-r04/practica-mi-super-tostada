<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Frontend — reglas de agente

## No browser / DevTools

En trabajo de UI (auditoría, diseño, implementación, revisión visual):

- **Prohibido** usar MCP de browser (`cursor-ide-browser`, Chrome DevTools, etc.).
- **Prohibido** navegar, tomar screenshots, snapshots, inspeccionar DOM o consola.
- **Prohibido** asumir que hay que “ver la app corriendo” para decidir diseño.

Base la evaluación en: páginas/componentes, tokens CSS, patrones del panel y copy de dominio.

Excepción: solo si el usuario pide explícitamente abrir o inspeccionar el browser.
