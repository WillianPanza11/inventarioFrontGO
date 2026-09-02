import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  LocalResponseDTO,
  MapeoDeRedService,
  NetworkMappingRequestDTO,
  NetworkMappingResponseDTO,
} from '../../../generated-api';
import { sortByIdDesc } from '../../../shared/sort-by-id-desc';

@Component({
  selector: 'app-network-mapping-admin',
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
  ],
  templateUrl: './network-mapping-admin.html',
  styleUrl: './network-mapping-admin.css',
})
export class NetworkMappingAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly mapeoService = inject(MapeoDeRedService);
  private readonly localesService = inject(LocalesService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected readonly loading = signal(true);
  protected readonly mappings = signal<NetworkMappingResponseDTO[]>([]);
  protected readonly locales = signal<LocalResponseDTO[]>([]);
  protected readonly dialogVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<unknown>(null);

  protected readonly form = this.fb.nonNullable.group({
    subnet: [''],
    ssid: [''],
    localId: this.fb.control<unknown>(null, Validators.required),
    activo: [true],
  });

  constructor() {
    this.loadLocales();
    this.load();
  }

  protected nuevo(): void {
    this.loadLocales();
    this.editingId.set(null);
    this.form.reset({ subnet: '', ssid: '', localId: null, activo: true });
    this.dialogVisible.set(true);
  }

  protected editar(mapping: NetworkMappingResponseDTO): void {
    this.loadLocales();
    this.editingId.set(mapping.id);
    this.form.setValue({
      subnet: String(mapping.subnet ?? ''),
      ssid: String(mapping.ssid ?? ''),
      localId: mapping.localId,
      activo: mapping.activo !== false,
    });
    this.dialogVisible.set(true);
  }

  protected cancelar(): void {
    this.dialogVisible.set(false);
  }

  protected guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const body = this.form.getRawValue() as NetworkMappingRequestDTO;
    const id = this.editingId();
    const request = id != null ? this.mapeoService.actualizar3(body, id) : this.mapeoService.crear4(body);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Regla de mapeo guardada.' });
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la regla.' });
      },
    });
  }

  protected eliminar(mapping: NetworkMappingResponseDTO): void {
    this.confirmationService.confirm({
      header: 'Confirmar eliminación',
      message: `¿Eliminar la regla de mapeo de "${mapping.subnet || mapping.ssid}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.mapeoService.eliminar3(mapping.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: 'Regla eliminada.' });
            this.load();
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' }),
        });
      },
    });
  }

  private loadLocales(): void {
    this.localesService.listar5().subscribe((locales) => this.locales.set((locales as LocalResponseDTO[]) ?? []));
  }

  private load(): void {
    this.loading.set(true);
    this.mapeoService.listar4().subscribe({
      next: (mappings: NetworkMappingResponseDTO[]) => {
        this.mappings.set(sortByIdDesc((mappings as NetworkMappingResponseDTO[]) ?? []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
