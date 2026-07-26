# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Angular 20 (standalone components, zoneless, SSR-enabled) panel for "Inventario Handhelds" —
inventories and monitors Rugged Handheld Android terminals across multiple locations
(`locales`), with JWT auth (roles `ADMIN`/`VISOR`), a live online/offline dashboard, device
list/detail with movement history, assignment editing (ADMIN only), an out-of-place
("fuera de sitio") alerts view, and catalog/network-mapping administration. UI is PrimeNG
(Aura preset) + PrimeIcons. The backend is a separately-deployed Spring Boot service;
this repo only consumes it via the generated client described below.

## Commands

- `npm start` / `ng serve` — dev server at `http://localhost:4200` (uses `environment.development.ts`).
- `npm run build` / `ng build` — production build, output to `dist/`.
- `npm run watch` — dev-configuration build in watch mode.
- `npm test` / `ng test` — unit tests via Karma + Jasmine.
- `ng test --include='**/some.spec.ts'` — run a single spec file.
- `node dist/inventhhfront/server/server.mjs` (or `npm run serve:ssr:inventhhfront`) — run the built SSR server.

There is no lint script configured in `package.json`. See [README.md](README.md) for how
to point the app at a local backend and how to regenerate the API client.

## Architecture

### Zoneless + SSR, and render modes per route

`app.config.ts` uses `provideZonelessChangeDetection()` (no Zone.js) and
`provideClientHydration(withEventReplay())`; `provideHttpClient` is configured with
`withFetch()` (Angular recommends this for SSR). `app.routes.server.ts` sets
`RenderMode.Prerender` only for `/login` and `RenderMode.Client` for everything else
(`**`) — every authenticated route depends on a JWT held in `localStorage` and on live
backend data, so it must not be prerendered or server-rendered. Keep new top-level routes
consistent with this split.

### Routing & auth (`src/app/core/auth/`, `app.routes.ts`)

- `app.routes.ts`: `/login` (public) and `''` → `Layout` (guarded by `authGuard`) with
  children `dashboard`, `devices`, `devices/:androidId`, `alertas`, `admin` (additionally
  guarded by `adminGuard`). `'' → dashboard` redirect, `** → login` fallback.
  `devices/:androidId` also has `canDeactivate: [pendingChangesGuard]`
  (`core/pending-changes.guard.ts`, a generic functional `CanDeactivateFn` that just calls
  `component.canDeactivate()`) to warn on unsaved kiosk-mode toggle changes — see
  `devices/apps-kiosko/` below.
- `AuthService` wraps the generated `AutenticacinService.login()`, keeps a `session` signal
  (`{token, username, rol}`) persisted to `localStorage`, and exposes `isAuthenticated()`,
  `getRol()`, `getToken()`, `isAdmin` (computed signal). Guarded against SSR via
  `isPlatformBrowser`.
- `auth.interceptor.ts` (functional `HttpInterceptorFn`) attaches `Authorization: Bearer`
  to every request except `/api/auth/login`, and on a `401` calls `authService.logout()`
  and redirects to `/login`.
- `authGuard` / `adminGuard` are functional `CanActivateFn`s; `adminGuard` redirects
  non-admins to `/dashboard`. UI also hides admin-only actions directly (`@if (authService.isAdmin())`) —
  the guard is not the only enforcement point.

### Layout (`src/app/layout/`)

Sidebar + topbar shell (`Layout`) wrapping `<router-outlet/>`; sidebar nav items are
filtered by `isAdmin()`; topbar shows username + role `p-tag` + logout. Hosts the global
`<p-toast/>`.

### Feature structure (`src/app/features/`)

- `auth/login/` — login form.
- `dashboard/` — summary cards + per-local online/offline breakdown (stacked bar), polls
  every 30s via `timer(0, 30000)` + `takeUntilDestroyed()`.
- `devices/device-list/`, `devices/device-detail/` — PrimeNG table with filters
  (online/offline, local, fuera de sitio, free-text client-side search) and a detail page
  with a `p-timeline` of `movimientos`.
- `devices/asignacion-dialog/` — reusable dialog (used from both list and detail) for
  editing a device's `localAsignadoId`/`seccionId`/`responsable` (ADMIN only).
- `devices/apps-kiosko/` — section embedded in `device-detail` (ADMIN only, rendered
  behind `@if (authService.isAdmin())`) with per-device toggles for which catalog apps are
  allowed in kiosk mode. Loads via `DispositivosService.listarAppsKiosko`, batches edits
  locally (a signal diffed against the last-loaded/last-saved snapshot drives
  `hasPendingChanges` and which rows go in the "Guardar cambios" payload), and saves via
  `actualizarAppsKiosko`. The inventory app row (`esInventario === true`) always renders its
  toggle checked and `[disabled]` — it's never sent in the update payload and the backend
  rejects toggling it anyway. `hasPendingChanges` is also read by `DeviceDetail` (via
  `viewChild`) to implement `canDeactivate()` for the route guard above.
- `alerts/` — devices with `fueraDeSitio = true`.
- `admin/catalog-admin/` — **generic** CRUD component for any `{id, nombre, activo}`
  catalog (parameterized by a small `CatalogService` adapter), used for both Locales and
  Secciones since they're structurally and behaviorally identical. Pass `newLabel` /
  `emptyMessage` as fully-composed, already-gendered Spanish strings (e.g. `"Nueva sección"`,
  `"No hay secciones registradas."`) — don't try to derive gender/plural from a bare noun,
  that produced real bugs (e.g. "Nuevo sección").
- `admin/network-mapping-admin/` — dedicated (not generic) CRUD for network→local mapping
  rules, since its shape differs and it supports true delete (not just soft-delete).

Components needing `input.required<...>()` must do their initial data load in `ngOnInit`,
**not** the constructor — required inputs aren't available yet when the constructor runs
(`NG0950`).

### Generated API client (`src/app/generated-api/`)

Swagger Codegen (`typescript-angular`) output from the backend's OpenAPI spec
(`swagger-codegen-cli.jar` at `src/app/swagger-codegen-cli.jar`). **Never hand-edit this
directory** — regenerate it instead (see README). Things to know before consuming it:

- **All DTO fields are typed `any`** (a codegen limitation against this particular spec).
  Don't add hand-written models — cast the `any` response to the existing generated
  interface at the call site instead (e.g. `devices as DeviceResponseDTO[]`).
- **Method names collide across controller tags and get auto-suffixed** —
  `listar`/`listar1`/`listar2`/`listar3`/`listar4`, `crear`/`crear1`/`crear2`/`crear3`,
  `actualizar`/`actualizar1`/`actualizar2`/`actualizar3`, `eliminar`/`eliminar1`/`eliminar2`/`eliminar3`.
  Don't guess from the name; check the actual `*.service.ts` — **these suffixes reshuffle
  across the whole spec whenever the client is regenerated**, even for endpoints unrelated
  to what changed (this happened when kiosk-mode endpoints were added: `DispositivosService`'s
  device-list method moved from `listar3` to `listar4`). Re-grep all call sites after every
  regeneration. Current mapping:
  - `DispositivosService`: `listar4(online?, fueraDeSitio?, local?)` → `GET /api/devices`
    (note: the `local` param filters by **detected** location name, a string — not an id);
    `obtener(androidId)`, `movimientos(androidId)`, `actualizarAsignacion(body, androidId)`;
    `listarAppsKiosko(androidId)` → `GET /api/devices/{androidId}/apps-kiosko` (returns
    `AppPermitidaDTO[]`, one row per catalog app with its per-device `permitida` toggle state);
    `actualizarAppsKiosko(body, androidId)` → `PUT /api/devices/{androidId}/apps-kiosko` (batch
    update, body is `AppPermitidaUpdateDTO[]`); `appsKioskoEfectivas(androidId)` → `GET
    /api/devices/{androidId}/apps-kiosko/efectivas`.
  - `LocalesService`: `listar2/crear2/actualizar2/eliminar2` → `/api/locales`
    (`listar2` returns active-only; `eliminar2` is a soft-delete).
  - `SeccionesService`: `listar/crear/actualizar/eliminar` → `/api/secciones` (same
    active-only/soft-delete semantics as Locales).
  - `MapeoDeRedService`: `listar1/crear1/actualizar1/eliminar1` → `/api/network-mapping`
    (`listar1` returns **all** rows including inactive; `eliminar1` is a hard delete).
  - `KioskoService`: despite the name, this is the **global app catalog** CRUD (not the
    per-device toggles, which live on `DispositivosService` above) —
    `listar3/crear3/actualizar3/eliminar3` → `/api/catalogo-apps` (`listar3` returns
    active-only; `eliminar3` is a soft-delete, `activo=false`). Models: `CatalogoAppDTO`,
    `CatalogoAppCreateDTO`, `CatalogoAppUpdateDTO`. Not registered as a provider in
    `app.config.ts` unless/until the catalog-admin screen is built.
  - `AutenticacinService`: `login(body)` → `POST /api/auth/login`.
- The generated `ApiModule`/`ApiModule.forRoot(...)` (a classic `NgModule`) is **not used**.
  Each service is registered directly as a provider in `app.config.ts`, alongside
  `{ provide: BASE_PATH, useValue: environment.apiBaseUrl }`.

### Versions

Angular is pinned to `^21.2.17` (CLI, build, core, and all `@angular/*` packages — they
move in lockstep; never bump only one of them, `npm install` will fail to resolve peers).
`primeng`/`@primeng/themes` are pinned to `^21.1.9`/`^21.0.4`. Watch out for:

- **`@angular/build` version drift.** If `npm install` starts failing with an `ERESOLVE`
  conflict naming `@angular/build`, check whether something (an IDE auto-fix, `npm audit
  fix --force`) bumped just that one package — it must match the same major as the rest of
  `@angular/*`. `npm audit fix --force` is what caused this twice in this project's
  history; don't run it here.
- **PrimeNG's `-lts` tags** (e.g. `20.5.1-lts`) are PrimeTek's **paid** support branch and
  show a license-nag banner across the whole app without a purchased key. Stick to the
  plain (non-`-lts`) release line.
- Before bumping Angular to a new major, confirm PrimeNG already has a release targeting
  it — PrimeNG has historically lagged a release behind Angular's majors (e.g. no PrimeNG
  build yet for Angular 22 as of this writing), and PrimeNG is used on every screen.

### Strictness

`tsconfig.json` enables `strict`, `strictTemplates`, `strictInjectionParameters`,
`noImplicitOverride`, and `noPropertyAccessFromIndexSignature` — new code should satisfy
these (e.g. bracket access for index-signature properties, explicit override modifiers).
