/* tslint:disable */
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface GeldendvoortgangsdossierresultatenLeerlingLeerlingIdGet$Params {
  leerlingId: number;
  plaatsing?: string;
  Range?: string;
}

export function geldendvoortgangsdossierresultatenLeerlingLeerlingIdGet(http: HttpClient, rootUrl: string, params: GeldendvoortgangsdossierresultatenLeerlingLeerlingIdGet$Params, context?: HttpContext): Observable<StrictHttpResponse<{
[key: string]: any;
}>> {
  const rb = new RequestBuilder(rootUrl, geldendvoortgangsdossierresultatenLeerlingLeerlingIdGet.PATH, 'get');
  if (params) {
    rb.path('leerlingId', params.leerlingId, {});
    rb.query('plaatsing', params.plaatsing, {});
    rb.header('Range', params.Range, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<{
      [key: string]: any;
      }>;
    })
  );
}

geldendvoortgangsdossierresultatenLeerlingLeerlingIdGet.PATH = '/geldendvoortgangsdossierresultaten/leerling/{leerlingId}';
