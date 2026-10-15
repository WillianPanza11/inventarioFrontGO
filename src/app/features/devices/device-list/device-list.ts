import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { AuthService } from '../../../core/auth/auth.service';
import { DeviceResponseDTO, DispositivosService, LocalesService, LocalResponseDTO } from '../../../generated-api';
import { formatBytes } from '../../../shared/format-bytes.pipe';
import { AsignacionDialog } from '../asignacion-dialog/asignacion-dialog';

type OnlineFilter = 'todos' | 'online' | 'offline';

const LOW_STORAGE_FREE_RATIO = 0.1;

@Component({
  selector: 'app-device-list',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    AsignacionDialog,
    ButtonModule,
    CheckboxModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  templateUrl: './device-list.html',
  styleUrl: './device-list.css',
})
export class DeviceList {
  private readonly dispositivosService = inject(DispositivosService);
  private readonly localesService = inject(LocalesService);
  private readonly messageService = inject(MessageService);
  protected readonly authService = inject(AuthService);

  protected readonly loading = signal(true);
  protected readonly devices = signal<DeviceResponseDTO[]>([]);
  protected readonly locales = signal<LocalResponseDTO[]>([]);

  protected readonly search = signal('');
  protected readonly onlineFilter = signal<OnlineFilter>('todos');
  protected readonly soloFueraDeSitio = signal(false);
  protected readonly localFilter = signal<string | null>(null);

  protected readonly dialogVisible = signal(false);
  protected readonly selectedDevice = signal<DeviceResponseDTO | null>(null);

  protected readonly onlineOptions = [
    { label: 'Todos', value: 'todos' },
    { label: 'Online', value: 'online' },
    { label: 'Offline', value: 'offline' },
  ];

  protected readonly localOptions = computed(() =>
    this.locales().map((l) => ({ label: String(l.nombre), value: String(l.nombre) })),
  );

  protected readonly filteredDevices = computed(() => {
    const term = this.search().trim().toLowerCase();
    if (!term) {
      return this.devices();
    }
    return this.devices().filter((d) =>
      [d.serial, d.androidId, d.ip, d.responsable].some((field) =>
        String(field ?? '').toLowerCase().includes(term),
      ),
    );
  });

  constructor() {
    this.localesService.listar5().subscribe((locales) => this.locales.set((locales as LocalResponseDTO[]) ?? []));
    this.reload();
  }

  protected shortId(id: unknown): string {
    const str = String(id ?? '');
    return str.length > 10 ? `${str.slice(0, 10)}…` : str;
  }

  protected fabricanteModelo(device: DeviceResponseDTO): string {
    const partes = [device.manufacturer, device.model].filter((v) => v != null && String(v).trim() !== '');
    return partes.length > 0 ? partes.join(' · ') : '—';
  }

  protected esCopiable(value: unknown): boolean {
    return String(value ?? '').trim() !== '';
  }

  protected copiar(value: unknown, label: string): void {
    if (!this.esCopiable(value)) {
      return;
    }
    navigator.clipboard.writeText(String(value)).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copiado', detail: `${label} copiado.` });
    });
  }

  protected hasLowResources(device: DeviceResponseDTO): boolean {
    return this.isStorageLow(device) || device.ramBaja === true;
  }

  protected lowResourcesTooltip(device: DeviceResponseDTO): string {
    const parts: string[] = [];
    if (this.isStorageLow(device)) {
      parts.push(
        `Almacenamiento bajo: ${formatBytes(device.almacenamientoLibre)} libres de ${formatBytes(device.almacenamientoTotal)}`,
      );
    }
    if (device.ramBaja === true) {
      parts.push('Memoria RAM baja');
    }
    return parts.join(' · ');
  }

  private isStorageLow(device: DeviceResponseDTO): boolean {
    const total = Number(device.almacenamientoTotal);
    const libre = Number(device.almacenamientoLibre);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(libre)) {
      return false;
    }
    return libre / total < LOW_STORAGE_FREE_RATIO;
  }

  protected setOnlineFilter(value: OnlineFilter): void {
    this.onlineFilter.set(value);
    this.reload();
  }

  protected setLocalFilter(value: string | null): void {
    this.localFilter.set(value);
    this.reload();
  }

  protected setSoloFueraDeSitio(value: boolean): void {
    this.soloFueraDeSitio.set(value);
    this.reload();
  }

  protected editar(device: DeviceResponseDTO): void {
    this.selectedDevice.set(device);
    this.dialogVisible.set(true);
  }

  protected onSaved(): void {
    this.reload();
  }

  private reload(): void {
    this.loading.set(true);
    const online = this.onlineFilter() === 'todos' ? undefined : this.onlineFilter() === 'online';
    const fueraDeSitio = this.soloFueraDeSitio() ? true : undefined;
    const local = this.localFilter() ?? undefined;

    this.dispositivosService.listar7(online, fueraDeSitio, local).subscribe({
      next: (devices: DeviceResponseDTO[]) => {
        this.devices.set((devices as DeviceResponseDTO[]) ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
