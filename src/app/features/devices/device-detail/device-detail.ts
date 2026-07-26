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
import { AsignacionDialog } from '../asignacion-dialog/asignacion-dialog';
import { AppsKiosko } from '../apps-kiosko/apps-kiosko';

@Component({
  selector: 'app-device-detail',
  imports: [
    DatePipe,
    RouterLink,
    AsignacionDialog,
    AppsKiosko,
    ButtonModule,
    CardModule,
    ConfirmDialogModule,
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

  protected onSaved(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    forkJoin({
      device: this.dispositivosService.obtener(this.androidId),
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
