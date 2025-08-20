# Repository Guidelines

## Project Structure & Module Organization
- Source: `src/app` (Next.js App Router). Entry points: `layout.tsx`, `page.tsx`, styles in `globals.css` (Tailwind v4).
- Assets: `public/` for static files (e.g., icons, images).
- Config: `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`.
- Suggested growth: `src/components/`, `src/lib/`, `src/types/`. Path alias `@/*` maps to `src/*`.

## Build, Test, and Development Commands
- `npm run dev`: Start local dev server (Turbopack) at `http://localhost:3000`.
- `npm run build`: Production build.
- `npm start`: Run the production build.
- `npm run lint`: Lint with Next + TypeScript rules.

## Coding Style & Naming Conventions
- Language: TypeScript (strict). Indentation: 2 spaces.
- Components: PascalCase file and component names (e.g., `SearchPanel.tsx`).
- Utilities/hooks: camelCase files (e.g., `useCourts.ts`).
- Routes follow `app/` segment patterns; prefer Server Components by default; add `"use client"` only when needed.
- Imports: use `@/` alias (e.g., `import { foo } from "@/lib/foo"`).
- Linting: `eslint.config.mjs` extends `next/core-web-vitals` and `next/typescript`. Fix issues before PR.

## Testing Guidelines
- No test setup yet. Prefer Vitest + React Testing Library when adding tests.
- Location: colocate as `*.test.ts(x)` next to source or under `src/__tests__/`.
- Targets: aim for ≥80% coverage on new/changed code. Snapshot tests only for stable UI.
- Command (after setup): `npm test`.

## Commit & Pull Request Guidelines
- Commits: follow Conventional Commits. Examples:
  - `feat(search): add court filters`
  - `fix(ui): correct card spacing`
- PRs: include description, linked issues, steps to test, and screenshots for UI changes. Keep diffs focused; ensure `npm run lint` passes.

## Security & Configuration Tips
- Secrets in `.env.local`; `.env*` is gitignored. Use `NEXT_PUBLIC_*` only for safe client‑side values.
- Do not commit build artifacts (`.next/`, `out/`, `build/`).
- Validate external data on the server; avoid sensitive data in client logs.

## Architecture Overview
- Next.js 15 (App Router) + React 19, Tailwind CSS v4, Turbopack. Prefer SSR/SSG where appropriate; static assets in `public/`.
