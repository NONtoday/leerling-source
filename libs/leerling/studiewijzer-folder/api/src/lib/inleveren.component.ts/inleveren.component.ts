import { CommonModule } from '@angular/common';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    OnInit,
    output,
    signal,
    TemplateRef,
    viewChild,
    WritableSignal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Actions, ofActionCompleted } from '@ngxs/store';
import { UploadFileComponent } from '@shared/uploadfile/feature/upload-file';
import { Bijlage } from '@shared/uploadfile/models';
import { BijlageComponent } from '@shared/uploadfile/ui';
import {
    AutoFocusDirective,
    ButtonComponent,
    createModalSettings,
    DeviceService,
    ModalService as HarmonyModalService,
    ModalService
} from 'harmony';
import { IconDocument, IconKoppelen, IconToevoegen, IconUploaden, provideIcons } from 'harmony-icons';
import { InfoMessageService, InteractiveGuardComponent, windowOpen } from 'leerling-util';
import { AccepteerEula, InleveropdrachtListService, InleveropdrachtService, SInlevermoment } from 'leerling/store';
import mime from 'mime';
import { catchError, map, Observable, of, tap } from 'rxjs';

export type InleverenResult = 'Ingeleverd' | 'Annuleren';

export type Inlevering = Bijlage;

@Component({
    selector: 'sl-inleveren',
    imports: [CommonModule, ButtonComponent, BijlageComponent, UploadFileComponent, AutoFocusDirective, InteractiveGuardComponent],
    templateUrl: './inleveren.component.html',
    styleUrl: './inleveren.component.scss',
    providers: [provideIcons(IconToevoegen, IconKoppelen, IconDocument, IconUploaden)],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class InleverenComponent implements OnInit {
    private _deviceService = inject(DeviceService);
    private _modalService = inject(ModalService);
    private _inleveropdrachtService = inject(InleveropdrachtService);
    private _inleveropdrachtListService = inject(InleveropdrachtListService);
    private _harmonyModalService = inject(HarmonyModalService);
    private _actions$ = inject(Actions);
    private _destroyRef = inject(DestroyRef);
    private _infoMessageService = inject(InfoMessageService);

    public toekenningId = input.required<number>();
    public inlevermoment = input.required<SInlevermoment>();
    public turnitInEulaUrl = input.required<string | undefined>();

    public onResult = output<InleverenResult>();

    private _turnitInEulaModalComponentTemplate = viewChild.required('guard', { read: TemplateRef });
    private _urlToevoegen = viewChild.required('urlToevoegen', { read: TemplateRef });
    private _fileInput = viewChild.required('fileInput', { read: ElementRef });

    public inModal = computed(() => !this._deviceService.isTabletOrDesktopSignal());

    public inleveringen: WritableSignal<Inlevering[]> = signal([]);
    public inleveringFiles = new Map<File, Inlevering>();
    public uploadingFiles: WritableSignal<File[]> = signal([]);

    public uploading = computed(() => this.uploadingFiles().length > 0);
    public geenInleveringen = computed(() => !this.uploading() && this.inleveringen().length === 0);

    public isUrlToevoegen = signal(false);
    public ongeldigeUrl = signal(false);
    public isSaving = signal(false);
    public isGuardOpen = signal(false);
    public loading = signal(false);
    public isEulaAccepted = signal(false);
    public shouldCloseAfterConfirm = signal(false);
    public eulaFoutmelding: WritableSignal<string | undefined> = signal(undefined);

    ngOnInit() {
        this._actions$
            .pipe(
                ofActionCompleted(AccepteerEula),
                takeUntilDestroyed(this._destroyRef),
                map((ctx) => ctx.result)
            )
            .subscribe((result) => this.onEulaAccepterenReady(result?.successful ? undefined : 'Er is iets fout gegaan.'));
    }

    selecteerBestanden() {
        this._fileInput().nativeElement.click();
    }

    linkToevoegen() {
        if (this._deviceService.isPhoneOrTabletPortrait() && this._urlToevoegen()) {
            this._modalService.modal({
                template: this._urlToevoegen()
            });
        } else {
            this.isUrlToevoegen.set(true);
        }
    }

    verwijderInlevering(inlevering: Bijlage) {
        this.inleveringen.set(this.inleveringen().filter((element) => element !== inlevering));
    }

    bestandenGeselecteerd() {
        const newFilesToUpload: File[] = [];
        for (const file of this._fileInput().nativeElement.files) {
            const inlevering: Inlevering = {
                extensie: mime.getExtension(String(file.type)) ?? '-',
                omschrijving: file.name,
                url: URL.createObjectURL(file)
            };
            this.inleveringFiles.set(file, inlevering);
            newFilesToUpload.push(file);
        }

        this.uploadingFiles.set([...this.uploadingFiles(), ...newFilesToUpload]);
        this._fileInput().nativeElement.value = '';
    }

    validationError(file: File, error: string) {
        this._infoMessageService.dispatchErrorMessage(file.name + ' kan niet worden ingeleverd: ' + error);
        this.uploadCancelled(file);
    }

    uploadedFile(file: File, uploadContextId: number, processingCompleted: boolean) {
        const inlevering = this.inleveringFiles.get(file);
        this.inleveringFiles.delete(file);
        if (inlevering) {
            inlevering.uploadContextId = uploadContextId;
            if (!processingCompleted) {
                inlevering.toelichting = 'Inleveren mogelijk, de verwerking gaat op de achtergrond verder.';
                inlevering.url = undefined;
            }
            this.uploadingFiles.set(this.uploadingFiles().filter((element) => element !== file));
            this.inleveringen.set([...this.inleveringen(), inlevering]);
        }
    }

    uploadCancelled(file: File) {
        const inlevering = this.inleveringFiles.get(file);
        this.inleveringFiles.delete(file);
        if (inlevering) {
            this.uploadingFiles.set(this.uploadingFiles().filter((element) => element !== file));
        }
    }

    voegUrlToe(url: string) {
        const urlWithHttp = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
        if (this.isValidUrl(urlWithHttp)) {
            this.inleveringen.set([
                ...this.inleveringen(),
                {
                    extensie: 'url',
                    omschrijving: urlWithHttp,
                    url: urlWithHttp
                }
            ]);
            if (this.inModal()) this._modalService.animateAndClose();
            else this.isUrlToevoegen.set(false);
        } else {
            this.ongeldigeUrl.set(true);
        }
    }

    isValidUrl(url: string) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    sluitUrlToevoegen() {
        this.isUrlToevoegen.set(false);
        this.ongeldigeUrl.set(false);
    }

    onSubmit() {
        if (!this.turnitInEulaUrl()) {
            this.inleveren();
        } else {
            this.isGuardOpen.set(true);
            this._harmonyModalService.modal({
                template: this._turnitInEulaModalComponentTemplate(),
                settings: {
                    title: 'Accepteer de voorwaarden',
                    widthModal: '460px',
                    titleIcon: this._deviceService.isPhoneOrTabletPortrait() ? undefined : 'waarschuwing',
                    titleIconColor: 'fg-negative-normal'
                }
            });
        }
    }

    accepteerEULA() {
        this.setLoading(true);
        this._inleveropdrachtService.acceptLatestTurnitInEula();
    }

    private onEulaAccepterenReady(foutmelding?: string) {
        this.setLoading(false);
        this.eulaFoutmelding.set(foutmelding);

        if (!foutmelding) {
            this.isEulaAccepted.set(true);
            this.isGuardOpen.set(false);
            this.shouldCloseAfterConfirm.set(true);
            this.inleveren();
        }
    }

    setLoading(loading: boolean) {
        this.loading.set(loading);
        this._modalService.setClosingBlocked(loading);
        this._harmonyModalService.setClosingBlocked(loading);
    }

    resetFoutmelding() {
        if (!this.isEulaAccepted()) {
            this._infoMessageService.dispatchErrorMessage('Om in te kunnen leveren dien je akkoord te gaan met de EULA van Turnitin.');
        }
        this.eulaFoutmelding.set(undefined);
        this._harmonyModalService.animateAndClose();
    }

    inleveren() {
        if (this.isSaving()) return;

        this.isSaving.set(true);
        const uploadContextIds: number[] = [];
        const urls: string[] = [];

        this.inleveringen().forEach((inlevering) => {
            if (inlevering.uploadContextId) {
                uploadContextIds.push(inlevering.uploadContextId);
            } else if (inlevering.url) {
                urls.push(inlevering.url);
            }
        });

        this._inleveropdrachtService
            .inleveren(this.toekenningId(), this.inlevermoment().start, uploadContextIds, urls)
            .pipe(
                catchError(() => {
                    this.isSaving.set(false);
                    this._infoMessageService.dispatchErrorMessage('Inleveren is niet gelukt. Probeer het opnieuw.');
                    return of();
                })
            )
            .subscribe(() => {
                this.isSaving.set(false);
                this._infoMessageService.dispatchSuccessMessage('Inlevering succesvol');
                this._inleveropdrachtListService.refreshInleverOpdrachten();
                this.onResult.emit('Ingeleverd');
            });
    }

    public canDeactivate(): Observable<boolean> {
        if (this.geenInleveringen()) {
            return of(true);
        }
        return this._modalService
            .confirmModal(
                {
                    text: 'Je hebt een bestand gekozen, maar deze nog niet ingeleverd.',
                    annulerenButtonText: 'Stoppen ',
                    bevestigenButtonText: 'Verder met inlevering',
                    bevestigenButtonMode: 'primary',
                    bevestigenButtonIcon: undefined
                },
                createModalSettings({
                    title: 'Je opdracht is nog niet ingeleverd',
                    widthModal: '460px'
                })
            )
            .confirmResult.pipe(
                map((result) => result === 'Negative'),
                tap((confirmed) => {
                    if (confirmed) this.reset();
                })
            );
    }

    private reset() {
        this.inleveringen.set([]);
        this.inleveringFiles.clear();
        this.uploadingFiles.set([]);
        this.isUrlToevoegen.set(false);
    }

    public openUrl(url: string | undefined) {
        if (url) windowOpen(url);
    }
}
