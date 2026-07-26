import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // El login es la única vista pública y estática: se puede prerenderizar.
  { path: 'login', renderMode: RenderMode.Prerender },
  // Todo lo demás vive detrás del JWT (guardado en localStorage) y depende de
  // datos en vivo del backend: no tiene sentido prerenderizarlo ni server-renderizarlo.
  { path: '**', renderMode: RenderMode.Client },
];
