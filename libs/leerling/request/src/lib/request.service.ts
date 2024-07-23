import {
    HttpClient,
    HttpContext,
    HttpContextToken,
    HttpEvent,
    HttpHeaders,
    HttpParams,
    HttpRequest,
    HttpResponse,
    HttpStatusCode
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { isPresent } from 'harmony';
import { Wrapper } from 'leerling-codegen';
import { isEmpty } from 'lodash-es';
import { Observable, filter, map } from 'rxjs';
import { RequestInformation } from './request-modals';

export const IGNORE_STATUS_CODES: HttpContextToken<HttpStatusCode[]> = new HttpContextToken(() => []);
export const SKIP_ERROR_MESSAGE_STATUS_CODES: HttpContextToken<HttpStatusCode[]> = new HttpContextToken(() => []);

export const DEFAULT_REQUEST_INFORMATION: RequestInformation = {
    responseType: 'json'
};

@Injectable({
    providedIn: 'root'
})
export class RequestService {
    private _httpClient = inject(HttpClient);

    public rootUrl = 'https://api.somtoday.nl/rest/v1';

    get<T>(urlPostfix: string, requestInfo: RequestInformation = DEFAULT_REQUEST_INFORMATION): Observable<T> {
        return this._addMapAndPresentCheck(this.getWithResponse(urlPostfix, requestInfo));
    }

    // Returns de items uit de linkable wrapper
    unwrappedGet<T>(urlPostfix: string, requestInfo: RequestInformation = DEFAULT_REQUEST_INFORMATION): Observable<T[]> {
        return this._addMapAndPresentCheck(this.getWithResponse(urlPostfix, requestInfo)).pipe(
            map((wrapper: Wrapper<T>) => wrapper?.items ?? [])
        );
    }

    getWithResponse<T>(urlPostfix: string, requestInfo: RequestInformation = DEFAULT_REQUEST_INFORMATION): Observable<HttpResponse<T>> {
        return this._request('GET', urlPostfix, requestInfo);
    }

    post<T>(urlPostfix: string, requestInfo: RequestInformation): Observable<T> {
        return this._addMapAndPresentCheck(this.postWithResponse(urlPostfix, requestInfo));
    }

    postWithResponse<T>(urlPostfix: string, requestInfo: RequestInformation): Observable<HttpResponse<T>> {
        return this._request('POST', urlPostfix, requestInfo);
    }

    put<T>(urlPostfix: string, requestInfo: RequestInformation = DEFAULT_REQUEST_INFORMATION): Observable<T> {
        return this._addMapAndPresentCheck(this.putWithResponse(urlPostfix, requestInfo));
    }

    putWithResponse<T>(urlPostfix: string, requestInfo: RequestInformation): Observable<HttpResponse<T>> {
        return this._request('PUT', urlPostfix, requestInfo);
    }

    deleteWithResponse<T>(urlPostfix: string, requestInfo: RequestInformation = DEFAULT_REQUEST_INFORMATION): Observable<HttpResponse<T>> {
        return this._request('DELETE', urlPostfix, requestInfo);
    }

    private _request<T>(method: string, urlPostfix: string, requestInfo: RequestInformation): Observable<HttpResponse<T>> {
        const url = this.rootUrl.endsWith('/') ? this.rootUrl : `${this.rootUrl}/`;
        const postFix = urlPostfix.startsWith('/') ? urlPostfix.substring(1) : urlPostfix;
        const httpRequest = new HttpRequest(method, url + postFix, requestInfo.body, {
            headers: this._getHeaders(requestInfo),
            params: this._getQueryParams(requestInfo),
            context: this._getHttpContext(requestInfo),
            responseType: requestInfo.responseType
        });
        return this._httpClient.request<T>(httpRequest).pipe(
            filter((event: HttpEvent<T>) => event instanceof HttpResponse),
            map((event: HttpResponse<T>) => event)
        );
    }

    private _getHttpContext(requestInfo: RequestInformation): HttpContext | undefined {
        const context = new HttpContext();
        if (requestInfo.ignoreStatusCodes) {
            context.set(IGNORE_STATUS_CODES, requestInfo.ignoreStatusCodes);
        }
        if (requestInfo.skipErrorMessageStatusCodes) {
            context.set(SKIP_ERROR_MESSAGE_STATUS_CODES, requestInfo.skipErrorMessageStatusCodes);
        }
        return [...context.keys()].length > 0 ? context : undefined;
    }

    private _getQueryParams(requestInfo: RequestInformation): HttpParams {
        let httpParams = new HttpParams();
        const queryParameters = requestInfo.queryParameters ?? {};
        Object.keys(queryParameters).forEach((key) => {
            const value = queryParameters[key];
            if (Array.isArray(value)) {
                value.filter(Boolean).forEach((arrayValue) => (httpParams = httpParams.append(key, arrayValue)));
            } else if (isPresent(value)) {
                httpParams = httpParams.append(key, value);
            }
        });
        return httpParams;
    }

    private _getHeaders(requestInfo: RequestInformation): HttpHeaders {
        let httpHeaders = new HttpHeaders();
        const headers = isEmpty(requestInfo.headers) ? this.getDefaultheaders() : requestInfo.headers;
        Object.keys(headers).forEach((key) => {
            const value = headers[key];
            if (value) {
                httpHeaders = httpHeaders.append(key, value);
            }
        });
        return httpHeaders;
    }

    public getDefaultheaders(): { [key: string]: string } {
        return {
            accept: 'application/vnd.topicus.platinum+json; charset=utf-8',
            'content-type': 'application/vnd.topicus.platinum+json; charset=utf-8'
        };
    }

    private _addMapAndPresentCheck<T>(observable: Observable<HttpResponse<T>>): Observable<T> {
        return observable.pipe(
            map((response: HttpResponse<T>) => {
                return response.body;
            }),
            filter(isPresent)
        );
    }
}
