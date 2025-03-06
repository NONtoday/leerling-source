/* tslint:disable */
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RswiGemaakt } from '../../models/rswi-gemaakt';

export interface SwigemaaktGet$Params {
  Range?: string;
}

export function swigemaaktGet(http: HttpClient, rootUrl: string, params?: SwigemaaktGet$Params, context?: HttpContext): Observable<StrictHttpResponse<{
'items'?: Array<RswiGemaakt>;
}>> {
  const rb = new RequestBuilder(rootUrl, swigemaaktGet.PATH, 'get');
  if (params) {
    rb.header('Range', params.Range, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      'items'?: Array<RswiGemaakt>;
      }>;
    })
  );
}

swigemaaktGet.PATH = '/swigemaakt';
