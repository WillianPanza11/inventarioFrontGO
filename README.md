# Inventhhfront

Panel web (Angular 20 + PrimeNG) para el sistema de inventario y monitoreo de Rugged Handheld Terminals. Consume el backend Spring Boot vía un cliente TypeScript autogenerado a partir de su OpenAPI.

## Requisitos

- Node.js compatible con Angular 20 (ver `package.json` / `@angular/cli`).
- El backend Spring Boot corriendo (por defecto en `http://localhost:8080`, con `/v3/api-docs` y `/swagger-ui.html`).

## Levantar el frontend apuntando al backend local

1. Instalar dependencias: `npm install`.
2. Verificar que `src/environments/environment.development.ts` tenga `apiBaseUrl` apuntando al backend (por defecto ya es `http://localhost:8080`).
3. Arrancar el dev server:

   ```bash
   npm start
   ```

   Esto corre `ng serve` con la configuración `development` (que usa `environment.development.ts` vía `fileReplacements` en `angular.json`). Abrir `http://localhost:4200`.
4. Iniciar sesión en `/login` con un usuario válido del backend (rol `ADMIN` o `VISOR`).

Para producción, editar `src/environments/environment.ts` (`apiBaseUrl`) con la IP fija o el DNS interno del servidor on-premise antes de correr `npm run build`.

## Regenerar el cliente de la API (`src/app/generated-api/`)

Ese directorio **no se edita a mano**: lo genera `swagger-codegen-cli.jar` (ya incluido en `src/app/swagger-codegen-cli.jar`) a partir del OpenAPI del backend. Si el backend cambia (nuevos endpoints, DTOs, etc.), con el backend corriendo en local:

```bash
java -jar src/app/swagger-codegen-cli.jar generate \
  -i http://localhost:8080/v3/api-docs \
  -l typescript-angular \
  -o src/app/generated-api
```

Después de regenerar:

- Revisar si swagger-codegen volvió a deduplicar nombres de método entre tags (p. ej. `listar`, `listar1`, `listar2`, `listar3` — ver el mapeo real en cada `*.service.ts`), ya que pueden cambiar de un endpoint a otro entre regeneraciones.
- Los campos de los DTOs suelen salir tipados `any` (limitación del generador con este spec); los componentes ya hacen `as` hacia las interfaces generadas en el punto de uso en vez de tipar a mano.
- `ApiModule`/`ApiModule.forRoot(...)` que trae el generador no se usa (es un `NgModule` clásico); los servicios se registran directamente como providers en `app.config.ts` junto con `BASE_PATH`.

## Comandos

```bash
npm start          # ng serve (development)
npm run build       # build de producción
npm run watch       # build en watch mode (development)
npm test            # unit tests (Karma + Jasmine)
npm run serve:ssr:inventhhfront   # corre el servidor SSR ya compilado (dist/)
```

## Más información

Ver [CLAUDE.md](CLAUDE.md) para la arquitectura del proyecto (zoneless + SSR, estructura de `generated-api/`, etc.). Para referencia general de Angular CLI: [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli).
# inventarioFrontGO
