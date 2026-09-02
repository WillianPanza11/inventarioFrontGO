import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DeviceResponseDTO, DispositivosService } from '../../generated-api';

@Component({
  selector: 'app-alerts',
  imports: [DatePipe, ButtonModule, CardModule, TableModule, TagModule],
  templateUrl: './alerts.html',
  styleUrl: './alerts.css',
})
export class Alerts {
  private readonly dispositivosService = inject(DispositivosService);

  protected readonly loading = signal(true);
  protected readonly devices = signal<DeviceResponseDTO[]>([]);

  constructor() {
    this.load();
  }

  protected reload(): void {
    this.load();
  }

  protected shortId(id: unknown): string {
    const str = String(id ?? '');
    return str.length > 10 ? `${str.slice(0, 10)}…` : str;
  }

  private load(): void {
    this.loading.set(true);
    this.dispositivosService.listar7(undefined, true).subscribe({
      next: (devices: DeviceResponseDTO[]) => {
        this.devices.set((devices as DeviceResponseDTO[]) ?? []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
