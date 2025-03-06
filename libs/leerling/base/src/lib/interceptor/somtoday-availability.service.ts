import { inject, Injectable, OnDestroy } from '@angular/core';
import { ConnectionStatus, Network } from '@capacitor/network';
import { Store } from '@ngxs/store';
import { AuthenticationService } from 'leerling-authentication';
import { AddErrorMessage, AddInfoMessage, UpdateConnectionStatus } from 'leerling/store';
import { BehaviorSubject, combineLatest, map, pairwise, startWith, Subscription } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SomtodayAvailabilityService implements OnDestroy {
    private _authenticationService = inject(AuthenticationService);

    private _networkState: BehaviorSubject<ConnectionStatus> = new BehaviorSubject({ connected: true, connectionType: 'wifi' });
    private _networkStateSubscription: Subscription;

    private _store = inject(Store);

    public async registerAvailabilityHandler() {
        const _networkState = this._networkState;
        this._networkStateSubscription = combineLatest([_networkState.asObservable()])
            .pipe(
                map(([connectionStatus]) => {
                    return new UpdateConnectionStatus(connectionStatus.connected, connectionStatus.connectionType === 'cellular');
                }),
                startWith(new UpdateConnectionStatus(true, false)),
                pairwise()
            )
            .subscribe((actions: UpdateConnectionStatus[]) => {
                const current = actions[1];
                const previous = actions[0];
                this._store.dispatch(current);
                if (current.isOnline !== previous.isOnline) {
                    // Voor nu een action, later een UI component https://jira.topicus.nl/browse/SLL-467
                    this._store.dispatch(
                        current.isOnline
                            ? new AddInfoMessage('Je werkt nu weer online')
                            : new AddErrorMessage('Let op, Somtoday is niet te bereiken, je werkt offline. Functionaliteit is beperkt.')
                    );
                    this._authenticationService.retryDiscoveryDocument();
                }
            });
        Network.addListener('networkStatusChange', (status) => {
            _networkState.next(status);
        });
        const status = await Network.getStatus();
        _networkState.next(status);
    }

    ngOnDestroy() {
        this._networkState.complete();
        if (this._networkStateSubscription) this._networkStateSubscription.unsubscribe();
    }
}
