import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, timer } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import {
  ApkResponseDTO,
  APKsService,
  CrearOrdenDTO,
  DeviceResponseDTO,
  DispositivosService,
  LocalesService,
  LocalResponseDTO,
  OrdenResponseDTO,
  RdenesService,
} from '../../../generated-api';
import { sortByIdDesc } from '../../../shared/sort-by-id-desc';

const AUTO_REFRESH_INTERVAL_MS = 8000;

type DestinoMode = 'uno' | 'varios' | 'local';

interface OrdenPayload {
  apkId?: unknown;
  packageName?: string;
  versionName?: string;
}

@Component({
  selector: 'app-ordenes-admin',
  imports: [
    DatePipe,
    FormsModule,
    ReactiveFormsModule,
    ButtonModule,
    CheckboxModule,
    ConfirmDialogModule,
    DialogModule,
    MultiSelectModule,
    SelectButtonModule,
    SelectModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './ordenes-admin.html',
  styleUrl: './ordenes-admin.css',
})
export class OrdenesAdmin implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly rdenesService = inject(RdenesService);
  private readonly apksService = inject(APKsService);
  private readonly localesService = inject(LocalesService);
  private readonly dispositivosService = inject(DispositivosService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected readonly loading = signal(true);
  protected readonly ordenes = signal<OrdenResponseDTO[]>([]);
  protected readonly apks = signal<ApkResponseDTO[]>([]);
  protected readonly locales = signal<LocalResponseDTO[]>([]);
  protected readonly devices = signal<DeviceResponseDTO[]>([]);

  protected readonly filtroEstado = signal<string | null>(null);
  protected readonly filtroAndroidId = signal<string | null>(null);

  protected readonly estadoFiltroOptions = [
    { label: 'Todos los estados', value: null },
    { label: 'Pendiente', value: 'PENDIENTE' },
    { label: 'Enviada', value: 'ENVIADA' },
    { label: 'En progreso', value: 'EN_PROGRESO' },
    { label: 'Completada', value: 'COMPLETADA' },
    { label: 'Fallida', value: 'FALLIDA' },
  ];

  protected readonly dialogVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly destinoMode = signal<DestinoMode>('uno');

  protected readonly destinoModeOptions: { label: string; value: DestinoMode }[] = [
    { label: 'Un equipo', value: 'uno' },
    { label: 'Varios equipos', value: 'varios' },
    { label: 'Todos los de un local', value: 'local' },
  ];

  protected readonly apkOptions = computed(() =>
    this.apks()
      .filter((a) => a.activo !== false)
      .map((a) => ({
        label: `${a.nombre}${a.versionName ? ' — v' + a.versionName : ''} (${a.origen === 'INTERNO' ? 'Interno' : 'Externo'})`,
        value: a.id,
      })),
  );

  protected readonly deviceOptions = computed(() =>
    this.devices().map((d) => ({
      label: `${d.androidId} — ${d.model || 'sin modelo'} (${d.localAsignadoNombre || 'sin local'})`,
      value: d.androidId,
    })),
  );

  protected readonly localOptions = computed(() =>
    this.locales().map((l) => ({ label: String(l.nombre), value: l.id })),
  );

  protected readonly form = this.fb.nonNullable.group({
    apkId: this.fb.control<unknown>(null, Validators.required),
    androidId: this.fb.control<unknown>(null),
    androidIds: this.fb.nonNullable.control<unknown[]>([]),
    localId: this.fb.control<unknown>(null),
  });

  protected readonly autoRefresh = signal(false);

  protected readonly detalleVisible = signal(false);
  protected readonly ordenSeleccionada = signal<OrdenResponseDTO | null>(null);

  protected readonly ultimoLoteIds = signal<unknown[]>([]);

  protected readonly loteResumen = computed(() => {
    const ids = this.ultimoLoteIds();
    if (ids.length === 0) {
      return null;
    }
    const idSet = new Set(ids.map(String));
    const ordenesLote = this.ordenes().filter((o) => idSet.has(String(o.id)));
    return {
      total: ids.length,
      pendientes: ordenesLote.filter((o) => o.estado === 'PENDIENTE').length,
      enviadas: ordenesLote.filter((o) => o.estado === 'ENVIADA').length,
      enProgreso: ordenesLote.filter((o) => o.estado === 'EN_PROGRESO').length,
      completadas: ordenesLote.filter((o) => o.estado === 'COMPLETADA').length,
      fallidas: ordenesLote.filter((o) => o.estado === 'FALLIDA').length,
    };
  });

  constructor() {
    timer(AUTO_REFRESH_INTERVAL_MS, AUTO_REFRESH_INTERVAL_MS)
      .pipe(takeUntilDestroyed())
      .subscribe(() => {
        if (this.autoRefresh()) {
          this.load();
        }
      });
  }

  ngOnInit(): void {
    this.loadCatalogos();
    this.load();
  }

  protected setAutoRefresh(value: boolean): void {
    this.autoRefresh.set(value);
  }

  protected verDetalle(orden: OrdenResponseDTO): void {
    this.ordenSeleccionada.set(orden);
    this.detalleVisible.set(true);
  }

  protected cerrarDetalle(): void {
    this.detalleVisible.set(false);
  }

  protected cerrarResumenLote(): void {
    this.ultimoLoteIds.set([]);
  }

  protected payloadJson(orden: OrdenResponseDTO): string {
    return JSON.stringify(this.parsePayload(orden), null, 2);
  }

  protected setDestinoMode(mode: DestinoMode): void {
    this.destinoMode.set(mode);
  }

  protected setFiltroEstado(estado: string | null): void {
    this.filtroEstado.set(estado);
    this.load();
  }

  protected setFiltroAndroidId(androidId: string | null): void {
    this.filtroAndroidId.set(androidId);
    this.load();
  }

  protected refrescar(): void {
    this.load();
  }

  protected nuevaOrden(): void {
    this.loadCatalogos();
    this.destinoMode.set('uno');
    this.form.reset({ apkId: null, androidId: null, androidIds: [], localId: null });
    this.dialogVisible.set(true);
  }

  protected cancelar(): void {
    this.dialogVisible.set(false);
  }

  protected confirmarOrden(): void {
    const { apkId, androidId, androidIds, localId } = this.form.getRawValue();
    const mode = this.destinoMode();

    if (!apkId) {
      this.form.markAllAsTouched();
      return;
    }
    if (mode === 'uno' && !androidId) {
      this.messageService.add({ severity: 'warn', summary: 'Falta el equipo', detail: 'Seleccioná un equipo.' });
      return;
    }
    if (mode === 'varios' && (!androidIds || androidIds.length === 0)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Faltan equipos',
        detail: 'Seleccioná al menos un equipo.',
      });
      return;
    }
    if (mode === 'local' && !localId) {
      this.messageService.add({ severity: 'warn', summary: 'Falta el local', detail: 'Seleccioná un local.' });
      return;
    }

    const apk = this.apks().find((a) => a.id === apkId);
    const apkLabel = apk ? `${apk.nombre}${apk.versionName ? ' v' + apk.versionName : ''}` : 'el APK seleccionado';

    let destinoLabel: string;
    if (mode === 'uno') {
      destinoLabel = `el equipo ${androidId}`;
    } else if (mode === 'varios') {
      destinoLabel = `${androidIds.length} equipos seleccionados`;
    } else {
      const local = this.locales().find((l) => l.id === localId);
      const cantidad = this.devices().filter((d) => d.localAsignadoId === localId).length;
      destinoLabel = `los ${cantidad} equipos de "${local?.nombre ?? 'este local'}"`;
    }

    this.confirmationService.confirm({
      header: 'Confirmar instalación',
      message: `Se instalará "${apkLabel}" en ${destinoLabel}. ¿Continuar?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.crearOrden(),
    });
  }

  private crearOrden(): void {
    const { apkId, androidId, androidIds, localId } = this.form.getRawValue();
    const mode = this.destinoMode();

    const body: CrearOrdenDTO = { tipo: 'INSTALAR_APK', apkId };
    if (mode === 'uno') {
      body.androidId = androidId;
    } else if (mode === 'varios') {
      body.androidIds = androidIds;
    } else {
      body.localId = localId;
    }

    this.saving.set(true);
    this.rdenesService.crear3(body).subscribe({
      next: (response) => {
        this.saving.set(false);
        this.dialogVisible.set(false);
        const creadas: OrdenResponseDTO[] = Array.isArray(response) ? response : [response];
        this.ultimoLoteIds.set(creadas.map((o) => o.id));
        this.messageService.add({
          severity: 'success',
          summary: 'Órdenes creadas',
          detail: `Se crearon ${creadas.length} orden(es) de instalación.`,
        });
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo crear la orden',
          detail: 'Ocurrió un error al crear la orden. Intentá nuevamente.',
        });
      },
    });
  }

  protected parsePayload(orden: OrdenResponseDTO): OrdenPayload {
    const raw = orden.payload;
    if (raw == null) {
      return {};
    }
    if (typeof raw === 'object') {
      return raw as OrdenPayload;
    }
    try {
      return JSON.parse(String(raw)) as OrdenPayload;
    } catch {
      return {};
    }
  }

  protected apkLabelForOrden(orden: OrdenResponseDTO): string {
    const payload = this.parsePayload(orden);
    const apk = payload.apkId != null ? this.apks().find((a) => String(a.id) === String(payload.apkId)) : null;
    const nombre = apk?.nombre ?? payload.packageName ?? '—';
    const version = apk?.versionName ?? payload.versionName;
    return version ? `${nombre} (v${version})` : String(nombre);
  }

  protected estadoSeverity(estado: unknown): 'secondary' | 'info' | 'warn' | 'success' | 'danger' {
    switch (estado) {
      case 'ENVIADA':
        return 'info';
      case 'EN_PROGRESO':
        return 'warn';
      case 'COMPLETADA':
        return 'success';
      case 'FALLIDA':
        return 'danger';
      default:
        return 'secondary';
    }
  }

  protected shortId(id: unknown): string {
    const str = String(id ?? '');
    return str.length > 10 ? `${str.slice(0, 10)}…` : str;
  }

  private loadCatalogos(): void {
    forkJoin({
      apks: this.apksService.listar6(),
      locales: this.localesService.listar5(),
      devices: this.dispositivosService.listar7(),
    }).subscribe(({ apks, locales, devices }) => {
      this.apks.set((apks as ApkResponseDTO[]) ?? []);
      this.locales.set((locales as LocalResponseDTO[]) ?? []);
      this.devices.set((devices as DeviceResponseDTO[]) ?? []);
    });
  }

  private load(): void {
    this.loading.set(true);
    this.rdenesService.listar3(this.filtroAndroidId() ?? undefined, this.filtroEstado() ?? undefined).subscribe({
      next: (ordenes: OrdenResponseDTO[]) => {
        this.ordenes.set(sortByIdDesc(ordenes ?? []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
