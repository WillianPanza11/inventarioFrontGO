import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';
import { TagModule } from 'primeng/tag';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { ActualizarPermisosDTO, AppKioskoDTO, DispositivosService } from '../../../generated-api';

interface AppTogglePayload {
  packageName: string;
  permitida: boolean;
}

@Component({
  selector: 'app-apps-kiosko',
  imports: [FormsModule, ButtonModule, SkeletonModule, TagModule, ToggleSwitchModule],
  templateUrl: './apps-kiosko.html',
  styleUrl: './apps-kiosko.css',
})
export class AppsKiosko implements OnInit {
  private readonly dispositivosService = inject(DispositivosService);
  private readonly messageService = inject(MessageService);

  readonly androidId = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly apps = signal<AppKioskoDTO[]>([]);
  private readonly originalPermitidas = signal<Map<unknown, unknown>>(new Map());

  readonly hasPendingChanges = computed(() =>
    this.apps().some((app) => app.permitida !== this.originalPermitidas().get(app.packageName)),
  );

  ngOnInit(): void {
    this.load();
  }

  protected kioskoStateIcon(app: AppKioskoDTO): string {
    return app.permitida ? 'pi pi-lock state-locked' : 'pi pi-lock-open state-unlocked';
  }

  protected toggle(app: AppKioskoDTO): void {
    if (app.esInventario) {
      return;
    }
    this.apps.update((list) =>
      list.map((a) => (a.packageName === app.packageName ? { ...a, permitida: !a.permitida } : a)),
    );
  }

  protected guardar(): void {
    const cambios: AppTogglePayload[] = this.apps()
      .filter((app) => !app.esInventario && app.permitida !== this.originalPermitidas().get(app.packageName))
      .map((app) => ({ packageName: app.packageName, permitida: app.permitida }));

    if (cambios.length === 0) {
      return;
    }

    const body: ActualizarPermisosDTO = { apps: cambios };

    this.saving.set(true);
    this.dispositivosService.actualizarAppsKiosko(body, this.androidId()).subscribe({
      next: () => {
        this.saving.set(false);
        this.originalPermitidas.set(new Map(this.apps().map((app) => [app.packageName, app.permitida])));
        this.messageService.add({
          severity: 'success',
          summary: 'Cambios guardados',
          detail: 'Los cambios se aplicarán en el equipo en el próximo heartbeat.',
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo guardar',
          detail: 'Ocurrió un error al guardar los cambios. Tus ediciones se mantienen, intentá nuevamente.',
        });
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.dispositivosService.listarAppsKiosko(this.androidId()).subscribe({
      next: (apps: AppKioskoDTO[]) => {
        const list = apps ?? [];
        this.apps.set(list);
        this.originalPermitidas.set(new Map(list.map((app) => [app.packageName, app.permitida])));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
