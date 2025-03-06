import { CommonModule } from '@angular/common';
import { HttpEvent, HttpEventType } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnDestroy, OnInit, output, signal } from '@angular/core';
import { UploadService } from '@shared/uploadfile/data-access';
import { PollStatus, TransloaditParams, UpdateEvent, UploadState } from '@shared/uploadfile/models';
import { IconDirective, isPresent, SpinnerComponent } from 'harmony';
import { IconVerversen, IconVerwijderen, IconWaarschuwing, provideIcons } from 'harmony-icons';
import { filter, map, Observable, Subject, switchMap, takeUntil, tap } from 'rxjs';

@Component({
    selector: 'shared-upload-file',
    imports: [CommonModule, SpinnerComponent, IconDirective],
    templateUrl: './upload-file.component.html',
    styleUrl: './upload-file.component.scss',
    providers: [provideIcons(IconVerwijderen, IconVerversen, IconWaarschuwing)],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class.with-border-bottom]': 'toonBorderBottom()'
    }
})
export class UploadFileComponent implements OnInit, OnDestroy {
    private _uploadService = inject(UploadService);

    public file = input.required<File>();
    public toonBorderBottom = input(true);

    public stillProcessing = output<number>();
    public doneUploading = output<number>();
    public cancelled = output();
    public validationError = output<string>();

    public progress = signal('0%');
    public progressAriaLabel = computed(() => `Bezig met uploaded: ${this.progress()}`);
    public state = signal<UploadState>('uploading');

    private _cancelRequestSubject = new Subject<void>();

    ngOnInit(): void {
        const validationError = this._uploadService.validateFile(this.file());
        if (validationError) {
            this.validationError.emit(validationError);
        } else {
            this.uploadFile();
        }
    }

    private uploadFile() {
        this._uploadService
            .getTransloaditParams()
            .pipe(
                switchMap((params) => this.uploadAssembly(params)),
                tap((updateEvent) => this.updateProgress(updateEvent.event)),
                filter((updateEvent) => updateEvent.event.type === HttpEventType.Response),
                takeUntil(this._cancelRequestSubject)
            )
            .subscribe((updateEvent) => {
                if ((updateEvent.event as any).status === 200) {
                    this.state.set('processing');
                    this.pollStatus((updateEvent.event as any).body['assembly_id'], updateEvent.uploadContextId);
                } else {
                    this.state.set('error');
                }
            });
    }

    private uploadAssembly(params: TransloaditParams): Observable<UpdateEvent> {
        const uploadContextId = params.uploadContextId;
        if (!isPresent(uploadContextId)) {
            throw new Error('uploadContextId is required');
        }

        return this._uploadService
            .uploadAssembly(this.file(), params, this._cancelRequestSubject)
            .pipe(map((event): UpdateEvent => ({ event, uploadContextId })));
    }

    private updateProgress(event: HttpEvent<unknown>) {
        if (event.type === HttpEventType.UploadProgress && event.total) {
            const percentDone = Math.round((100 * event.loaded) / event.total);
            this.progress.set(`${percentDone}%`);
        }
    }

    private pollStatus(assemblyId: string, uploadContextId: number) {
        this._uploadService.pollAssemblyStatus(assemblyId).subscribe((status) => {
            switch (status) {
                case PollStatus.DONE:
                    this.doneUploading.emit(uploadContextId);
                    break;
                case PollStatus.ERROR:
                    this.state.set('error');
                    break;
                case PollStatus.PROCESSING:
                    this.stillProcessing.emit(uploadContextId);
                    break;
            }
        });
    }

    ngOnDestroy(): void {
        this._cancelRequestSubject.next();
    }

    public retry() {
        this.state.set('uploading');
        this.uploadFile();
    }

    public cancel() {
        this._cancelRequestSubject.next();
        this.cancelled.emit();
    }
}
