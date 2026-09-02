import { Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, timer } from 'rxjs';
import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { DeviceResponseDTO, DispositivosService, LocalesService, LocalResponseDTO } from '../../generated-api';

const REFRESH_INTERVAL_MS = 30000;
const SIN_CLASIFICAR = 'Sin clasificar';
const SIN_PROVINCIA = 'Sin provincia';

interface LocalStats {
  localId: unknown;
  nombre: string;
  tipoLocalId: unknown;
  tipoLocalNombre: string;
  provinciaId: unknown;
  provinciaNombre: string;
  total: number;
  online: number;
  offline: number;
  fueraDeSitio: number;
}

interface GroupTotals {
  locales: number;
  total: number;
  online: number;
  offline: number;
  fueraDeSitio: number;
}

interface ProvinciaGroup {
  key: string;
  nombre: string;
  locales: LocalStats[];
  totals: GroupTotals;
}

interface TipoGroup {
  key: string;
  nombre: string;
  icon: string;
  provincias: ProvinciaGroup[];
  totals: GroupTotals;
}

// Mapa tipo de local -> icono, por nombre (case/acentos insensible). Fácil de
// extender: agregar una entrada acá. Los tipos nuevos creados desde
// Administración que no estén acá usan TIPO_ICON_DEFAULT, así que nunca rompen.
// Si en el futuro se quiere un icono configurable por tipo, esto se puede
// mover a un campo `icono` en el catálogo tipos_local (backend).
const TIPO_ICONS: Record<string, string> = {
  coral: 'pi pi-shop',
  coralito: 'pi pi-shopping-bag',
  fabrica: 'pi pi-warehouse',
  bodega: 'pi pi-box',
};
const TIPO_ICON_DEFAULT = 'pi pi-building';

function normalizarNombreTipo(nombre: string): string {
  return nombre
    .toLowerCase()
    .trim()
    .replace(/[aàáâä]/g, 'a')
    .replace(/[eèéêë]/g, 'e')
    .replace(/[iìíîï]/g, 'i')
    .replace(/[oòóôö]/g, 'o')
    .replace(/[uùúûü]/g, 'u');
}

function tipoLocalIcon(nombre: string): string {
  return TIPO_ICONS[normalizarNombreTipo(nombre)] ?? TIPO_ICON_DEFAULT;
}

function sumTotals(items: LocalStats[]): GroupTotals {
  return {
    locales: items.length,
    total: items.reduce((sum, i) => sum + i.total, 0),
    online: items.reduce((sum, i) => sum + i.online, 0),
    offline: items.reduce((sum, i) => sum + i.offline, 0),
    fueraDeSitio: items.reduce((sum, i) => sum + i.fueraDeSitio, 0),
  };
}

function sortGroupNames(a: string, b: string, sinLabel: string): number {
  if (a === sinLabel && b !== sinLabel) return 1;
  if (b === sinLabel && a !== sinLabel) return -1;
  return a.localeCompare(b, 'es');
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, AccordionModule, CardModule, SkeletonModule, TagModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly dispositivosService = inject(DispositivosService);
  private readonly localesService = inject(LocalesService);

  protected readonly loading = signal(true);
  protected readonly devices = signal<DeviceResponseDTO[]>([]);
  protected readonly locales = signal<LocalResponseDTO[]>([]);

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
        tipoLocalId: local.tipoLocalId ?? null,
        tipoLocalNombre: local.tipoLocalNombre ? String(local.tipoLocalNombre) : SIN_CLASIFICAR,
        provinciaId: local.provinciaId ?? null,
        provinciaNombre: local.provinciaNombre ? String(local.provinciaNombre) : SIN_PROVINCIA,
        total: asignados.length,
        online: asignados.filter((d) => d.online === true).length,
        offline: asignados.filter((d) => d.online !== true).length,
        fueraDeSitio: asignados.filter((d) => d.fueraDeSitio === true).length,
      };
    });
  });

  protected readonly tipoGroups = computed<TipoGroup[]>(() => {
    const porTipo = new Map<string, { nombre: string; items: LocalStats[] }>();

    for (const stat of this.localStats()) {
      const tipoKey = stat.tipoLocalId != null ? String(stat.tipoLocalId) : SIN_CLASIFICAR;
      if (!porTipo.has(tipoKey)) {
        porTipo.set(tipoKey, { nombre: stat.tipoLocalNombre, items: [] });
      }
      porTipo.get(tipoKey)!.items.push(stat);
    }

    const tipos: TipoGroup[] = Array.from(porTipo.entries()).map(([tipoKey, { nombre: tipoNombre, items }]) => {
      const porProvincia = new Map<string, { nombre: string; items: LocalStats[] }>();

      for (const stat of items) {
        const provKey = stat.provinciaId != null ? String(stat.provinciaId) : SIN_PROVINCIA;
        if (!porProvincia.has(provKey)) {
          porProvincia.set(provKey, { nombre: stat.provinciaNombre, items: [] });
        }
        porProvincia.get(provKey)!.items.push(stat);
      }

      const provincias: ProvinciaGroup[] = Array.from(porProvincia.entries())
        .map(([provKey, { nombre: provNombre, items: provItems }]) => ({
          key: provKey,
          nombre: provNombre,
          locales: provItems,
          totals: sumTotals(provItems),
        }))
        .sort((a, b) => sortGroupNames(a.nombre, b.nombre, SIN_PROVINCIA));

      return {
        key: tipoKey,
        nombre: tipoNombre,
        icon: tipoLocalIcon(tipoNombre),
        provincias,
        totals: sumTotals(items),
      };
    });

    return tipos.sort((a, b) => sortGroupNames(a.nombre, b.nombre, SIN_CLASIFICAR));
  });

  protected readonly expandedTipoKeys = signal<string[]>([]);
  private tiposInicializados = false;

  constructor() {
    timer(0, REFRESH_INTERVAL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.load());

    effect(() => {
      const grupos = this.tipoGroups();
      if (!this.tiposInicializados && grupos.length > 0) {
        this.tiposInicializados = true;
        this.expandedTipoKeys.set(grupos.map((g) => g.key));
      }
    });
  }

  protected onExpandedTipoChange(value: string | number | string[] | number[] | null | undefined): void {
    this.expandedTipoKeys.set(Array.isArray(value) ? value.map(String) : []);
  }

  protected onlinePct(stat: LocalStats): number {
    return stat.total > 0 ? (stat.online / stat.total) * 100 : 0;
  }

  protected offlinePct(stat: LocalStats): number {
    return stat.total > 0 ? (stat.offline / stat.total) * 100 : 0;
  }

  private load(): void {
    forkJoin({
      devices: this.dispositivosService.listar7(),
      locales: this.localesService.listar5(),
    }).subscribe({
      next: ({ devices, locales }: { devices: DeviceResponseDTO[]; locales: LocalResponseDTO[] }) => {
        this.devices.set((devices as DeviceResponseDTO[]) ?? []);
        this.locales.set((locales as LocalResponseDTO[]) ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
