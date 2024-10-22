import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthorizationHeaderService } from 'iridium-authorization-header';
import { environment } from 'leerling-environment';
import { IGNORE_STATUS_CODES, SKIP_ERROR_MESSAGE_STATUS_CODES } from 'leerling-request';
import { InfoMessageService } from 'leerling-util';
import { EMPTY, catchError, map, of, switchMap } from 'rxjs';

const ANON_URLS = ['rest/v1/appinfo'].map((url) => url.replace(/\//g, '\\/').toLowerCase());

export const getAuthHeaderRequiredRegex = (): RegExp => {
    const escapedApiUrl = environment.apiUrl.replace(/\//g, '\\/').toLowerCase();
    return new RegExp(`^(?=.*${escapedApiUrl})(?!.*(${ANON_URLS.join('|')})).*$`);
};

export const authInterceptorFn: HttpInterceptorFn = (req, next) => {
    const authorizationHeaderService = inject(AuthorizationHeaderService);
    if (getAuthHeaderRequiredRegex().test(req.url.toLowerCase()) && authorizationHeaderService.isRefreshable()) {
        return authorizationHeaderService.getValidAuthorizationHeader().pipe(
            catchError(() => {
                // cancel request
                return EMPTY;
            }),
            map((authorizationHeader) => req.clone({ setHeaders: { Authorization: authorizationHeader } })),
            switchMap((req) => next(req))
        );
    } else {
        return next(req);
    }
};

export const errorInterceptorFn: HttpInterceptorFn = (request, next) => {
    const infoMessageService = inject(InfoMessageService);
    const idpDiscoveryPostFix = '/.well-known/openid-configuration';

    if (!request.url.includes(environment.apiUrl)) {
        return next(request);
    }
    return next(request).pipe(
        catchError((error: HttpErrorResponse) => {
            if (request.context.get(IGNORE_STATUS_CODES).includes(error.status)) {
                // Negeer het probleem en doe net of we niets terug hebben gekregen
                return of(new HttpResponse({ body: {}, status: error.status }));
            }

            const skipErrorMessageStatusCodes = request.context.get(SKIP_ERROR_MESSAGE_STATUS_CODES).includes(error.status);
            if (!request.url.endsWith(idpDiscoveryPostFix) && !skipErrorMessageStatusCodes) {
                infoMessageService.handleHttpError(error);
            }
            throw error;
        })
    );
};
