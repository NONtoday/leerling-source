import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { PollStatus, TransloaditParams } from '@shared/uploadfile/models';
import { SOMTODAY_API_CONFIG } from '@shared/utils/somtoday-api-token';
import { RTransloaditParams } from 'leerling-codegen';
import { catchError, delay, expand, map, Observable, of, reduce, takeUntil, takeWhile, throwError } from 'rxjs';

const TRANSLOADIT_URL = 'https://api2-eu-west-1.transloadit.com';
const ASSEMBLY_URL = `${TRANSLOADIT_URL}/assemblies`;
const MAX_POLL_COUNT = 60;
const ASSEMBLY_COMPLETED = 'ASSEMBLY_COMPLETED';
const ASSEMBLY_FAILED = 'ASSEMBLY_FAILED';

@Injectable({
    providedIn: 'root'
})
export class UploadService {
    private _httpClient = inject(HttpClient);
    private _somtodayApiConfig = inject(SOMTODAY_API_CONFIG);

    public getTransloaditParams(): Observable<TransloaditParams> {
        return this._httpClient.post<TransloaditParams>(`${this._somtodayApiConfig.apiUrl}/transloadit/startUploadContext`, undefined);
    }

    public uploadAssembly(file: File, params: RTransloaditParams, takeUntil$: Observable<void>): Observable<HttpEvent<unknown>> {
        if (!params.params || !params.signature) {
            throw new Error('params and signature are required');
        }

        const formData: FormData = new FormData();
        formData.append(file.name, file, file.name);
        formData.append('params', params.params);
        formData.append('signature', params.signature);
        const req = new HttpRequest('POST', ASSEMBLY_URL, formData, {
            reportProgress: true
        });
        return this._httpClient.request(req).pipe(takeUntil(takeUntil$));
    }

    public pollAssemblyStatus(assemblyId: string): Observable<PollStatus> {
        const statusUrl = `${ASSEMBLY_URL}/${assemblyId}`;
        let pollCount = 0;
        return of(PollStatus.PROCESSING).pipe(
            expand(() => {
                pollCount++;
                return this._httpClient.get<{ ok: string }>(statusUrl).pipe(
                    delay(2000),
                    catchError(() => {
                        return throwError(() => new Error('error'));
                    })
                );
            }),
            map((response) => response.ok),
            takeWhile((assemblyStatus) => assemblyStatus !== ASSEMBLY_COMPLETED && pollCount < MAX_POLL_COUNT, true),
            map((assemblyStatus) => {
                if (assemblyStatus === ASSEMBLY_COMPLETED) {
                    return PollStatus.DONE;
                } else if (assemblyStatus === ASSEMBLY_FAILED) {
                    return PollStatus.ERROR;
                }
                // Na max aantal keer pollen nog steeds aan het processen.
                return PollStatus.PROCESSING;
            }),
            reduce((acc, current) => current, PollStatus.PROCESSING),
            // Bij error tijdenss het pollen PROCESSING teruggeven. Er is alleen iets fout als we ASSEMBLY_FAILED terugkrijgen.
            catchError(() => of(PollStatus.PROCESSING))
        );
    }

    public validateFile(file: File): string | undefined {
        if ('exe'.includes(file.name.split('.').pop() ?? '')) {
            return 'Bestanden met de extensie .exe zijn niet toegestaan.';
        } else if (file.type.includes('image')) {
            if (file.size / 1e6 > 5) {
                return 'De maximale bestandsgrootte voor afbeeldingen is 5 MB.';
            }
        } else if (file.type.includes('video')) {
            if (file.size / 1e6 > 250) {
                return "De maximale bestandsgrootte voor video's is 250 MB.";
            }
        } else if (file.type.includes('audio')) {
            if (file.size / 1e6 > 50) {
                return 'De maximale bestandsgrootte voor audio is 50 MB.';
            }
        } else if (file.size / 1e6 > 150) {
            return 'De maximale bestandsgrootte is 150 MB.';
        }
        return undefined;
    }
}
