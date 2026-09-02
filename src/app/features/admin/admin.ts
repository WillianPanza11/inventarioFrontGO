import { Component, inject } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TabsModule } from 'primeng/tabs';
import {
  ProvinciaDTO,
  ProvinciasService,
  Seccion,
  SeccionesService,
  TipoLocalDTO,
  TiposDeLocalService,
} from '../../generated-api';
import { ApksAdmin } from './apks-admin/apks-admin';
import { CatalogAdmin, CatalogItem, CatalogService } from './catalog-admin/catalog-admin';
import { LocalesAdmin } from './locales-admin/locales-admin';
import { NetworkMappingAdmin } from './network-mapping-admin/network-mapping-admin';
import { OrdenesAdmin } from './ordenes-admin/ordenes-admin';

@Component({
  selector: 'app-admin',
  imports: [
    TabsModule,
    ConfirmDialogModule,
    ApksAdmin,
    CatalogAdmin,
    LocalesAdmin,
    NetworkMappingAdmin,
    OrdenesAdmin,
  ],
  templateUrl: './admin.html',
  providers: [ConfirmationService],
})
export class Admin {
  private readonly seccionesService = inject(SeccionesService);
  private readonly tiposDeLocalService = inject(TiposDeLocalService);
  private readonly provinciasService = inject(ProvinciasService);

  protected readonly seccionesAdapter: CatalogService = {
    listar: () => this.seccionesService.listar1(),
    crear: (body: CatalogItem) => this.seccionesService.crear1(body as Seccion),
    actualizar: (body: CatalogItem, id: unknown) => this.seccionesService.actualizar1(body as Seccion, id),
    eliminar: (id: unknown) => this.seccionesService.eliminar1(id),
  };

  protected readonly tiposDeLocalAdapter: CatalogService = {
    listar: () => this.tiposDeLocalService.listar(),
    crear: (body: CatalogItem) => this.tiposDeLocalService.crear(body as TipoLocalDTO),
    actualizar: (body: CatalogItem, id: unknown) => this.tiposDeLocalService.actualizar(body as TipoLocalDTO, id),
    eliminar: (id: unknown) => this.tiposDeLocalService.eliminar(id),
  };

  protected readonly provinciasAdapter: CatalogService = {
    listar: () => this.provinciasService.listar2(),
    crear: (body: CatalogItem) => this.provinciasService.crear2(body as ProvinciaDTO),
    actualizar: (body: CatalogItem, id: unknown) => this.provinciasService.actualizar2(body as ProvinciaDTO, id),
    eliminar: (id: unknown) => this.provinciasService.eliminar2(id),
  };
}
