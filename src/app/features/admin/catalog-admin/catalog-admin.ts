import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { sortByIdDesc } from '../../../shared/sort-by-id-desc';

export interface CatalogItem {
  id?: unknown;
  nombre?: unknown;
  activo?: unknown;
}

export interface CatalogService {
  listar(): Observable<unknown>;
  crear(body: CatalogItem): Observable<unknown>;
  actualizar(body: CatalogItem, id: unknown): Observable<unknown>;
  eliminar(id: unknown): Observable<unknown>;
}

@Component({
  selector: 'app-catalog-admin',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, TableModule],
  templateUrl: './catalog-admin.html',
  styleUrl: './catalog-admin.css',
})
export class CatalogAdmin implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly service = input.required<CatalogService>();
  readonly itemLabel = input('elemento');
  readonly newLabel = input.required<string>();
  readonly emptyMessage = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly items = signal<CatalogItem[]>([]);
  protected readonly dialogVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<unknown>(null);

  protected readonly dialogTitle = computed(() =>
    this.editingId() != null ? `Editar ${this.itemLabel()}` : this.newLabel(),
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
  });

  ngOnInit(): void {
    this.load();
  }

  protected nuevo(): void {
    this.editingId.set(null);
    this.form.reset({ nombre: '' });
    this.dialogVisible.set(true);
  }

  protected editar(item: CatalogItem): void {
    this.editingId.set(item.id);
    this.form.setValue({ nombre: String(item.nombre ?? '') });
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

    const body: CatalogItem = { nombre: this.form.getRawValue().nombre };
    const id = this.editingId();
    const request = id != null ? this.service().actualizar(body, id) : this.service().crear(body);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Guardado',
          detail: `Se guardó "${body.nombre}".`,
        });
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

  protected eliminar(item: CatalogItem): void {
    this.confirmationService.confirm({
      header: 'Confirmar desactivación',
      message: `¿Desactivar "${item.nombre}"? Los equipos ya asignados no se ven afectados.`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.service()
          .eliminar(item.id)
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Desactivado',
                detail: `Se desactivó "${item.nombre}".`,
              });
              this.load();
            },
            error: () =>
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar.' }),
          });
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.service()
      .listar()
      .subscribe({
        next: (items) => {
          this.items.set(sortByIdDesc((items as CatalogItem[]) ?? []));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }
}
