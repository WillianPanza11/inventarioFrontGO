import { DatePipe } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { AuthService } from '../../../core/auth/auth.service';
import { CanComponentDeactivate } from '../../../core/pending-changes.guard';
import { DeviceResponseDTO, DispositivosService, MovimientoResponseDTO } from '../../../generated-api';
import { ProgressBarModule } from 'primeng/progressbar';
import { FormatBytesPipe } from '../../../shared/format-bytes.pipe';
import { AsignacionDialog } from '../asignacion-dialog/asignacion-dialog';
import { AppsKiosko } from '../apps-kiosko/apps-kiosko';

const RESOURCE_WARN_THRESHOLD = 80;
const RESOURCE_CRITICAL_THRESHOLD = 90;

@Component({
  selector: 'app-device-detail',
  imports: [
    DatePipe,
    FormatBytesPipe,
    RouterLink,
    AsignacionDialog,
    AppsKiosko,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
    ProgressBarModule,
    TagModule,
    TimelineModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './device-detail.html',
  styleUrl: './device-detail.css',
})
export class DeviceDetail implements CanComponentDeactivate {
  private readonly route = inject(ActivatedRoute);
  private readonly dispositivosService = inject(DispositivosService);
  private readonly confirmationService = inject(ConfirmationService);
  protected readonly authService = inject(AuthService);

  protected readonly androidId = this.route.snapshot.paramMap.get('androidId') ?? '';
  protected readonly loading = signal(true);
  protected readonly device = signal<DeviceResponseDTO | null>(null);
  protected readonly movimientos = signal<MovimientoResponseDTO[]>([]);
  protected readonly dialogVisible = signal(false);
  private readonly appsKiosko = viewChild(AppsKiosko);

  constructor() {
    this.load();
  }

  canDeactivate(): boolean | Observable<boolean> {
    if (!this.appsKiosko()?.hasPendingChanges()) {
      return true;
    }

    return new Observable<boolean>((subscriber) => {
      this.confirmationService.confirm({
        header: 'Cambios sin guardar',
        message: 'Tenés cambios sin guardar en las apps del modo kiosco. ¿Salir sin guardarlos?',
        icon: 'pi pi-exclamation-triangle',
        accept: () => {
          subscriber.next(true);
          subscriber.complete();
        },
        reject: () => {
          subscriber.next(false);
          subscriber.complete();
        },
      });
    });
  }

  protected editar(): void {
    this.dialogVisible.set(true);
  }

  protected batteryIcon(battery: unknown): string {
    const value = Number(battery);
    if (!Number.isFinite(value)) return 'pi pi-bolt';
    if (value <= 20) return 'pi pi-bolt battery-low';
    if (value <= 50) return 'pi pi-bolt battery-mid';
    return 'pi pi-bolt battery-high';
  }

  protected storagePct(d: DeviceResponseDTO): number | null {
    const total = Number(d.almacenamientoTotal);
    if (!Number.isFinite(total) || total <= 0) {
      return null;
    }
    const usado = Number(d.almacenamientoUsado);
    if (Number.isFinite(usado)) {
      return Math.min(100, Math.max(0, (usado / total) * 100));
    }
    const libre = Number(d.almacenamientoLibre);
    if (Number.isFinite(libre)) {
      return Math.min(100, Math.max(0, ((total - libre) / total) * 100));
    }
    return null;
  }

  protected ramPct(d: DeviceResponseDTO): number | null {
    const total = Number(d.ramTotal);
    const disponible = Number(d.ramDisponible);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(disponible)) {
      return null;
    }
    return Math.min(100, Math.max(0, ((total - disponible) / total) * 100));
  }

  protected resourceColor(pct: number): string {
    if (pct > RESOURCE_CRITICAL_THRESHOLD) return '#ef4444';
    if (pct > RESOURCE_WARN_THRESHOLD) return '#f59e0b';
    return '#10b981';
  }

  protected onSaved(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      device: this.dispositivosService.obtener1(this.androidId),
      movimientos: this.dispositivosService.movimientos(this.androidId),
    }).subscribe({
      next: ({ device, movimientos }) => {
        this.device.set(device as DeviceResponseDTO);
        this.movimientos.set((movimientos as MovimientoResponseDTO[]) ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
