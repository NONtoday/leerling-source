/* tslint:disable */
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RswiAfspraakToekenning } from '../../models/rswi-afspraak-toekenning';

export interface StudiewijzeritemafspraaktoekenningenGet$Params {
  Range?: string;
}

export function studiewijzeritemafspraaktoekenningenGet(http: HttpClient, rootUrl: string, params?: StudiewijzeritemafspraaktoekenningenGet$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'items'?: Array<RswiAfspraakToekenning>;
}>> {
  const rb = new RequestBuilder(rootUrl, studiewijzeritemafspraaktoekenningenGet.PATH, 'get');
  if (params) {
    rb.header('Range', params.Range, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'items'?: Array<RswiAfspraakToekenning>;
      }>;
    })
  );
}

studiewijzeritemafspraaktoekenningenGet.PATH = '/studiewijzeritemafspraaktoekenningen';
