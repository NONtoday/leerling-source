import { Observable, shareReplay } from 'rxjs';

export function shareReplayLastValue<T>(): (source: Observable<T>) => Observable<T> {
    return (source: Observable<T>): Observable<T> => source.pipe(shareReplay({ bufferSize: 1, refCount: true }));
}
