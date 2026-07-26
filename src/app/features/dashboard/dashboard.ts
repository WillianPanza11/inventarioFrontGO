import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin, timer } from 'rxjs';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DeviceResponseDTO, DispositivosService, Local, LocalesService } from '../../generated-api';

const REFRESH_INTERVAL_MS = 30000;

interface LocalStats {
  localId: unknown;
  nombre: string;
  total: number;
  online: number;
  offline: number;
  fueraDeSitio: number;
}

@Component({
  selector: 'app-dashboard',
  imports: [CardModule, SkeletonModule, TagModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly dispositivosService = inject(DispositivosService);
  private readonly localesService = inject(LocalesService);

  protected readonly loading = signal(true);
  protected readonly devices = signal<DeviceResponseDTO[]>([]);
  protected readonly locales = signal<Local[]>([]);

  protected readonly totals = computed(() => {
    const devices = this.devices();
    return {
      total: devices.length,
      online: devices.filter((d) => d.online === true).length,
      offline: devices.filter((d) => d.online !== true).length,
      fueraDeSitio: devices.filter((d) => d.fueraDeSitio === true).length,
    };
  });

  protected readonly localStats = computed<LocalStats[]>(() => {
    const devices = this.devices();
    return this.locales().map((local) => {
      const asignados = devices.filter((d) => d.localAsignadoId === local.id);
      return {
        localId: local.id,
        nombre: String(local.nombre),
        total: asignados.length,
        online: asignados.filter((d) => d.online === true).length,
        offline: asignados.filter((d) => d.online !== true).length,
        fueraDeSitio: asignados.filter((d) => d.fueraDeSitio === true).length,
      };
    });
  });

  constructor() {
    timer(0, REFRESH_INTERVAL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());
  }

  protected onlinePct(stat: LocalStats): number {
    return stat.total > 0 ? (stat.online / stat.total) * 100 : 0;
  }

  protected offlinePct(stat: LocalStats): number {
    return stat.total > 0 ? (stat.offline / stat.total) * 100 : 0;
  }

  private load(): void {
    forkJoin({
      devices: this.dispositivosService.listar3(),
      locales: this.localesService.listar2(),
    }).subscribe({
      next: ({ devices, locales }: { devices: DeviceResponseDTO[]; locales: Local[] }) => {
        this.devices.set((devices as DeviceResponseDTO[]) ?? []);
        this.locales.set((locales as Local[]) ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
