/* tslint:disable */
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RWaarneming } from '../../models/r-waarneming';

export interface WaarnemingenGet$Params {
  Range?: string;
}

export function waarnemingenGet(http: HttpClient, rootUrl: string, params?: WaarnemingenGet$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'items'?: Array<RWaarneming>;
}>> {
  const rb = new RequestBuilder(rootUrl, waarnemingenGet.PATH, 'get');
  if (params) {
    rb.header('Range', params.Range, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'items'?: Array<RWaarneming>;
      }>;
    })
  );
}

waarnemingenGet.PATH = '/waarnemingen';
