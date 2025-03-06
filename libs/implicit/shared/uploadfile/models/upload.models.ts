import { HttpEvent } from '@angular/common/http';
import { RTransloaditParams } from 'leerling-codegen';

export type UploadState = 'uploading' | 'processing' | 'error';

export interface UpdateEvent {
    event: HttpEvent<unknown>;
    uploadContextId: number;
}

export type TransloaditParams = RTransloaditParams;

export enum PollStatus {
    PROCESSING,
    DONE,
    ERROR
}

export interface Bijlage {
    uploadContextId?: number;
    extensie: string;
    omschrijving: string;
    url: string | undefined;
    toelichting?: string;
}
