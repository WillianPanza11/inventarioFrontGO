import { Component, effect, inject, input, model, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import {
  AsignacionDTO,
  DeviceResponseDTO,
  DispositivosService,
  LocalesService,
  LocalResponseDTO,
  Seccion,
  SeccionesService,
} from '../../../generated-api';

@Component({
  selector: 'app-asignacion-dialog',
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule],
  templateUrl: './asignacion-dialog.html',
  styleUrl: './asignacion-dialog.css',
})
export class AsignacionDialog {
  private readonly fb = inject(FormBuilder);
  private readonly dispositivosService = inject(DispositivosService);
  private readonly localesService = inject(LocalesService);
  private readonly seccionesService = inject(SeccionesService);
  private readonly messageService = inject(MessageService);

  readonly visible = model(false);
  readonly device = input<DeviceResponseDTO | null>(null);
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly locales = signal<LocalResponseDTO[]>([]);
  protected readonly secciones = signal<Seccion[]>([]);
  private catalogsLoaded = false;

  protected readonly form = this.fb.nonNullable.group({
    localAsignadoId: this.fb.control<unknown>(null, Validators.required),
    seccionId: this.fb.control<unknown>(null, Validators.required),
    responsable: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      const device = this.device();
      if (this.visible() && device) {
        if (!this.catalogsLoaded) {
          this.catalogsLoaded = true;
          this.loadCatalogs();
        }
        this.form.setValue({
          localAsignadoId: device.localAsignadoId,
          seccionId: device.seccionId,
          responsable: String(device.responsable ?? ''),
        });
      }
    });
  }

  submit(): void {
    const device = this.device();
    if (!device || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const body = this.form.getRawValue() as AsignacionDTO;
    this.saving.set(true);

    this.dispositivosService.actualizarAsignacion(body, device.androidId).subscribe({
      next: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Asignación actualizada',
          detail: `Se actualizó la asignación de ${device.androidId}.`,
        });
        this.visible.set(false);
        this.saved.emit();
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo actualizar',
          detail: 'Ocurrió un error al guardar la asignación. Intenta nuevamente.',
        });
      },
    });
  }

  cancel(): void {
    this.visible.set(false);
  }

  private loadCatalogs(): void {
    forkJoin({
      locales: this.localesService.listar5(),
      secciones: this.seccionesService.listar1(),
    }).subscribe(({ locales, secciones }) => {
      this.locales.set((locales as LocalResponseDTO[]) ?? []);
      this.secciones.set((secciones as Seccion[]) ?? []);
    });
  }
}
