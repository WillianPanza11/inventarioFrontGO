import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpEventType, HttpParams } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { FileSelectEvent, FileUploadModule } from 'primeng/fileupload';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { APKsService, ApkRequestDTO, ApkResponseDTO, BASE_PATH } from '../../../generated-api';
import { FormatBytesPipe } from '../../../shared/format-bytes.pipe';
import { sortByIdDesc } from '../../../shared/sort-by-id-desc';

const URL_PATTERN = /^https?:\/\/\S+$/;

@Component({
  selector: 'app-apks-admin',
  imports: [
    ReactiveFormsModule,
    FormatBytesPipe,
    ButtonModule,
    ConfirmDialogModule,
    DialogModule,
    FileUploadModule,
    InputTextModule,
    ProgressBarModule,
    TableModule,
    TagModule,
    TooltipModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './apks-admin.html',
  styleUrl: './apks-admin.css',
})
export class ApksAdmin implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly apksService = inject(APKsService);
  private readonly http = inject(HttpClient);
  private readonly basePath = inject(BASE_PATH);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected readonly loading = signal(true);
  protected readonly apks = signal<ApkResponseDTO[]>([]);

  protected readonly uploadDialogVisible = signal(false);
  protected readonly uploading = signal(false);
  protected readonly uploadProgress = signal(0);
  protected readonly selectedFile = signal<File | null>(null);

  protected readonly uploadForm = this.fb.nonNullable.group({
    nombre: [''],
  });

  protected readonly externalDialogVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly editingId = signal<unknown>(null);

  protected readonly externalForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    packageName: ['', Validators.required],
    versionName: [''],
    versionCode: [''],
    urlDescarga: ['', [Validators.required, Validators.pattern(URL_PATTERN)]],
    checksum: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  // ---- Subir APK interno ----

  protected nuevoInterno(): void {
    this.selectedFile.set(null);
    this.uploadForm.reset({ nombre: '' });
    this.uploadProgress.set(0);
    this.uploadDialogVisible.set(true);
  }

  protected onFileSelected(event: FileSelectEvent): void {
    this.selectedFile.set(event.files[0] ?? null);
  }

  protected onFileRemoved(): void {
    this.selectedFile.set(null);
  }

  protected cancelarUpload(): void {
    this.uploadDialogVisible.set(false);
  }

  protected subirInterno(): void {
    const archivo = this.selectedFile();
    if (this.uploadForm.invalid || !archivo) {
      this.uploadForm.markAllAsTouched();
      if (!archivo) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Falta el archivo',
          detail: 'Seleccioná un archivo .apk para subir.',
        });
      }
      return;
    }

    const { nombre } = this.uploadForm.getRawValue();

    let params = new HttpParams();
    if (nombre) {
      params = params.set('nombre', nombre);
    }

    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);

    this.uploading.set(true);
    this.uploadProgress.set(0);

    this.http
      .post(`${this.basePath}/api/apks/upload`, formData, { params, reportProgress: true, observe: 'events' })
      .subscribe({
        next: (event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.uploadProgress.set(Math.round((event.loaded / event.total) * 100));
          } else if (event.type === HttpEventType.Response) {
            this.uploading.set(false);
            this.uploadDialogVisible.set(false);
            const apk = event.body as ApkResponseDTO | null;
            const detalle = apk?.packageName
              ? `Se detectó ${apk.packageName}${apk.versionName ? ' v' + apk.versionName : ''}.`
              : `Se subió "${archivo.name}".`;
            this.messageService.add({ severity: 'success', summary: 'APK subido', detail: detalle });
            this.load();
          }
        },
        error: () => {
          this.uploading.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'No se pudo subir',
            detail: 'Ocurrió un error al subir el APK. Verificá que sea un archivo .apk válido e intentá nuevamente.',
          });
        },
      });
  }

  // ---- Registrar externo / editar ----

  protected nuevoExterno(): void {
    this.editingId.set(null);
    this.externalForm.reset({
      nombre: '',
      packageName: '',
      versionName: '',
      versionCode: '',
      urlDescarga: '',
      checksum: '',
    });
    this.externalDialogVisible.set(true);
  }

  protected editar(apk: ApkResponseDTO): void {
    this.editingId.set(apk.id);
    this.externalForm.setValue({
      nombre: String(apk.nombre ?? ''),
      packageName: String(apk.packageName ?? ''),
      versionName: apk.versionName != null ? String(apk.versionName) : '',
      versionCode: apk.versionCode != null ? String(apk.versionCode) : '',
      urlDescarga: String(apk.urlDescarga ?? ''),
      checksum: apk.checksum != null ? String(apk.checksum) : '',
    });
    this.externalDialogVisible.set(true);
  }

  protected cancelarExterno(): void {
    this.externalDialogVisible.set(false);
  }

  protected guardarExterno(): void {
    if (this.externalForm.invalid) {
      this.externalForm.markAllAsTouched();
      return;
    }

    const raw = this.externalForm.getRawValue();
    const body: ApkRequestDTO = {
      nombre: raw.nombre,
      packageName: raw.packageName,
      versionName: raw.versionName || undefined,
      versionCode: raw.versionCode ? Number(raw.versionCode) : undefined,
      urlDescarga: raw.urlDescarga,
      checksum: raw.checksum || undefined,
    };
    const id = this.editingId();
    const request = id != null ? this.apksService.actualizar5(body, id) : this.apksService.crear6(body);

    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.externalDialogVisible.set(false);
        this.messageService.add({ severity: 'success', summary: 'Guardado', detail: `Se guardó "${raw.nombre}".` });
        this.load();
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `No se pudo guardar "${raw.nombre}".`,
        });
      },
    });
  }

  protected eliminar(apk: ApkResponseDTO): void {
    this.confirmationService.confirm({
      header: 'Confirmar desactivación',
      message: `¿Desactivar "${apk.nombre}"? Las órdenes ya creadas con este APK no se ven afectadas.`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.apksService.eliminar5(apk.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Desactivado',
              detail: `Se desactivó "${apk.nombre}".`,
            });
            this.load();
          },
          error: () =>
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo desactivar.' }),
        });
      },
    });
  }

  protected copiarChecksum(checksum: unknown): void {
    const text = String(checksum ?? '');
    if (!text) {
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      this.messageService.add({ severity: 'success', summary: 'Copiado', detail: 'Checksum copiado al portapapeles.' });
    });
  }

  protected shortChecksum(checksum: unknown): string {
    const text = String(checksum ?? '');
    if (!text) {
      return '—';
    }
    return text.length <= 16 ? text : `${text.slice(0, 8)}…${text.slice(-6)}`;
  }

  private load(): void {
    this.loading.set(true);
    this.apksService.listar6().subscribe({
      next: (apks: ApkResponseDTO[]) => {
        this.apks.set(sortByIdDesc(apks ?? []));
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
