import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import {
  LocalesService,
  LocalRequestDTO,
  LocalResponseDTO,
  ProvinciaDTO,
  ProvinciasService,
  TipoLocalDTO,
  TiposDeLocalService,
} from '../../../generated-api';
import { sortByIdDesc } from '../../../shared/sort-by-id-desc';

@Component({
  selector: 'app-locales-admin',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './locales-admin.html',
  styleUrl: './locales-admin.css',
})
export class LocalesAdmin implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly localesService = inject(LocalesService);
  private readonly tiposDeLocalService = inject(TiposDeLocalService);
  private readonly provinciasService = inject(ProvinciasService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected readonly loading = signal(true);
  protected readonly locales = signal<LocalResponseDTO[]>([]);
  protected readonly tiposLocal = signal<TipoLocalDTO[]>([]);
  protected readonly provincias = signal<ProvinciaDTO[]>([]);
  protected readonly dialogVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<unknown>(null);
  protected readonly soloSinProvincia = signal(false);

  protected readonly sinProvinciaCount = computed(
    () => this.locales().filter((local) => local.provinciaId == null).length,
  );

  protected readonly filteredLocales = computed(() =>
    this.soloSinProvincia() ? this.locales().filter((local) => local.provinciaId == null) : this.locales(),
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    tipoLocalId: this.fb.control<unknown>(null),
    provinciaId: this.fb.control<unknown>(null),
    activo: [true],
  });

  ngOnInit(): void {
    this.loadCatalogos();
    this.load();
  }

  protected nuevo(): void {
    this.loadCatalogos();
    this.editingId.set(null);
    this.form.reset({ nombre: '', tipoLocalId: null, provinciaId: null, activo: true });
    this.dialogVisible.set(true);
  }

  protected editar(local: LocalResponseDTO): void {
    this.loadCatalogos();
    this.editingId.set(local.id);
    this.form.setValue({
      nombre: String(local.nombre ?? ''),
      tipoLocalId: local.tipoLocalId ?? null,
      provinciaId: local.provinciaId ?? null,
      activo: local.activo !== false,
    });
    this.dialogVisible.set(true);
  }

  protected cancelar(): void {
    this.dialogVisible.set(false);
  }

  protected setSoloSinProvincia(value: boolean): void {
    this.soloSinProvincia.set(value);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const body = this.form.getRawValue() as LocalRequestDTO;
    const id = this.editingId();
    const request = id != null ? this.localesService.actualizar4(body, id) : this.localesService.crear5(body);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: `Se guardó "${body.nombre}".` });
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo guardar "${body.nombre}".`,
        });
      },
    });
  }

  protected eliminar(local: LocalResponseDTO): void {
    this.confirmationService.confirm({
      header: 'Confirmar desactivación',
      message: `¿Desactivar "${local.nombre}"? Los equipos ya asignados no se ven afectados.`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.localesService.eliminar4(local.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Desactivado', detail: `Se desactivó "${local.nombre}".` });
            this.load();
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar.' }),
        });
      },
    });
  }

  private loadCatalogos(): void {
    this.tiposDeLocalService.listar().subscribe((tipos) => this.tiposLocal.set((tipos as TipoLocalDTO[]) ?? []));
    this.provinciasService.listar2().subscribe((provincias) =>
      this.provincias.set((provincias as ProvinciaDTO[]) ?? []),
    );
  }

  private load(): void {
    this.loading.set(true);
    this.localesService.listar5().subscribe({
      next: (locales: LocalResponseDTO[]) => {
        this.locales.set(sortByIdDesc(locales ?? []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
