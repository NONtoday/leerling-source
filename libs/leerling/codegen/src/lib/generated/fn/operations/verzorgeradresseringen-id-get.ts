/* tslint:disable */
/* eslint-disable */
/* Code generated by ng-openapi-gen DO NOT EDIT. */

import { HttpClient, HttpContext, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { StrictHttpResponse } from '../../strict-http-response';
import { RequestBuilder } from '../../request-builder';

import { RVerzorgerAdressering } from '../../models/r-verzorger-adressering';

export interface VerzorgeradresseringenIdGet$Params {
  id: number;
}

export function verzorgeradresseringenIdGet(http: HttpClient, rootUrl: string, params: VerzorgeradresseringenIdGet$Params, context?: HttpContext): Observable<StrictHttpResponse<RVerzorgerAdressering>> {
  const rb = new RequestBuilder(rootUrl, verzorgeradresseringenIdGet.PATH, 'get');
  if (params) {
    rb.path('id', params.id, {});
  }

  return http.request(
    rb.build({ responseType: 'json', accept: 'application/json', context })
  ).pipe(
    filter((r: any): r is HttpResponse<any> => r instanceof HttpResponse),
    map((r: HttpResponse<any>) => {
      return r as StrictHttpResponse<RVerzorgerAdressering>;
    })
  );
}

verzorgeradresseringenIdGet.PATH = '/verzorgeradresseringen/{id}';
