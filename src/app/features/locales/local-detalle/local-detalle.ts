import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DeviceResponseDTO, DispositivosService, LocalesService, LocalResponseDTO } from '../../../generated-api';

@Component({
  selector: 'app-local-detalle',
  imports: [DatePipe, RouterLink, ButtonModule, CardModule, SkeletonModule, TableModule, TagModule],
  templateUrl: './local-detalle.html',
  styleUrl: './local-detalle.css',
})
export class LocalDetalle {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly localesService = inject(LocalesService);
  private readonly dispositivosService = inject(DispositivosService);

  protected readonly localId = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  protected readonly local = signal<LocalResponseDTO | null>(null);
  protected readonly devices = signal<DeviceResponseDTO[]>([]);

  protected readonly totals = computed(() => {
    const devices = this.devices();
    return {
      total: devices.length,
      online: devices.filter((d) => d.online === true).length,
      offline: devices.filter((d) => d.online !== true).length,
    };
  });

  constructor() {
    this.load();
  }

  protected shortId(id: unknown): string {
    const str = String(id ?? '');
    return str.length > 10 ? `${str.slice(0, 10)}…` : str;
  }

  protected verDispositivo(device: DeviceResponseDTO): void {
    this.router.navigate(['/devices', device.androidId]);
  }

  protected batteryIcon(battery: unknown): string {
    const value = Number(battery);
    if (!Number.isFinite(value)) return 'pi pi-bolt';
    if (value <= 20) return 'pi pi-bolt battery-low';
    if (value <= 50) return 'pi pi-bolt battery-mid';
    return 'pi pi-bolt battery-high';
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(false);

    forkJoin({
      locales: this.localesService.listar5(),
      devices: this.dispositivosService.listar7(),
    }).subscribe({
      next: ({ locales, devices }: { locales: LocalResponseDTO[]; devices: DeviceResponseDTO[] }) => {
        const local = (locales ?? []).find((l) => String(l.id) === this.localId) ?? null;
        this.local.set(local);
        this.devices.set((devices ?? []).filter((d) => String(d.localAsignadoId) === this.localId));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }
}
