/* tslint:disable */
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';


export interface GeldendexamendossierresultatenVakresultatenLeerlingIdVakVakUuidLichtingLichtingUuidGet$Params {
  leerlingId: number;
  vakUuid: string;
  lichtingUuid: string;
  plaatsingUuid?: string;
  Range?: string;
}

export function geldendexamendossierresultatenVakresultatenLeerlingIdVakVakUuidLichtingLichtingUuidGet(http: HttpClient, rootUrl: string, params: GeldendexamendossierresultatenVakresultatenLeerlingIdVakVakUuidLichtingLichtingUuidGet$Params, context?: HttpContext): Observable<StrictHttpResponse<{
[key: string]: any;
}>> {
  const rb = new RequestBuilder(rootUrl, geldendexamendossierresultatenVakresultatenLeerlingIdVakVakUuidLichtingLichtingUuidGet.PATH, 'get');
  if (params) {
    rb.path('leerlingId', params.leerlingId, {});
    rb.path('vakUuid', params.vakUuid, {});
    rb.path('lichtingUuid', params.lichtingUuid, {});
    rb.query('plaatsingUuid', params.plaatsingUuid, {});
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

geldendexamendossierresultatenVakresultatenLeerlingIdVakVakUuidLichtingLichtingUuidGet.PATH = '/geldendexamendossierresultaten/vakresultaten/{leerlingId}/vak/{vakUuid}/lichting/{lichtingUuid}';
