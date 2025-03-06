/* tslint:disable */
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RVakkeuze } from '../../models/r-vakkeuze';

export interface VakkeuzesIdGet$Params {
  id: number;
}

export function vakkeuzesIdGet(http: HttpClient, rootUrl: string, params: VakkeuzesIdGet$Params, context?: HttpContext): Observable<StrictHttpResponse<RVakkeuze>> {
  const rb = new RequestBuilder(rootUrl, vakkeuzesIdGet.PATH, 'get');
  if (params) {
    rb.path('id', params.id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<RVakkeuze>;
    })
  );
}

vakkeuzesIdGet.PATH = '/vakkeuzes/{id}';
