import { Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import { Local, LocalesService, Seccion, SeccionesService } from '../../generated-api';
import { CatalogAdmin, CatalogItem, CatalogService } from './catalog-admin/catalog-admin';
import { NetworkMappingAdmin } from './network-mapping-admin/network-mapping-admin';

@Component({
  selector: 'app-admin',
  imports: [TabsModule, ConfirmDialogModule, CatalogAdmin, NetworkMappingAdmin],
  templateUrl: './admin.html',
  providers: [ConfirmationService],
})
export class Admin {
  private readonly localesService = inject(LocalesService);
  private readonly seccionesService = inject(SeccionesService);

  protected readonly localesAdapter: CatalogService = {
    listar: () => this.localesService.listar2(),
    crear: (body: CatalogItem) => this.localesService.crear2(body as Local),
    actualizar: (body: CatalogItem, id: unknown) => this.localesService.actualizar2(body as Local, id),
    eliminar: (id: unknown) => this.localesService.eliminar2(id),
  };

  protected readonly seccionesAdapter: CatalogService = {
    listar: () => this.seccionesService.listar(),
    crear: (body: CatalogItem) => this.seccionesService.crear(body as Seccion),
    actualizar: (body: CatalogItem, id: unknown) => this.seccionesService.actualizar(body as Seccion, id),
    eliminar: (id: unknown) => this.seccionesService.eliminar(id),
  };
}
